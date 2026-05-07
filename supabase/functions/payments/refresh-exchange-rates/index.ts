import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type NormalizedRatesPayload = {
  baseCurrency: string;
  rates: Record<string, number>;
  source: string;
  raw: unknown;
};

const normalizeCurrencyCode = (value: unknown, fallback = "") => {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
};

const normalizeRatesPayload = (
  payload: unknown,
  sourceFallback: string,
): NormalizedRatesPayload | null => {
  if (
    payload &&
    typeof payload === "object" &&
    "base_code" in payload &&
    "rates" in payload &&
    typeof (payload as { rates: unknown }).rates === "object"
  ) {
    const sourcePayload = payload as {
      base_code?: unknown;
      rates?: Record<string, unknown>;
      provider?: unknown;
      documentation?: unknown;
    };
    const rates = Object.fromEntries(
      Object.entries(sourcePayload.rates || {}).flatMap(([currency, value]) => {
        const normalizedCurrency = normalizeCurrencyCode(currency);
        const numericRate = Number(value);
        return normalizedCurrency && Number.isFinite(numericRate) && numericRate > 0
          ? [[normalizedCurrency, numericRate]]
          : [];
      }),
    );
    return {
      baseCurrency: normalizeCurrencyCode(sourcePayload.base_code, "USD"),
      rates,
      source:
        typeof sourcePayload.provider === "string" && sourcePayload.provider.trim()
          ? sourcePayload.provider.trim()
          : typeof sourcePayload.documentation === "string" &&
              sourcePayload.documentation.trim()
            ? sourcePayload.documentation.trim()
            : sourceFallback,
      raw: payload,
    };
  }

  if (
    payload &&
    typeof payload === "object" &&
    "base" in payload &&
    "rates" in payload &&
    typeof (payload as { rates: unknown }).rates === "object"
  ) {
    const sourcePayload = payload as {
      base?: unknown;
      rates?: Record<string, unknown>;
      source?: unknown;
    };
    const rates = Object.fromEntries(
      Object.entries(sourcePayload.rates || {}).flatMap(([currency, value]) => {
        const normalizedCurrency = normalizeCurrencyCode(currency);
        const numericRate = Number(value);
        return normalizedCurrency && Number.isFinite(numericRate) && numericRate > 0
          ? [[normalizedCurrency, numericRate]]
          : [];
      }),
    );
    return {
      baseCurrency: normalizeCurrencyCode(sourcePayload.base, "USD"),
      rates,
      source:
        typeof sourcePayload.source === "string" && sourcePayload.source.trim()
          ? sourcePayload.source.trim()
          : sourceFallback,
      raw: payload,
    };
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    typeof (payload as { data: unknown }).data === "object"
  ) {
    const sourcePayload = payload as {
      data?: Record<string, unknown>;
      meta?: { base_currency?: unknown; source?: unknown };
      source?: unknown;
    };
    const rates = Object.fromEntries(
      Object.entries(sourcePayload.data || {}).flatMap(([currency, value]) => {
        const normalizedCurrency = normalizeCurrencyCode(currency);
        const numericRate =
          typeof value === "number"
            ? value
            : typeof value === "object" &&
                value !== null &&
                "value" in value &&
                Number.isFinite(Number((value as { value?: unknown }).value))
              ? Number((value as { value?: unknown }).value)
              : NaN;
        return normalizedCurrency && Number.isFinite(numericRate) && numericRate > 0
          ? [[normalizedCurrency, numericRate]]
          : [];
      }),
    );
    return {
      baseCurrency: normalizeCurrencyCode(
        sourcePayload.meta?.base_currency,
        "USD",
      ),
      rates,
      source:
        typeof sourcePayload.meta?.source === "string"
          ? sourcePayload.meta.source
          : typeof sourcePayload.source === "string"
            ? sourcePayload.source
            : sourceFallback,
      raw: payload,
    };
  }

  if (
    payload &&
    typeof payload === "object" &&
    "quotes" in payload &&
    typeof (payload as { quotes: unknown }).quotes === "object"
  ) {
    const sourcePayload = payload as {
      source?: unknown;
      quotes?: Record<string, unknown>;
    };
    const baseCurrency = normalizeCurrencyCode(sourcePayload.source, "USD");
    const rates = Object.fromEntries(
      Object.entries(sourcePayload.quotes || {}).flatMap(([pair, value]) => {
        const numericRate = Number(value);
        if (!Number.isFinite(numericRate) || numericRate <= 0) return [];
        if (!pair.startsWith(baseCurrency)) return [];
        const normalizedCurrency = normalizeCurrencyCode(pair.slice(baseCurrency.length));
        return normalizedCurrency ? [[normalizedCurrency, numericRate]] : [];
      }),
    );
    return {
      baseCurrency,
      rates,
      source: sourceFallback,
      raw: payload,
    };
  }

  return null;
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not verify user role: ${profileError.message}`);
    }

    if (!["admin", "org_admin"].includes(profile?.role || "")) {
      throw new Error("Only admins can refresh exchange rates");
    }

    const providerUrl = Deno.env.get("FX_PROVIDER_URL") ?? "";
    const manualRatesJson = Deno.env.get("FX_MANUAL_RATES_JSON") ?? "";
    const sourceFallback = Deno.env.get("FX_PROVIDER_SOURCE") ?? "manual_seed";
    const staleHours = Number(Deno.env.get("FX_STALE_HOURS") ?? "24");

    let normalizedPayload: NormalizedRatesPayload | null = null;

    if (manualRatesJson) {
      normalizedPayload = normalizeRatesPayload(
        JSON.parse(manualRatesJson),
        sourceFallback,
      );
    } else if (providerUrl) {
      const apiKey = Deno.env.get("FX_PROVIDER_API_KEY") ?? "";
      const authHeaderName =
        Deno.env.get("FX_PROVIDER_AUTH_HEADER") ?? "Authorization";
      const headers: HeadersInit = {};
      if (apiKey) {
        headers[authHeaderName] =
          authHeaderName.toLowerCase() === "authorization"
            ? `Bearer ${apiKey}`
            : apiKey;
      }

      const response = await fetch(providerUrl, { headers });
      if (!response.ok) {
        throw new Error(`FX provider failed with ${response.status}`);
      }

      normalizedPayload = normalizeRatesPayload(
        await response.json(),
        sourceFallback,
      );
    }

    if (!normalizedPayload) {
      throw new Error(
        "No FX payload available. Configure FX_MANUAL_RATES_JSON or FX_PROVIDER_URL.",
      );
    }

    const fetchedAt = new Date();
    const staleAfter = new Date(
      fetchedAt.getTime() + Math.max(staleHours, 1) * 60 * 60 * 1000,
    );

    const rows = Object.entries(normalizedPayload.rates).map(
      ([quoteCurrency, rate]) => ({
        base_currency: normalizedPayload.baseCurrency,
        quote_currency: quoteCurrency,
        rate,
        source: normalizedPayload?.source || sourceFallback,
        fetched_at: fetchedAt.toISOString(),
        stale_after: staleAfter.toISOString(),
        metadata: {
          provider: normalizedPayload?.source || sourceFallback,
        },
        updated_at: fetchedAt.toISOString(),
      }),
    );

    if (rows.length === 0) {
      throw new Error("No valid rates found in provider payload");
    }

    const { error: upsertError } = await supabaseAdmin
      .from("exchange_rates")
      .upsert(rows, {
        onConflict: "base_currency,quote_currency",
      });

    if (upsertError) {
      throw new Error(`Could not upsert exchange rates: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        base_currency: normalizedPayload.baseCurrency,
        rate_count: rows.length,
        source: normalizedPayload.source,
        fetched_at: fetchedAt.toISOString(),
        stale_after: staleAfter.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
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
