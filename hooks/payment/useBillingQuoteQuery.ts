import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingQuoteService } from "../../services/billingQuoteService";
import { useBillingQuoteStore } from "../../stores/billingQuoteStore";
import { buildBillingContext } from "../../utils/billingContext";
import { resolveMoneyCurrency, toMoneyNumber } from "../../utils/formatMoney";

const BILLING_QUOTE_QUERY_KEY = ["billingQuote"];

type UseBillingQuoteQueryArgs = {
  amount: number | string | null | undefined;
  sourceCurrency?: string | null | undefined;
  preferences?: Record<string, unknown> | null | undefined;
  billingCountryCode?: string | null | undefined;
  billingCurrencyCode?: string | null | undefined;
  enabled?: boolean;
};

export function useBillingQuoteQuery({
  amount,
  sourceCurrency = "USD",
  preferences = null,
  billingCountryCode = null,
  billingCurrencyCode = null,
  enabled = true,
}: UseBillingQuoteQueryArgs) {
  const billingCountryCodeOverride = useBillingQuoteStore(
    (state) => state.billingCountryCodeOverride,
  );
  const billingCurrencyCodeOverride = useBillingQuoteStore(
    (state) => state.billingCurrencyCodeOverride,
  );

  const numericAmount = toMoneyNumber(amount);
  const normalizedSourceCurrency = resolveMoneyCurrency(sourceCurrency);

  const context = useMemo(
    () =>
      buildBillingContext({
        preferences,
        billingCountryCode:
          billingCountryCode ?? billingCountryCodeOverride ?? null,
        billingCurrencyCode:
          billingCurrencyCode ?? billingCurrencyCodeOverride ?? null,
      }),
    [
      billingCountryCode,
      billingCountryCodeOverride,
      billingCurrencyCode,
      billingCurrencyCodeOverride,
      preferences,
    ],
  );

  return useQuery({
    queryKey: [
      ...BILLING_QUOTE_QUERY_KEY,
      numericAmount ?? null,
      normalizedSourceCurrency,
      context.billingCountryCode ?? null,
      context.billingCurrencyCode ?? null,
    ],
    enabled:
      enabled &&
      numericAmount != null &&
      Number.isFinite(numericAmount) &&
      numericAmount >= 0,
    queryFn: () =>
      billingQuoteService.getQuote({
        amount: numericAmount,
        sourceCurrency: normalizedSourceCurrency,
        preferences,
        billingCountryCode: context.billingCountryCode,
        billingCurrencyCode: context.billingCurrencyCode,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

