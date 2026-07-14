import { buildEmergencyPaymentIntentConnectParams } from "./emergencyPaymentIntent.ts";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("zero-fee connected payment keeps the destination", () => {
  const params = buildEmergencyPaymentIntentConnectParams({
    stripeAccountId: "acct_connected",
    applicationFeeInCents: 0,
  });

  assert(
    params.transfer_data?.destination === "acct_connected",
    "connected organization destination must be preserved at zero fee",
  );
  assert(
    !("application_fee_amount" in params),
    "zero application fee should be omitted from Stripe parameters",
  );
});

Deno.test("payment without a connected account omits Connect parameters", () => {
  const params = buildEmergencyPaymentIntentConnectParams({
    stripeAccountId: null,
    applicationFeeInCents: 0,
  });

  assert(
    !("transfer_data" in params),
    "payment without a connected account must not set a destination",
  );
  assert(
    !("application_fee_amount" in params),
    "payment without a connected account must not set an application fee",
  );
});
