import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { maybeResolveDisplayId } from "../domain/ids.ts";
import { createServiceClient } from "../supabase/clients.ts";

type SupabaseAdmin = ReturnType<typeof createServiceClient>;
type JsonObject = Record<string, unknown>;

export type EmergencyPaymentContext = {
  request: {
    id: string;
    hospital_id: string;
    total_cost: number | string;
  };
  payment: {
    id: string;
    user_id: string;
    emergency_request_id: string;
    organization_id: string;
    amount: number | string;
    currency: string;
    stripe_payment_intent_id: string | null;
    ivisit_fee_amount: number | string | null;
    metadata: JsonObject | null;
  };
  amountInCents: number;
  currency: string;
};

const asJsonObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};

export const paymentErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
    ? String(error.message)
    : String(error || "Unknown error");

export const toPositiveCents = (value: unknown, field: string): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Missing or invalid canonical ${field}`);
  }

  return Math.round(amount * 100);
};

const toCanonicalFeeCents = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid canonical payment fee");
  }
  return Math.round(amount * 100);
};

export const normalizePaymentCurrency = (value: unknown): string => {
  const currency = String(value || "").trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error("Missing or invalid canonical payment currency");
  }

  return currency;
};

export const buildEmergencyPaymentIntentConnectParams = ({
  stripeAccountId,
  applicationFeeInCents,
}: {
  stripeAccountId: string | null;
  applicationFeeInCents: number;
}): {
  application_fee_amount?: number;
  transfer_data?: { destination: string };
} => {
  if (!stripeAccountId) return {};

  return {
    ...(applicationFeeInCents > 0
      ? { application_fee_amount: applicationFeeInCents }
      : {}),
    transfer_data: { destination: stripeAccountId },
  };
};

const expandableId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return typeof value.id === "string" ? value.id : null;
  }
  return null;
};

// PULLBACK NOTE: Emergency Stripe delivery hardening.
// OLD: Client amount/org could create a fresh intent and fallback payment row.
// NEW: The canonical pending request/payment owns pricing, association, and reuse.
export const loadEmergencyPaymentContext = async (
  supabaseAdmin: SupabaseAdmin,
  userId: string,
  requestReference: unknown,
): Promise<EmergencyPaymentContext> => {
  if (!requestReference) {
    throw new Error("Missing emergency request for card payment");
  }

  const resolvedRequestId = await maybeResolveDisplayId(
    supabaseAdmin,
    String(requestReference),
  );
  if (!resolvedRequestId) {
    throw new Error("Emergency request not found for current user");
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from("emergency_requests")
    .select("id, user_id, hospital_id, status, payment_status, total_cost")
    .eq("id", resolvedRequestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (requestError) {
    throw new Error(
      `Could not load emergency request: ${paymentErrorMessage(requestError)}`,
    );
  }
  if (!request) {
    throw new Error("Emergency request not found for current user");
  }
  if (request.status !== "pending_approval" || request.payment_status !== "pending") {
    throw new Error("Emergency request is not awaiting card payment");
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .select(
      "id, user_id, emergency_request_id, organization_id, amount, currency, payment_method, status, stripe_payment_intent_id, ivisit_fee_amount, metadata",
    )
    .eq("emergency_request_id", request.id)
    .eq("user_id", userId)
    .eq("payment_method", "card")
    .eq("status", "pending")
    .maybeSingle();

  if (paymentError) {
    throw new Error(
      `Could not load canonical pending card payment: ${paymentErrorMessage(paymentError)}`,
    );
  }
  if (!payment) {
    throw new Error("Canonical pending card payment not found");
  }

  const { data: hospital, error: hospitalError } = await supabaseAdmin
    .from("hospitals")
    .select("id, organization_id")
    .eq("id", request.hospital_id)
    .maybeSingle();

  if (hospitalError) {
    throw new Error(
      `Could not load emergency request hospital: ${paymentErrorMessage(hospitalError)}`,
    );
  }
  if (!hospital?.organization_id) {
    throw new Error("Emergency request hospital has no organization");
  }
  if (!payment.organization_id || payment.organization_id !== hospital.organization_id) {
    throw new Error("Pending payment organization does not match the emergency request");
  }

  const amountInCents = toPositiveCents(payment.amount, "payment amount");
  const requestAmountInCents = toPositiveCents(request.total_cost, "request total");
  if (amountInCents !== requestAmountInCents) {
    throw new Error("Pending payment amount does not match the emergency request total");
  }

  return {
    request,
    payment,
    amountInCents,
    currency: normalizePaymentCurrency(payment.currency),
  };
};

const assertReusableEmergencyIntent = ({
  paymentIntent,
  context,
  customerId,
  destinationAccountId,
  applicationFeeInCents,
}: {
  paymentIntent: Stripe.PaymentIntent;
  context: EmergencyPaymentContext;
  customerId: string;
  destinationAccountId: string | null;
  applicationFeeInCents: number;
}) => {
  const { payment, request, amountInCents, currency } = context;

  if (paymentIntent.amount !== amountInCents || paymentIntent.currency !== currency) {
    throw new Error("Bound Stripe PaymentIntent does not match the canonical amount");
  }
  if (expandableId(paymentIntent.customer) !== customerId) {
    throw new Error("Bound Stripe PaymentIntent does not match the patient customer");
  }
  if (
    Number(paymentIntent.application_fee_amount || 0) !== applicationFeeInCents ||
    expandableId(paymentIntent.transfer_data?.destination) !== destinationAccountId
  ) {
    throw new Error("Bound Stripe PaymentIntent does not match the canonical organization");
  }

  const metadata = paymentIntent.metadata || {};
  if (
    metadata.user_id !== payment.user_id ||
    metadata.organization_id !== payment.organization_id ||
    metadata.emergency_request_id !== request.id ||
    metadata.is_top_up !== "false" ||
    (metadata.payment_id && metadata.payment_id !== payment.id)
  ) {
    throw new Error("Bound Stripe PaymentIntent metadata does not match the payment row");
  }
  if (!paymentIntent.client_secret || paymentIntent.status === "canceled") {
    throw new Error("Bound Stripe PaymentIntent cannot be confirmed");
  }
};

const bindEmergencyPaymentIntent = async ({
  supabaseAdmin,
  context,
  paymentIntent,
  applicationFeeInCents,
}: {
  supabaseAdmin: SupabaseAdmin;
  context: EmergencyPaymentContext;
  paymentIntent: Stripe.PaymentIntent;
  applicationFeeInCents: number;
}) => {
  const { payment, request } = context;
  const feeAmount = Number((applicationFeeInCents / 100).toFixed(2));
  const paymentMetadata = {
    ...asJsonObject(payment.metadata),
    source: "create-payment-intent",
    payment_kind: "service",
    is_top_up: false,
    fee_amount: feeAmount,
    fee: feeAmount,
  };

  const { data: boundPayment, error: bindError } = await supabaseAdmin
    .from("payments")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      ivisit_fee_amount: feeAmount,
      metadata: paymentMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("user_id", payment.user_id)
    .eq("emergency_request_id", request.id)
    .eq("payment_method", "card")
    .eq("status", "pending")
    .is("stripe_payment_intent_id", null)
    .select("id, stripe_payment_intent_id")
    .maybeSingle();

  if (bindError) {
    throw new Error(
      `Could not bind Stripe PaymentIntent to payment: ${paymentErrorMessage(bindError)}`,
    );
  }
  if (boundPayment?.stripe_payment_intent_id === paymentIntent.id) {
    return;
  }

  // A concurrent request may have won the null-only update with the same
  // idempotent Stripe object. Confirm that association before returning it.
  const { data: currentPayment, error: currentPaymentError } = await supabaseAdmin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("id", payment.id)
    .maybeSingle();

  if (currentPaymentError) {
    throw new Error(
      `Could not verify Stripe PaymentIntent binding: ${paymentErrorMessage(currentPaymentError)}`,
    );
  }
  if (currentPayment?.stripe_payment_intent_id !== paymentIntent.id) {
    throw new Error("Could not bind Stripe PaymentIntent to the canonical payment");
  }
};

export const getEmergencyPaymentIntent = async ({
  supabaseAdmin,
  stripe,
  context,
  customerId,
  stripeAccountId,
  feePercentage,
}: {
  supabaseAdmin: SupabaseAdmin;
  stripe: Stripe;
  context: EmergencyPaymentContext;
  customerId: string;
  stripeAccountId: string | null;
  feePercentage: number;
}): Promise<Stripe.PaymentIntent> => {
  const { payment, request, amountInCents, currency } = context;
  const canonicalFeeInCents = toCanonicalFeeCents(payment.ivisit_fee_amount);
  const applicationFeeInCents = stripeAccountId
    ? canonicalFeeInCents ?? Math.round((amountInCents * feePercentage) / 100)
    : 0;
  if (applicationFeeInCents > amountInCents) {
    throw new Error("Canonical application fee exceeds the payment amount");
  }

  const destinationAccountId = stripeAccountId;
  if (payment.stripe_payment_intent_id) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripe_payment_intent_id,
    );
    assertReusableEmergencyIntent({
      paymentIntent,
      context,
      customerId,
      destinationAccountId,
      applicationFeeInCents,
    });
    return paymentIntent;
  }

  const idempotencyKey = `emergency-payment-intent:${payment.id}`;
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountInCents,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      ...buildEmergencyPaymentIntentConnectParams({
        stripeAccountId: destinationAccountId,
        applicationFeeInCents,
      }),
      metadata: {
        payment_id: payment.id,
        user_id: payment.user_id,
        organization_id: payment.organization_id,
        emergency_request_id: request.id,
        is_top_up: "false",
      },
    },
    { idempotencyKey },
  );

  assertReusableEmergencyIntent({
    paymentIntent,
    context,
    customerId,
    destinationAccountId,
    applicationFeeInCents,
  });
  await bindEmergencyPaymentIntent({
    supabaseAdmin,
    context,
    paymentIntent,
    applicationFeeInCents,
  });

  return paymentIntent;
};
