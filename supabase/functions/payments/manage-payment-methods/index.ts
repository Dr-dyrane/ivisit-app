import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { maybeResolveDisplayId } from "../../_shared/domain/ids.ts";
import { jsonResponse, optionsResponse } from "../../_shared/http/cors.ts";
import { isOptionsRequest } from "../../_shared/http/request.ts";
import { createStripeClient } from "../../_shared/payments/stripe.ts";
import { requireAuthenticatedUser } from "../../_shared/supabase/auth.ts";
import { createServiceClient } from "../../_shared/supabase/clients.ts";

serve(async (req) => {
  if (isOptionsRequest(req)) {
    return optionsResponse();
  }

  try {
    const { user } = await requireAuthenticatedUser(req);

    const { action, organization_id, payment_method_id } = await req.json();
    const supabaseAdmin = createServiceClient();
    const stripe = createStripeClient();

    let customerId: string | null = null;
    let contextName = "";
    let resolvedOrgId = organization_id
      ? await maybeResolveDisplayId(supabaseAdmin, String(organization_id))
      : null;

    if (resolvedOrgId) {
      const { data: organization, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("id", resolvedOrgId)
        .single();

      if (orgError || !organization) throw new Error("Organization not found");
      customerId = organization.stripe_customer_id;
      contextName = organization.name;

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: organization.name,
          metadata: { organization_id: organization.id },
        });
        customerId = customer.id;
        await supabaseAdmin
          .from("organizations")
          .update({ stripe_customer_id: customerId })
          .eq("id", resolvedOrgId);
      }
    } else {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) throw new Error("Profile not found");
      customerId = profile.stripe_customer_id;
      contextName = profile.full_name || user.email;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: contextName,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    if (action === "create-setup-intent") {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId!,
        payment_method_types: ["card"],
        metadata: {
          organization_id: resolvedOrgId || null,
          user_id: resolvedOrgId ? null : user.id,
        },
      });
      return jsonResponse({ clientSecret: setupIntent.client_secret }, { status: 200 });
    }

    if (action === "list-payment-methods") {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId!,
        type: "card",
      });
      return jsonResponse({ data: paymentMethods.data }, { status: 200 });
    }

    if (action === "delete-payment-method") {
      if (!payment_method_id) throw new Error("Payment Method ID required");
      await stripe.paymentMethods.detach(payment_method_id);
      return jsonResponse({ success: true }, { status: 200 });
    }

    if (action === "set-payout-method" && resolvedOrgId) {
      if (!payment_method_id) throw new Error("Payment Method ID required");
      const pm = await stripe.paymentMethods.retrieve(payment_method_id);
      await supabaseAdmin
        .from("organizations")
        .update({
          payout_method_id: payment_method_id,
          payout_method_last4: pm.card?.last4,
          payout_method_brand: pm.card?.brand,
        })
        .eq("id", resolvedOrgId);

      return jsonResponse({ success: true }, { status: 200 });
    }

    throw new Error("Invalid action or missing organization_id for payout setup");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment methods error:", message);
    return jsonResponse({ error: message }, { status: 400 });
  }
});
