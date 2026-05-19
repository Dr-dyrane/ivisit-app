import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { getAuthorizationHeader, isOptionsRequest } from "../../_shared/http/request.ts";
import { createStripeClient } from "../../_shared/payments/stripe.ts";
import { createServiceClient, createUserClient } from "../../_shared/supabase/clients.ts";

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    const authHeader = getAuthorizationHeader(req);
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createUserClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid user");
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "org_admin" && profile.role !== "admin")) {
      throw new Error("Unauthorized: Only organization admins can request payouts");
    }

    const { amount, currency = "usd", organization_id } = await req.json();

    if (profile.role === "org_admin") {
      if (!organization_id || profile.organization_id !== organization_id) {
        throw new Error("Unauthorized: You can only request payouts for your own organization");
      }
    }

    if (!amount) {
      throw new Error("Missing required field: amount");
    }

    const supabaseAdmin = createServiceClient();
    let stripeAccountId = null;

    if (organization_id) {
      const { data: organization, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("stripe_account_id")
        .eq("id", organization_id)
        .single();

      if (orgError || !organization || !organization.stripe_account_id) {
        throw new Error("Organization Stripe account not found");
      }
      stripeAccountId = organization.stripe_account_id;
    }

    const stripe = createStripeClient();
    const amountInCents = Math.round(Number(amount) * 100);
    const payoutOptions: Record<string, unknown> = {
      amount: amountInCents,
      currency,
    };
    const stripeHeaderOptions: Record<string, unknown> = {};
    if (stripeAccountId) {
      stripeHeaderOptions.stripeAccount = stripeAccountId;
    }

    const payout = await stripe.payouts.create(payoutOptions, stripeHeaderOptions);

    console.log(`Payout created for ${stripeAccountId || "Platform"}: ${amount} ${currency}`);

    return jsonResponse(
      {
        success: true,
        payoutId: payout.id,
        status: payout.status,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payout edge function error:", message);
    return jsonResponse({ error: message }, { status: 400 });
  }
});
