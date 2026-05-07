// hooks/visits/usePaymentHistoryEntryQuery.js
//
// PULLBACK NOTE: VD-D (VD-4) — migrated from useState + useEffect in useMapVisitDetailModel.
// OLD: re-fetched on every localPaymentTotalLabel change, no cache, no dedup.
// NEW: TanStack Query keyed on stable paymentLookupKey (paymentId or requestId).
//      Disabled when a usable local amount is already available.

import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../../services/paymentService";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useBillingQuoteQuery } from "../payment/useBillingQuoteQuery";
import { resolveMoneyCurrency } from "../../utils/formatMoney";
import { buildQuotedMoneyLabel } from "../../utils/billingQuotePresentation";

const toFiniteNumber = (value) => {
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "");
    if (!normalized) return null;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

/**
 * @param {Object} params
 * @param {string|null} params.paymentLookupKey  paymentId or requestId
 * @param {string|null} params.paymentId
 * @param {string|null} params.requestId
 * @param {string|null} params.localPaymentTotalLabel  already-resolved local label
 */
export function usePaymentHistoryEntryQuery({
  paymentLookupKey,
  paymentId,
  requestId,
  localPaymentTotalLabel,
}) {
  const { preferences } = usePreferences();

  const { data: fetchedEntry } = useQuery({
    queryKey: ["paymentHistoryEntry", paymentLookupKey ?? null],
    queryFn: async () => {
      return paymentService.getPaymentHistoryEntry({
        transactionId: paymentId || null,
        requestId: requestId || null,
      });
    },
    enabled: Boolean(paymentLookupKey),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
  const fetchedAmount = toFiniteNumber(fetchedEntry?.amount);
  const fetchedCurrency = resolveMoneyCurrency(fetchedEntry?.currency);
  const { data: fetchedQuote } = useBillingQuoteQuery({
    amount: fetchedAmount,
    sourceCurrency: fetchedCurrency,
    preferences,
    enabled: Boolean(paymentLookupKey) && fetchedAmount != null,
  });
  const fetchedPriceLabel =
    fetchedAmount != null
      ? buildQuotedMoneyLabel({
          amount: fetchedAmount,
          currency: fetchedCurrency,
          quote: fetchedQuote,
          fallback: null,
        })
      : null;

  const effectivePaymentTotalLabel = (() => {
    const local = toFiniteNumber(localPaymentTotalLabel);
    if (fetchedPriceLabel) return fetchedPriceLabel;
    if (local != null && Math.abs(local) > 0) return localPaymentTotalLabel;
    return localPaymentTotalLabel || null;
  })();

  return {
    fetchedEntry: fetchedEntry ?? null,
    fetchedPriceLabel: fetchedPriceLabel ?? null,
    effectivePaymentTotalLabel,
  };
}

export default usePaymentHistoryEntryQuery;
