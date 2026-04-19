import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const maybeResolveDisplayId = async (supabaseAdmin: any, rawId: string | null) => {
    if (!rawId) return null;
    if (/^(USR|HSP|AMB|REQ|VIST|ORG|DOC)-[A-F0-9]{3,6}$/i.test(rawId)) {
        const { data: uuid, error } = await supabaseAdmin.rpc("get_entity_id", {
            p_display_id: rawId.toUpperCase(),
        });
        if (error || !uuid) {
            throw new Error(`Could not resolve ID: ${rawId}`);
        }
        return uuid as string;
    }
    return rawId;
};

const ensurePatientCustomerId = async ({
    supabaseAdmin,
    stripe,
    userId,
    userEmail,
}: {
    supabaseAdmin: any;
    stripe: Stripe;
    userId: string;
    userEmail?: string | null;
}) => {
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, stripe_customer_id")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        throw new Error("Profile not found");
    }

    if (profile.stripe_customer_id) {
        return profile.stripe_customer_id as string;
    }

    const customer = await stripe.customers.create({
        email: userEmail || undefined,
        name: profile.full_name || userEmail || undefined,
        metadata: { user_id: userId },
    });

    const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", userId);

    if (updateError) {
        throw new Error(`Could not store Stripe customer: ${updateError.message}`);
    }

    return customer.id;
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("No authorization header");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            },
        );

        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            throw new Error("Invalid user");
        }

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

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
            apiVersion: "2022-11-15",
            httpClient: Stripe.createFetchHttpClient(),
        });

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

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error) {
        console.error("Edge Function Error:", error.message);
        return new Response(
            JSON.stringify({
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            },
        );
    }
});
