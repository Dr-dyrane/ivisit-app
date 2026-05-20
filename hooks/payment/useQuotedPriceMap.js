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

  const quoteEntries = useMemo(
    () =>
      normalizedItems.map((entry) => {
        const config = buildBillingQuoteQueryConfig({
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
        });
        return {
          ...entry,
          queryConfig: config,
          querySignature: JSON.stringify(config.queryKey),
        };
      }),
    [
      billingCountryCode,
      billingCurrencyCode,
      enabled,
      normalizedItems,
      preferences,
    ],
  );

  const uniqueQuoteConfigs = useMemo(() => {
    const seen = new Set();
    const configs = [];
    quoteEntries.forEach((entry) => {
      if (seen.has(entry.querySignature)) return;
      seen.add(entry.querySignature);
      configs.push(entry.queryConfig);
    });
    return configs;
  }, [quoteEntries]);

  const quoteResults = useQueries({
    queries: uniqueQuoteConfigs,
  });

  return useMemo(() => {
    const nextMap = {};
    const quoteBySignature = new Map();

    uniqueQuoteConfigs.forEach((config, index) => {
      quoteBySignature.set(
        JSON.stringify(config.queryKey),
        quoteResults[index]?.data || null,
      );
    });

    quoteEntries.forEach((entry) => {
      if (!entry?.key) return;
      const quote = quoteBySignature.get(entry.querySignature) || null;
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
  }, [quoteEntries, quoteResults, uniqueQuoteConfigs]);
}

export default useQuotedPriceMap;
