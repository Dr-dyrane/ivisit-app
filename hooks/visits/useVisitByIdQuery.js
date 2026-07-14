import { useQuery } from "@tanstack/react-query";
import { visitsService } from "../../services/visitsService";
import { visitsQueryKeys } from "./visits.queryKeys";

export function useVisitByIdQuery({ visitKey, userId = null, enabled = true }) {
  return useQuery({
    queryKey: visitsQueryKeys.detail(visitKey, userId),
    queryFn: () => visitsService.getById(visitKey, { userId }),
    enabled: enabled && Boolean(visitKey),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export default useVisitByIdQuery;
