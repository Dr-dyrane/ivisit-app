import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { getEnv } from "../env/env.ts";

export const STRIPE_API_VERSION = "2022-11-15";

export const createStripeClient = (): Stripe => {
  const secretKey = getEnv("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("Missing Stripe secret key");
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
  });
};

export const constructStripeWebhookEvent = async (
  body: string,
  signature: string | null,
) => {
  if (!signature) {
    throw new Error("Missing stripe-signature");
  }

  const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    throw new Error("Missing Stripe webhook secret");
  }

  return await createStripeClient().webhooks.constructEventAsync(
    body,
    signature,
    webhookSecret,
  );
};
