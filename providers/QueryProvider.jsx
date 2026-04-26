import React, { useMemo } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

/**
 * QueryProvider
 *
 * Provides TanStack Query (React Query) client to the app.
 * Configured for emergency flow with optimistic updates and background refetching.
 */
export function QueryProvider({ children }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Emergency data should be fresh for 10 seconds
            staleTime: 10 * 1000,
            // Refetch every 30 seconds for live data
            refetchInterval: 30 * 1000,
            // Retry on failure
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Keep previous data while fetching
            placeholderData: (previousData) => previousData,
          },
          mutations: {
            // Optimistic updates enabled
            retry: 1,
          },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
