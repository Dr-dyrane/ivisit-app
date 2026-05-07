import { supabase } from "./supabase";
import { buildBillingContext } from "../utils/billingContext";
import { normalizeCurrencyCode, toMoneyNumber } from "../utils/formatMoney";

const DEFAULT_CURRENCY = "USD";

const buildPassthroughQuote = ({
  amount,
  sourceCurrency = DEFAULT_CURRENCY,
  billingCountryCode = null,
  resolutionSource = "canonical",
  source = "canonical_passthrough",
}) => ({
  success: true,
  amount_usd: sourceCurrency === DEFAULT_CURRENCY ? amount : null,
  original_amount: amount,
  source_currency: sourceCurrency,
  display_amount: amount,
  display_currency: sourceCurrency,
  fx_rate: 1,
  quoted_at: new Date().toISOString(),
  stale_after: null,
  is_stale: false,
  source,
  resolution_source: resolutionSource,
  billing_country_code: billingCountryCode,
  metadata: {},
});

async function resolveTargetCurrencyCode({ billingCountryCode, billingCurrencyCode }) {
  const explicitCurrency = normalizeCurrencyCode(billingCurrencyCode, "");
  if (explicitCurrency) return explicitCurrency;

  if (!billingCountryCode) return "";

  const { data, error } = await supabase.rpc("resolve_currency_for_country", {
    p_country_code: billingCountryCode,
  });

  if (error) throw error;
  return normalizeCurrencyCode(data, "");
}

export const billingQuoteService = {
  buildBillingContext,

  async getQuote({
    amount,
    sourceCurrency = DEFAULT_CURRENCY,
    preferences = null,
    billingCountryCode = null,
    billingCurrencyCode = null,
  }) {
    const numericAmount = toMoneyNumber(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return null;
    }

    const normalizedSourceCurrency = normalizeCurrencyCode(
      sourceCurrency,
      DEFAULT_CURRENCY,
    );
    const context = buildBillingContext({
      preferences,
      billingCountryCode,
      billingCurrencyCode,
    });

    const targetCurrencyCode = await resolveTargetCurrencyCode(context);
    const resolutionSource = context.billingCurrencyCode
      ? "explicit_currency"
      : context.billingCountryCode
        ? "country_map"
        : "canonical";

    if (!context.billingCountryCode && !targetCurrencyCode) {
      return buildPassthroughQuote({
        amount: numericAmount,
        sourceCurrency: normalizedSourceCurrency,
        resolutionSource,
      });
    }

    if (
      !targetCurrencyCode ||
      targetCurrencyCode === normalizedSourceCurrency
    ) {
      return buildPassthroughQuote({
        amount: numericAmount,
        sourceCurrency: normalizedSourceCurrency,
        billingCountryCode: context.billingCountryCode,
        resolutionSource,
      });
    }

    if (normalizedSourceCurrency === DEFAULT_CURRENCY) {
      const { data, error } = await supabase.rpc("get_billing_quote", {
        p_amount_usd: numericAmount,
        p_target_country_code: context.billingCountryCode,
        p_target_currency_code: targetCurrencyCode,
      });

      if (error) throw error;
      if (!data?.success) {
        return buildPassthroughQuote({
          amount: numericAmount,
          sourceCurrency: normalizedSourceCurrency,
          billingCountryCode: context.billingCountryCode,
          resolutionSource,
          source: "quote_fallback",
        });
      }

      return data;
    }

    const { data, error } = await supabase.rpc("convert_currency_for_payment", {
      p_amount: numericAmount,
      p_from_currency: normalizedSourceCurrency,
      p_to_currency: targetCurrencyCode,
    });

    if (error) throw error;
    if (!data?.success) {
      return buildPassthroughQuote({
        amount: numericAmount,
        sourceCurrency: normalizedSourceCurrency,
        billingCountryCode: context.billingCountryCode,
        resolutionSource,
        source: "convert_fallback",
      });
    }

    return {
      success: true,
      amount_usd: normalizedSourceCurrency === DEFAULT_CURRENCY ? numericAmount : null,
      original_amount: numericAmount,
      source_currency: normalizedSourceCurrency,
      display_amount: data.converted_amount,
      display_currency: targetCurrencyCode,
      fx_rate: data.conversion_rate,
      quoted_at: data.quoted_at,
      stale_after: null,
      is_stale: Boolean(data.is_stale),
      source: data.source || "provider_cache",
      resolution_source: resolutionSource,
      billing_country_code: context.billingCountryCode,
      metadata: {},
    };
  },
};

export default billingQuoteService;

