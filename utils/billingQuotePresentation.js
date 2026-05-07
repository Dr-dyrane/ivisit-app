import { formatMoney, resolveMoneyCurrency, toMoneyNumber } from "./formatMoney";

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

export function applyBillingQuoteToCost(cost, quote) {
  if (!cost || !quote?.success) return cost;

  const quotedAmount = toMoneyNumber(quote.display_amount);
  const quoteRate = toMoneyNumber(quote.fx_rate);
  const displayCurrency = resolveMoneyCurrency(
    quote.display_currency,
    cost?.currency,
  );

  if (!Number.isFinite(quotedAmount) || quotedAmount < 0) return cost;
  if (!Number.isFinite(quoteRate) || quoteRate <= 0) return cost;

  return {
    ...cost,
    totalCost: roundMoney(quotedAmount),
    total_cost: roundMoney(quotedAmount),
    currency: displayCurrency,
    displayQuote: quote,
    canonicalTotalCost: cost?.totalCost ?? cost?.total_cost ?? null,
    canonicalCurrency: resolveMoneyCurrency(cost?.currency),
    breakdown: Array.isArray(cost?.breakdown)
      ? cost.breakdown.map((item) => {
          const itemCost = toMoneyNumber(item?.cost);
          if (!Number.isFinite(itemCost)) return item;
          return {
            ...item,
            cost: roundMoney(itemCost * quoteRate),
            currency: displayCurrency,
          };
        })
      : cost?.breakdown,
  };
}

export function buildQuotedMoneyLabel({
  amount,
  currency = "USD",
  quote = null,
  fallback = null,
}) {
  if (quote?.success) {
    const displayAmount = toMoneyNumber(quote.display_amount);
    if (Number.isFinite(displayAmount) && displayAmount >= 0) {
      return formatMoney(displayAmount, {
        currency: resolveMoneyCurrency(quote.display_currency, currency),
        fallback,
      });
    }
  }

  return formatMoney(amount, {
    currency: resolveMoneyCurrency(currency),
    fallback,
  });
}
