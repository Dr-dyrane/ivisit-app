import { useQuery } from "@tanstack/react-query";
import mapboxService from "../../services/mapboxService";

interface LocationSearchQueryOptions {
  query: string;
  proximity?: { latitude: number; longitude: number } | null;
  enabled?: boolean;
}

export function useLocationSearchQuery({
  query,
  proximity,
  enabled = true,
}: LocationSearchQueryOptions) {
  const trimmedQuery = query?.trim() || "";
  const isEnabled = enabled && trimmedQuery.length >= 2;

  return useQuery({
    queryKey: [
      "locationSearch",
      trimmedQuery,
      proximity?.latitude?.toFixed(2),
      proximity?.longitude?.toFixed(2),
    ],
    queryFn: async () => {
      if (!isEnabled) return [];
      try {
        const results = await mapboxService.suggestAddresses(trimmedQuery, proximity);
        return results || [];
      } catch (error) {
        console.error("[useLocationSearchQuery] Search failed:", error);
        return [];
      }
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
  });
}
