import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { isOptionsRequest } from "../../_shared/http/request.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";
import { constructStripeWebhookEvent } from "../../_shared/payments/stripe.ts";

type SupabaseAdmin = ReturnType<typeof createServiceClient>;
type JsonObject = Record<string, unknown>;

type PaymentAssociation = {
    id: string;
    emergency_request_id: string | null;
    metadata: JsonObject | null;
    payment_method: string | null;
    status: string | null;
    ivisit_fee_amount: number | string | null;
};

const asJsonObject = (value: unknown): JsonObject =>
    value && typeof value === "object" && !Array.isArray(value)
        ? value as JsonObject
        : {};

const errorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error || "Unknown error");
    }
};

const loadPaymentAssociation = async (
    supabaseAdmin: SupabaseAdmin,
    paymentIntentId: string,
): Promise<PaymentAssociation> => {
    const { data: payment, error } = await supabaseAdmin
        .from("payments")
        .select(
            "id, emergency_request_id, metadata, payment_method, status, ivisit_fee_amount",
        )
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

    if (error) {
        throw new Error(`Could not load payment association: ${errorMessage(error)}`);
    }
    if (!payment) {
        throw new Error(`Payment association not found for ${paymentIntentId}`);
    }

    return payment;
};

const assertRpcSuccess = (
    rpcName: string,
    result: unknown,
    error: unknown,
): JsonObject => {
    const rpcResult = asJsonObject(result);
    if (error || rpcResult.success !== true) {
        throw new Error(
            `${rpcName} failed: ${errorMessage(error || rpcResult.error || rpcResult)}`,
        );
    }

    return rpcResult;
};

type StripeEventClaimBase = {
    eventId: string;
    disposition: string;
    attempts: number;
};

type StripeEventClaim = StripeEventClaimBase & (
    | { shouldProcess: true; claimToken: string }
    | { shouldProcess: false; claimToken: null }
);

type OwnedStripeEventClaim = StripeEventClaimBase & {
    shouldProcess: true;
    claimToken: string;
};

const claimStripeWebhookEvent = async (
    supabaseAdmin: SupabaseAdmin,
    event: Stripe.Event,
): Promise<StripeEventClaim> => {
    const { data, error } = await supabaseAdmin.rpc("claim_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_event_type: event.type,
        p_stripe_account_id: event.account ?? null,
    });
    const result = assertRpcSuccess("claim_stripe_webhook_event", data, error);
    const shouldProcess = result.should_process === true;
    const claimToken = typeof result.claim_token === "string"
        ? result.claim_token
        : null;

    if (shouldProcess && !claimToken) {
        throw new Error("claim_stripe_webhook_event returned no claim token");
    }

    const claimBase = {
        eventId: event.id,
        disposition: typeof result.disposition === "string"
            ? result.disposition
            : "unknown",
        attempts: Number(result.attempts || 0),
    };

    return shouldProcess
        ? { ...claimBase, shouldProcess: true, claimToken: claimToken as string }
        : { ...claimBase, shouldProcess: false, claimToken: null };
};

const completeStripeWebhookEvent = async (
    supabaseAdmin: SupabaseAdmin,
    claim: OwnedStripeEventClaim,
) => {
    const { data, error } = await supabaseAdmin.rpc("complete_stripe_webhook_event", {
        p_stripe_event_id: claim.eventId,
        p_claim_token: claim.claimToken,
    });
    assertRpcSuccess("complete_stripe_webhook_event", data, error);
};

const failStripeWebhookEvent = async (
    supabaseAdmin: SupabaseAdmin,
    claim: OwnedStripeEventClaim,
    message: string,
) => {
    const { data, error } = await supabaseAdmin.rpc("fail_stripe_webhook_event", {
        p_stripe_event_id: claim.eventId,
        p_claim_token: claim.claimToken,
        p_last_error: message,
    });
    assertRpcSuccess("fail_stripe_webhook_event", data, error);
};

// PULLBACK NOTE: Emergency Stripe webhook delivery hardening.
// OLD: Stripe metadata selected emergency finalization and RPC failures returned 200.
// NEW: The database association routes finalization, and a signed event owns a
// durable receipt before effects run. Failed effects return 500 for Stripe retry.
serve(async (req) => {
    if (isOptionsRequest(req)) {
        return optionsResponse();
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return new Response("Missing stripe-signature", { status: 400 });
    }

    let supabaseAdmin: SupabaseAdmin | null = null;
    let claimedEvent: OwnedStripeEventClaim | null = null;

    try {
        const body = await req.text();
        let event: Stripe.Event;
        try {
            event = await constructStripeWebhookEvent(body, signature);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown webhook error";
            console.error(`Webhook signature verification failed: ${message}`);
            return new Response(`Webhook Error: ${message}`, { status: 400 });
        }

        const serviceClient = createServiceClient();
        supabaseAdmin = serviceClient;
        const claim = await claimStripeWebhookEvent(serviceClient, event);

        console.log(`Received Stripe event ${event.id}: ${event.type}`);
        if (!claim.shouldProcess) {
            if (claim.disposition === "completed") {
                return jsonResponse(
                    {
                        received: true,
                        duplicate: true,
                        disposition: claim.disposition,
                        attempts: claim.attempts,
                    },
                    { status: 200 },
                );
            }

            return jsonResponse(
                {
                    received: false,
                    processing: true,
                    disposition: claim.disposition,
                    attempts: claim.attempts,
                },
                { status: 503 },
            );
        }

        claimedEvent = claim;

        switch (event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

                const existingPayment = await loadPaymentAssociation(
                    serviceClient,
                    paymentIntent.id,
                );
                const existingMetadata = asJsonObject(existingPayment.metadata);
                const isEmergencyPayment = Boolean(existingPayment.emergency_request_id);
                const isTopUp = !isEmergencyPayment &&
                    (existingMetadata.payment_kind === "top_up" ||
                        existingMetadata.is_top_up === true);
                const feeAmount = Number(
                    (
                        (paymentIntent.application_fee_amount ?? 0) / 100 ||
                        Number(existingPayment?.ivisit_fee_amount || existingMetadata?.fee_amount || 0)
                    ).toFixed(2),
                );
                const paymentMetadata = {
                    ...existingMetadata,
                    source: "stripe-webhook",
                    payment_kind: isTopUp
                        ? "top_up"
                        : existingMetadata?.payment_kind || "service",
                    is_top_up: isTopUp || Boolean(existingMetadata?.is_top_up),
                    fee_amount: feeAmount,
                    fee: feeAmount,
                };

                if (!isEmergencyPayment) {
                    const { data: updatedPayment, error: updateError } = await serviceClient
                        .from("payments")
                        .update({
                            status: "completed",
                            processed_at: new Date().toISOString(),
                            payment_method: existingPayment?.payment_method || "card",
                            ivisit_fee_amount: feeAmount,
                            metadata: paymentMetadata,
                            provider_response: paymentIntent,
                        })
                        .eq("id", existingPayment.id)
                        .eq("stripe_payment_intent_id", paymentIntent.id)
                        .select("id")
                        .maybeSingle();

                    if (updateError || !updatedPayment) {
                        throw new Error(
                            `Could not complete associated payment: ${errorMessage(updateError)}`,
                        );
                    }
                } else {
                    const { data: finalizeResult, error: finalizeError } = await serviceClient.rpc(
                        "complete_card_payment",
                        {
                            p_payment_intent_id: paymentIntent.id,
                            p_provider_response: paymentIntent,
                            p_fee_amount: feeAmount,
                        },
                    );

                    assertRpcSuccess(
                        "complete_card_payment",
                        finalizeResult,
                        finalizeError,
                    );
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log(`PaymentIntent failed: ${paymentIntent.id}`);

                const existingPayment = await loadPaymentAssociation(
                    serviceClient,
                    paymentIntent.id,
                );
                if (existingPayment.status === "completed") {
                    console.log(
                        `Ignoring stale failure for completed payment ${existingPayment.id}`,
                    );
                    break;
                }

                const isEmergencyPayment = Boolean(existingPayment.emergency_request_id);
                if (!isEmergencyPayment) {
                    const { data: updatedPayment, error: updateError } = await serviceClient
                        .from("payments")
                        .update({
                            status: "failed",
                            processed_at: new Date().toISOString(),
                            provider_response: paymentIntent,
                        })
                        .eq("id", existingPayment.id)
                        .eq("stripe_payment_intent_id", paymentIntent.id)
                        .select("id")
                        .maybeSingle();

                    if (updateError || !updatedPayment) {
                        throw new Error(
                            `Could not fail associated payment: ${errorMessage(updateError)}`,
                        );
                    }
                } else {
                    const failureMessage =
                        paymentIntent.last_payment_error?.message ||
                        paymentIntent.last_payment_error?.code ||
                        "card_payment_failed";

                    const { data: failResult, error: failError } = await serviceClient.rpc(
                        "fail_card_payment",
                        {
                            p_payment_intent_id: paymentIntent.id,
                            p_provider_response: paymentIntent,
                            p_failure_reason: failureMessage,
                        },
                    );

                    assertRpcSuccess("fail_card_payment", failResult, failError);
                }
                break;
            }

            case "account.updated": {
                const account = event.data.object as Stripe.Account;
                console.log(`Account updated: ${account.id}`);

                const { data: updatedOrganizations, error: orgError } = await serviceClient
                    .from("organizations")
                    .update({
                        is_active: account.details_submitted && account.payouts_enabled,
                    })
                    .eq("stripe_account_id", account.id)
                    .select("id");

                if (orgError || !updatedOrganizations?.length) {
                    throw new Error(
                        `Could not sync Stripe organization status: ${errorMessage(
                            orgError || "organization association not found",
                        )}`,
                    );
                }
                break;
            }

            case "payout.paid": {
                const payout = event.data.object as Stripe.Payout;
                console.log(`Payout completed: ${payout.id}`);

                const { data: payoutResult, error: payoutError } = await serviceClient.rpc(
                    "apply_stripe_payout_paid",
                    {
                        p_payout_id: payout.id,
                        p_stripe_account_id: event.account ?? null,
                        p_amount: payout.amount / 100,
                        p_provider_response: payout,
                    },
                );
                assertRpcSuccess(
                    "apply_stripe_payout_paid",
                    payoutResult,
                    payoutError,
                );
                break;
            }

            case "payout.failed": {
                const payout = event.data.object as Stripe.Payout;
                console.error(`Payout failed: ${payout.id}`);
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        if (!claimedEvent) {
            throw new Error("Stripe event processing completed without an owned receipt");
        }
        await completeStripeWebhookEvent(serviceClient, claimedEvent);

        return jsonResponse(
            {
                received: true,
                disposition: claimedEvent.disposition,
                attempts: claimedEvent.attempts,
            },
            { status: 200 },
        );
    } catch (error) {
        const message = errorMessage(error);
        if (supabaseAdmin && claimedEvent) {
            try {
                await failStripeWebhookEvent(supabaseAdmin, claimedEvent, message);
            } catch (receiptError) {
                console.error(
                    "Could not mark Stripe event receipt failed:",
                    errorMessage(receiptError),
                );
            }
        }
        console.error("Webhook Error:", message);
        return jsonResponse({ error: message }, { status: 500 });
    }
});
