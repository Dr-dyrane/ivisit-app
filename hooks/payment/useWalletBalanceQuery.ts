/**
 * useWalletBalanceQuery - TanStack Query for wallet balance
 *
 * Fetches user's wallet balance with frequent refresh.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "../../services/paymentService";

const WALLET_BALANCE_QUERY_KEY = ["walletBalance"];

export function useWalletBalanceQuery() {
  return useQuery({
    queryKey: WALLET_BALANCE_QUERY_KEY,
    queryFn: () => paymentService.getWalletBalance(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInvalidateWalletBalance() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: WALLET_BALANCE_QUERY_KEY });
  };
}
