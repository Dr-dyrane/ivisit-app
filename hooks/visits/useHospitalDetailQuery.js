// hooks/visits/useHospitalDetailQuery.js
//
// PULLBACK NOTE: VD-D (VD-4) — migrated from useState + useEffect in useMapVisitDetailModel.
// OLD: ad-hoc fetch per open, no caching, no dedup, no loading/error state.
// NEW: TanStack Query — shared cache per hospitalId, dedup across concurrent callers.

import { useQuery } from "@tanstack/react-query";
import { hospitalsService } from "../../services/hospitalsService";

export function useHospitalDetailQuery(hospitalId) {
  return useQuery({
    queryKey: ["hospitalDetail", hospitalId ?? null],
    queryFn: async () => {
      if (!hospitalId) return null;
      const record = await hospitalsService.getById(hospitalId);
      return record ?? null;
    },
    enabled: Boolean(hospitalId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export default useHospitalDetailQuery;
