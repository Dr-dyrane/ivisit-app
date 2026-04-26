/**
 * usePaymentMethodsQuery - TanStack Query for payment methods
 *
 * Fetches available payment methods with caching.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "../../services/paymentService";

const PAYMENT_METHODS_QUERY_KEY = ["paymentMethods"];

export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: () => paymentService.getPaymentMethods(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useInvalidatePaymentMethods() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
  };
}
