import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { maybeResolveDisplayId } from "../../_shared/domain/ids.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { isOptionsRequest } from "../../_shared/http/request.ts";
import { requireAuthenticatedUser } from "../../_shared/supabase/auth.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";
import { createStripeClient } from "../../_shared/payments/stripe.ts";
import { ensurePatientCustomerId } from "../../_shared/payments/customers.ts";

serve(async (req) => {
    if (isOptionsRequest(req)) {
        return optionsResponse();
    }

    try {
        const { user } = await requireAuthenticatedUser(req);

        const {
            amount,
            currency = "usd",
            organization_id,
            emergency_request_id,
            is_top_up,
            payment_method_id,
            stripe_payment_method_id,
        } = await req.json();

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw new Error("Missing or invalid required field: amount");
        }

        const supabaseAdmin = createServiceClient();
        const stripe = createStripeClient();

        const isTopUp = Boolean(is_top_up);
        const resolvedRequestId = emergency_request_id
            ? await maybeResolveDisplayId(supabaseAdmin, String(emergency_request_id))
            : null;
        let existingEmergencyPayment:
            | {
                    id: string;
                    stripe_payment_intent_id?: string | null;
                    status?: string | null;
                    ivisit_fee_amount?: number | null;
                    metadata?: Record<string, unknown> | null;
              }
            | null = null;

        if (resolvedRequestId) {
            const { data: requestRow, error: requestError } = await supabaseAdmin
                .from("emergency_requests")
                .select("id, user_id, hospital_id")
                .eq("id", resolvedRequestId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (requestError || !requestRow) {
                throw new Error("Emergency request not found for current user");
            }

            const { data: pendingEmergencyPayment, error: pendingEmergencyPaymentError } =
                await supabaseAdmin
                    .from("payments")
                    .select(
                        "id, status, stripe_payment_intent_id, ivisit_fee_amount, metadata",
                    )
                    .eq("emergency_request_id", resolvedRequestId)
                    .eq("payment_method", "card")
                    .eq("status", "pending")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

            if (pendingEmergencyPaymentError) {
                console.error(
                    "Error locating pending emergency payment row:",
                    pendingEmergencyPaymentError,
                );
            } else {
                existingEmergencyPayment = pendingEmergencyPayment;
            }
        }

        const customerId = await ensurePatientCustomerId({
            supabaseAdmin,
            stripe,
            userId: user.id,
            userEmail: user.email,
        });

        let resolvedOrgId = organization_id
            ? await maybeResolveDisplayId(supabaseAdmin, String(organization_id))
            : null;
        let stripeAccountId: string | null = null;
        let feePercentage = 2.5;

        if (!isTopUp) {
            if (!resolvedOrgId && resolvedRequestId) {
                const { data: requestOrg, error: requestOrgError } = await supabaseAdmin
                    .from("emergency_requests")
                    .select("hospital_id, hospitals!left(organization_id)")
                    .eq("id", resolvedRequestId)
                    .maybeSingle();

                if (requestOrgError) {
                    throw new Error(`Could not resolve organization for request: ${requestOrgError.message}`);
                }

                resolvedOrgId =
                    (requestOrg?.hospitals as { organization_id?: string | null } | null)?.organization_id ||
                    null;
            }

            if (!resolvedOrgId) {
                throw new Error("Missing valid organization context for payment intent");
            }

            const { data: organization, error: orgError } = await supabaseAdmin
                .from("organizations")
                .select("id, stripe_account_id, ivisit_fee_percentage")
                .eq("id", resolvedOrgId)
                .single();

            if (orgError || !organization) {
                throw new Error(`Organization not found (${resolvedOrgId})`);
            }

            stripeAccountId = organization.stripe_account_id;
            feePercentage = Number(organization.ivisit_fee_percentage ?? 2.5);
        }

        const amountInCents = Math.round(numericAmount * 100);
        const paymentCurrency = String(currency || "usd").toLowerCase();
        const existingEmergencyMetadata =
            existingEmergencyPayment?.metadata &&
            typeof existingEmergencyPayment.metadata === "object" &&
            !Array.isArray(existingEmergencyPayment.metadata)
                ? existingEmergencyPayment.metadata
                : {};
        const explicitEmergencyFeeAmount =
            resolvedRequestId && !isTopUp
                ? Number(
                        (
                            Number(existingEmergencyPayment?.ivisit_fee_amount ?? 0) ||
                            Number(existingEmergencyMetadata?.fee_amount ?? 0) ||
                            Number(existingEmergencyMetadata?.fee ?? 0) ||
                            0
                        ).toFixed(2),
                  )
                : 0;
        const applicationFeeInCents =
            !isTopUp && stripeAccountId
                ? Math.round(
                        (
                            explicitEmergencyFeeAmount > 0
                                ? explicitEmergencyFeeAmount * 100
                                : (amountInCents * feePercentage) / 100
                        ),
                  )
                : 0;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: paymentCurrency,
            customer: customerId,
            automatic_payment_methods: { enabled: true },
            ...(applicationFeeInCents > 0
                ? {
                        application_fee_amount: applicationFeeInCents,
                        transfer_data: { destination: stripeAccountId! },
                  }
                : {}),
            metadata: {
                user_id: user.id,
                organization_id: resolvedOrgId || "platform",
                emergency_request_id: resolvedRequestId ?? "",
                is_top_up: isTopUp ? "true" : "false",
                payment_method_id: payment_method_id ?? "",
                stripe_payment_method_id: stripe_payment_method_id ?? "",
            },
        });

        const feeAmount = Number((applicationFeeInCents / 100).toFixed(2));
        const paymentMetadata = {
            source: "create-payment-intent",
            payment_kind: isTopUp ? "top_up" : "service",
            is_top_up: isTopUp,
            fee_amount: feeAmount,
            fee: feeAmount,
            payment_method_id: payment_method_id ?? null,
            stripe_payment_method_id: stripe_payment_method_id ?? null,
        };

        if (resolvedRequestId && !isTopUp) {
            if (
                existingEmergencyPayment?.id &&
                !existingEmergencyPayment?.stripe_payment_intent_id
            ) {
                const existingMetadata =
                    existingEmergencyPayment.metadata &&
                    typeof existingEmergencyPayment.metadata === "object" &&
                    !Array.isArray(existingEmergencyPayment.metadata)
                        ? existingEmergencyPayment.metadata
                        : {};

                const { error: updateError } = await supabaseAdmin
                    .from("payments")
                    .update({
                        organization_id: resolvedOrgId,
                        amount: numericAmount,
                        currency: paymentCurrency.toUpperCase(),
                        stripe_payment_intent_id: paymentIntent.id,
                        ivisit_fee_amount: feeAmount,
                        metadata: {
                            ...existingMetadata,
                            ...paymentMetadata,
                        },
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingEmergencyPayment.id);

                if (updateError) {
                    console.error("Error binding payment intent to pending emergency payment:", updateError);
                }
            } else {
                const { error: insertError } = await supabaseAdmin.from("payments").insert({
                    user_id: user.id,
                    organization_id: resolvedOrgId,
                    emergency_request_id: resolvedRequestId,
                    amount: numericAmount,
                    currency: paymentCurrency.toUpperCase(),
                    payment_method: "card",
                    status: "pending",
                    stripe_payment_intent_id: paymentIntent.id,
                    ivisit_fee_amount: feeAmount,
                    metadata: paymentMetadata,
                });

                if (insertError) {
                    console.error("Error creating emergency payment record:", insertError);
                }
            }

            const { error: requestUpdateError } = await supabaseAdmin
                .from("emergency_requests")
                .update({
                    total_cost: numericAmount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", resolvedRequestId);

            if (requestUpdateError) {
                console.error(
                    "Error syncing emergency request total for card checkout:",
                    requestUpdateError,
                );
            }
        } else {
            const { error: paymentRecordError } = await supabaseAdmin.from("payments").insert({
                user_id: user.id,
                organization_id: resolvedOrgId,
                emergency_request_id: resolvedRequestId,
                amount: numericAmount,
                currency: paymentCurrency.toUpperCase(),
                payment_method: "card",
                status: "pending",
                stripe_payment_intent_id: paymentIntent.id,
                ivisit_fee_amount: feeAmount,
                metadata: paymentMetadata,
            });

            if (paymentRecordError) {
                console.error("Error creating payment record:", paymentRecordError);
            }
        }

        return jsonResponse(
            {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId,
            },
            { status: 200 },
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Edge Function Error:", message);
        return jsonResponse({ error: message }, { status: 400 });
    }
});
