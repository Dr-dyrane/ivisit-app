import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { buildBillingQuoteQueryConfig } from "./useBillingQuoteQuery";
import { buildQuotedMoneyLabel } from "../../utils/billingQuotePresentation";
import { resolveMoneyCurrency, toMoneyNumber } from "../../utils/formatMoney";

function buildItemKey(item, index) {
  return (
    item?.id ||
    item?.service_type ||
    item?.room_type ||
    item?.service_name ||
    item?.title ||
    `quoted-price-${index}`
  );
}

export function useQuotedPriceMap({
  items = [],
  getAmount,
  getCurrency,
  billingCountryCode = null,
  billingCurrencyCode = null,
  preferences = null,
  enabled = true,
}) {
  const normalizedItems = useMemo(
    () =>
      (Array.isArray(items) ? items : []).map((item, index) => ({
        item,
        key: buildItemKey(item, index),
        amount: toMoneyNumber(getAmount?.(item)),
        currency: resolveMoneyCurrency(getCurrency?.(item)),
      })),
    [getAmount, getCurrency, items],
  );

  const quoteResults = useQueries({
    queries: normalizedItems.map((entry) =>
      buildBillingQuoteQueryConfig({
        amount: entry.amount,
        sourceCurrency: entry.currency,
        preferences,
        billingCountryCode,
        billingCurrencyCode,
        enabled:
          enabled &&
          Number.isFinite(entry.amount) &&
          entry.amount >= 0 &&
          Boolean(entry.key),
      }),
    ),
  });

  return useMemo(() => {
    const nextMap = {};

    normalizedItems.forEach((entry, index) => {
      if (!entry?.key) return;
      const quote = quoteResults[index]?.data || null;
      nextMap[entry.key] = {
        amount: entry.amount,
        currency: entry.currency,
        quote,
        label: buildQuotedMoneyLabel({
          amount: entry.amount,
          currency: entry.currency,
          quote,
        }),
      };
    });

    return nextMap;
  }, [normalizedItems, quoteResults]);
}

export default useQuotedPriceMap;
