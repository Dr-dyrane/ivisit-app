import { normalizeCurrencyCode } from "./formatMoney";

export function normalizeCountryCode(countryCode, fallback = "") {
  const normalized =
    typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(normalized) ? normalized : fallback;
}

export function resolveBillingCountryCode(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeCountryCode(candidate, "");
    if (normalized) return normalized;
  }
  return "";
}

export function resolveBillingCurrencyCode(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeCurrencyCode(candidate, "");
    if (normalized) return normalized;
  }
  return "";
}

export function buildBillingContext({
  preferences = null,
  billingCountryCode = null,
  billingCurrencyCode = null,
} = {}) {
  const resolvedCountry = resolveBillingCountryCode(
    billingCountryCode,
    preferences?.billingCountryCode,
    preferences?.billing_country_code,
  );
  const resolvedCurrency = resolveBillingCurrencyCode(
    billingCurrencyCode,
    preferences?.billingCurrencyCode,
    preferences?.billing_currency_code,
  );

  return {
    billingCountryCode: resolvedCountry || null,
    billingCurrencyCode: resolvedCurrency || null,
  };
}

