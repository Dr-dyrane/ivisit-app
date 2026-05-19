import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { isOptionsRequest } from "../../_shared/http/request.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";
import { constructStripeWebhookEvent } from "../../_shared/payments/stripe.ts";

serve(async (req) => {
    if (isOptionsRequest(req)) {
        return optionsResponse();
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return new Response("Missing stripe-signature", { status: 400 });
    }

    try {
        const body = await req.text();
        let event;
        try {
            event = await constructStripeWebhookEvent(body, signature);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown webhook error";
            console.error(`Webhook signature verification failed: ${message}`);
            return new Response(`Webhook Error: ${message}`, { status: 400 });
        }

        const supabaseAdmin = createServiceClient();

        console.log(`Received Stripe event: ${event.type}`);

        switch (event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

                const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
                    .from("payments")
                    .select("id,metadata,payment_method,ivisit_fee_amount")
                    .eq("stripe_payment_intent_id", paymentIntent.id)
                    .maybeSingle();

                if (existingPaymentError) {
                    console.error("Error loading existing payment row:", existingPaymentError);
                }

                const existingMetadata =
                    existingPayment?.metadata &&
                    typeof existingPayment.metadata === "object" &&
                    !Array.isArray(existingPayment.metadata)
                        ? existingPayment.metadata
                        : {};
                const isTopUp = paymentIntent.metadata?.is_top_up === "true";
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

                if (isTopUp || !paymentIntent.metadata?.emergency_request_id) {
                    const { error: updateError } = await supabaseAdmin
                        .from("payments")
                        .update({
                            status: "completed",
                            processed_at: new Date().toISOString(),
                            payment_method: existingPayment?.payment_method || "card",
                            ivisit_fee_amount: feeAmount,
                            metadata: paymentMetadata,
                            provider_response: paymentIntent,
                        })
                        .eq("stripe_payment_intent_id", paymentIntent.id);

                    if (updateError) {
                        console.error("Error updating payment status:", updateError);
                    }
                } else {
                    const { data: finalizeResult, error: finalizeError } = await supabaseAdmin.rpc(
                        "complete_card_payment",
                        {
                            p_payment_intent_id: paymentIntent.id,
                            p_provider_response: paymentIntent,
                            p_fee_amount: feeAmount,
                        },
                    );

                    if (finalizeError || !finalizeResult?.success) {
                        console.error(
                            "Error finalizing emergency card payment:",
                            finalizeError || finalizeResult,
                        );
                    }
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log(`PaymentIntent failed: ${paymentIntent.id}`);

                const isTopUp = paymentIntent.metadata?.is_top_up === "true";
                if (isTopUp || !paymentIntent.metadata?.emergency_request_id) {
                    await supabaseAdmin
                        .from("payments")
                        .update({
                            status: "failed",
                            processed_at: new Date().toISOString(),
                            provider_response: paymentIntent,
                        })
                        .eq("stripe_payment_intent_id", paymentIntent.id);
                } else {
                    const failureMessage =
                        paymentIntent.last_payment_error?.message ||
                        paymentIntent.last_payment_error?.code ||
                        "card_payment_failed";

                    const { data: failResult, error: failError } = await supabaseAdmin.rpc(
                        "fail_card_payment",
                        {
                            p_payment_intent_id: paymentIntent.id,
                            p_provider_response: paymentIntent,
                            p_failure_reason: failureMessage,
                        },
                    );

                    if (failError || !failResult?.success) {
                        console.error(
                            "Error failing emergency card payment:",
                            failError || failResult,
                        );
                    }
                }
                break;
            }

            case "account.updated": {
                const account = event.data.object as Stripe.Account;
                console.log(`Account updated: ${account.id}`);

                const { error: orgError } = await supabaseAdmin
                    .from("organizations")
                    .update({
                        is_active: account.details_submitted && account.payouts_enabled,
                    })
                    .eq("stripe_account_id", account.id);

                if (orgError) {
                    console.error("Error syncing organization status:", orgError);
                }
                break;
            }

            case "payout.paid": {
                const payout = event.data.object as Stripe.Payout;
                console.log(`Payout completed: ${payout.id}`);

                const stripeAccountId = event.account;

                if (stripeAccountId) {
                    const { data: org } = await supabaseAdmin
                        .from("organizations")
                        .select("id")
                        .eq("stripe_account_id", stripeAccountId)
                        .single();

                    if (org) {
                        const amount = payout.amount / 100;
                        const { data: wallet } = await supabaseAdmin
                            .from("organization_wallets")
                            .select("id, balance")
                            .eq("organization_id", org.id)
                            .single();

                        if (wallet) {
                            await supabaseAdmin
                                .from("organization_wallets")
                                .update({
                                    balance: wallet.balance - amount,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq("id", wallet.id);

                            await supabaseAdmin.from("wallet_ledger").insert({
                                wallet_id: wallet.id,
                                amount: -amount,
                                transaction_type: "payout",
                                description: `Payout ${payout.id} to bank`,
                                external_reference: payout.id,
                                metadata: { stripe_payout: payout },
                            });
                        }
                    }
                } else {
                    const { data: mainWallet } = await supabaseAdmin
                        .from("ivisit_main_wallet")
                        .select("id, balance")
                        .limit(1)
                        .single();

                    if (mainWallet) {
                        const amount = payout.amount / 100;
                        await supabaseAdmin
                            .from("ivisit_main_wallet")
                            .update({
                                balance: mainWallet.balance - amount,
                                last_updated: new Date().toISOString(),
                            })
                            .eq("id", mainWallet.id);

                        await supabaseAdmin.from("wallet_ledger").insert({
                            wallet_id: mainWallet.id,
                            amount: -amount,
                            transaction_type: "payout",
                            description: `Platform Payout ${payout.id} to bank`,
                            external_reference: payout.id,
                            metadata: { stripe_payout: payout },
                        });
                    }
                }
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

        return jsonResponse({ received: true }, { status: 200 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Webhook Error:", message);
        return jsonResponse({ error: message }, { status: 500 });
    }
});
