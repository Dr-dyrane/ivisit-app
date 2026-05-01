import { useQuery } from "@tanstack/react-query";
import { medicalProfileService } from "../../services/medicalProfileService";
import { medicalProfileQueryKeys } from "./medicalProfile.queryKeys";

// PULLBACK NOTE: Medical profile five-layer pass - Layer 2 read lane.

export function useMedicalProfileQuery({ userId, enabled = true }) {
  return useQuery({
    queryKey: medicalProfileQueryKeys.detail(userId),
    queryFn: async () => medicalProfileService.get({ userId }),
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export default useMedicalProfileQuery;
