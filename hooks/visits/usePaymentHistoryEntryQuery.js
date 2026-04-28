// hooks/visits/usePaymentHistoryEntryQuery.js
//
// PULLBACK NOTE: VD-D (VD-4) — migrated from useState + useEffect in useMapVisitDetailModel.
// OLD: re-fetched on every localPaymentTotalLabel change, no cache, no dedup.
// NEW: TanStack Query keyed on stable paymentLookupKey (paymentId or requestId).
//      Disabled when a usable local amount is already available.

import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../../services/paymentService";

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

const toCurrencyLabel = (value) => {
  const numeric = toFiniteNumber(value);
  if (numeric != null) return `$${numeric.toFixed(2)}`;
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
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
  const localAmount = toFiniteNumber(localPaymentTotalLabel);
  const hasUsableLocal = localAmount != null && Math.abs(localAmount) > 0;

  const { data: fetchedPriceLabel } = useQuery({
    queryKey: ["paymentHistoryEntry", paymentLookupKey ?? null],
    queryFn: async () => {
      const entry = await paymentService.getPaymentHistoryEntry({
        transactionId: paymentId || null,
        requestId: requestId || null,
      });
      const label = toCurrencyLabel(entry?.amount);
      const numeric = toFiniteNumber(label);
      if (label && numeric != null && Math.abs(numeric) > 0) return label;
      return null;
    },
    enabled: Boolean(paymentLookupKey) && !hasUsableLocal,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const effectivePaymentTotalLabel = (() => {
    const local = toFiniteNumber(localPaymentTotalLabel);
    if (local != null && Math.abs(local) > 0) return localPaymentTotalLabel;
    return fetchedPriceLabel || localPaymentTotalLabel || null;
  })();

  return { fetchedPriceLabel: fetchedPriceLabel ?? null, effectivePaymentTotalLabel };
}

export default usePaymentHistoryEntryQuery;
