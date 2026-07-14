import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { isOptionsRequest } from "../../_shared/http/request.ts";
import { ensurePatientCustomerId } from "../../_shared/payments/customers.ts";
import {
  getEmergencyPaymentIntent,
  loadEmergencyPaymentContext,
  normalizePaymentCurrency,
  paymentErrorMessage,
  toPositiveCents,
} from "../../_shared/payments/emergencyPaymentIntent.ts";
import { createStripeClient } from "../../_shared/payments/stripe.ts";
import { requireAuthenticatedUser } from "../../_shared/supabase/auth.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";

type SupabaseAdmin = ReturnType<typeof createServiceClient>;

const createTopUpPaymentIntent = async ({
  supabaseAdmin,
  stripe,
  customerId,
  userId,
  amount,
  currency,
}: {
  supabaseAdmin: SupabaseAdmin;
  stripe: Stripe;
  customerId: string;
  userId: string;
  amount: unknown;
  currency: unknown;
}) => {
  const amountInCents = toPositiveCents(amount, "top-up amount");
  const paymentCurrency = normalizePaymentCurrency(currency || "usd");
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: paymentCurrency,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      user_id: userId,
      organization_id: "platform",
      emergency_request_id: "",
      is_top_up: "true",
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Stripe top-up PaymentIntent has no client secret");
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: userId,
      organization_id: null,
      emergency_request_id: null,
      amount: amountInCents / 100,
      currency: paymentCurrency.toUpperCase(),
      payment_method: "card",
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
      ivisit_fee_amount: 0,
      metadata: {
        source: "create-payment-intent",
        payment_kind: "top_up",
        is_top_up: true,
        fee_amount: 0,
        fee: 0,
      },
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    throw new Error(
      `Could not bind Stripe top-up PaymentIntent: ${paymentErrorMessage(paymentError)}`,
    );
  }

  return {
    paymentIntent,
    paymentId: payment.id,
  };
};

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Invalid payment request body");
    }

    const supabaseAdmin = createServiceClient();
    const stripe = createStripeClient();

    if (body.is_top_up === true) {
      const customerId = await ensurePatientCustomerId({
        supabaseAdmin,
        stripe,
        userId: user.id,
        userEmail: user.email,
      });
      const { paymentIntent, paymentId } = await createTopUpPaymentIntent({
        supabaseAdmin,
        stripe,
        customerId,
        userId: user.id,
        amount: body.amount,
        currency: body.currency,
      });

      return jsonResponse(
        {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          paymentId,
          customerId,
        },
        { status: 200 },
      );
    }

    const context = await loadEmergencyPaymentContext(
      supabaseAdmin,
      user.id,
      body.emergency_request_id,
    );
    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .select("id, stripe_account_id, ivisit_fee_percentage")
      .eq("id", context.payment.organization_id)
      .maybeSingle();

    if (organizationError) {
      throw new Error(
        `Could not load payment organization: ${paymentErrorMessage(organizationError)}`,
      );
    }
    if (!organization) {
      throw new Error("Canonical payment organization not found");
    }

    const customerId = await ensurePatientCustomerId({
      supabaseAdmin,
      stripe,
      userId: user.id,
      userEmail: user.email,
    });
    const configuredFeePercentage = Number(organization.ivisit_fee_percentage);
    const feePercentage = Number.isFinite(configuredFeePercentage) &&
        configuredFeePercentage >= 0
      ? configuredFeePercentage
      : 2.5;
    const stripeAccountId = typeof organization.stripe_account_id === "string" &&
        organization.stripe_account_id.trim()
      ? organization.stripe_account_id
      : null;
    const paymentIntent = await getEmergencyPaymentIntent({
      supabaseAdmin,
      stripe,
      context,
      customerId,
      stripeAccountId,
      feePercentage,
    });

    return jsonResponse(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentId: context.payment.id,
        customerId,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = paymentErrorMessage(error);
    console.error("Edge Function Error:", message);
    return jsonResponse({ error: message }, { status: 400 });
  }
});
