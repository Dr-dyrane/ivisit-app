import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const normalizeCurrencyCode = (value: unknown, fallback = "") => {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
};

const normalizeCountryCode = (value: unknown, fallback = "") => {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(normalized) ? normalized : fallback;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount ?? body?.amount_usd ?? 0);
    const sourceCurrency = normalizeCurrencyCode(body?.source_currency, "USD");
    let billingCountryCode = normalizeCountryCode(body?.billing_country_code);
    let billingCurrencyCode = normalizeCurrencyCode(body?.billing_currency_code);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Invalid amount");
    }

    if (!billingCountryCode || !billingCurrencyCode) {
      const { data: preferences, error: preferencesError } = await supabaseAdmin
        .from("preferences")
        .select("billing_country_code, billing_currency_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (preferencesError) {
        throw new Error(
          `Could not read billing preferences: ${preferencesError.message}`,
        );
      }

      billingCountryCode =
        billingCountryCode ||
        normalizeCountryCode(preferences?.billing_country_code);
      billingCurrencyCode =
        billingCurrencyCode ||
        normalizeCurrencyCode(preferences?.billing_currency_code);
    }

    if (sourceCurrency === "USD") {
      const { data, error } = await supabaseAdmin.rpc("get_billing_quote", {
        p_amount_usd: amount,
        p_target_country_code: billingCountryCode || null,
        p_target_currency_code: billingCurrencyCode || null,
      });

      if (error) {
        throw new Error(`Billing quote RPC failed: ${error.message}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let resolvedTargetCurrency = billingCurrencyCode;
    if (!resolvedTargetCurrency && billingCountryCode) {
      const { data, error } = await supabaseAdmin.rpc(
        "resolve_currency_for_country",
        {
          p_country_code: billingCountryCode,
        },
      );
      if (error) {
        throw new Error(`Could not resolve target currency: ${error.message}`);
      }
      resolvedTargetCurrency = normalizeCurrencyCode(data);
    }

    const targetCurrency = resolvedTargetCurrency || sourceCurrency;
    const { data, error } = await supabaseAdmin.rpc(
      "convert_currency_for_payment",
      {
        p_amount: amount,
        p_from_currency: sourceCurrency,
        p_to_currency: targetCurrency,
      },
    );

    if (error) {
      throw new Error(`Currency conversion failed: ${error.message}`);
    }

    const response = data?.success
      ? {
          success: true,
          original_amount: amount,
          source_currency: sourceCurrency,
          display_amount: data.converted_amount,
          display_currency: targetCurrency,
          fx_rate: data.conversion_rate,
          quoted_at: data.quoted_at,
          stale_after: null,
          is_stale: Boolean(data.is_stale),
          source: data.source || "provider_cache",
          resolution_source: billingCurrencyCode
            ? "explicit_currency"
            : billingCountryCode
              ? "country_map"
              : "canonical",
          billing_country_code: billingCountryCode || null,
          metadata: {},
        }
      : data;

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

