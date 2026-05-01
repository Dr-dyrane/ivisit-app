import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  selectMedicalProfile,
  selectMedicalProfileReady,
} from "../../stores/medicalProfileSelectors";
import { useMedicalProfileStore } from "../../stores/medicalProfileStore";
import { useMedicalProfileMutations } from "./useMedicalProfileMutations";
import { medicalProfileQueryKeys } from "./medicalProfile.queryKeys";

// PULLBACK NOTE: Medical profile compatibility facade hook.

export function useMedicalProfileFacade() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const queryClient = useQueryClient();

  const profile = useMedicalProfileStore(selectMedicalProfile);
  const hydrated = useMedicalProfileStore((state) => state.hydrated);
  const ownerUserId = useMedicalProfileStore((state) => state.ownerUserId);
  const isSyncing = useMedicalProfileStore((state) => state.isSyncing);
  const lifecycleError = useMedicalProfileStore(
    (state) => state.lifecycleError,
  );
  const requestMedicalProfileRetry = useMedicalProfileStore(
    (state) => state.requestMedicalProfileRetry,
  );
  const isReady = useMedicalProfileStore(selectMedicalProfileReady);

  const mutations = useMedicalProfileMutations({ userId });

  const refreshProfile = useCallback(async () => {
    if (!userId) return profile;
    await queryClient.invalidateQueries({
      queryKey: medicalProfileQueryKeys.detail(userId),
      exact: true,
    });
    await queryClient.refetchQueries({
      queryKey: medicalProfileQueryKeys.detail(userId),
      exact: true,
    });
    return (
      queryClient.getQueryData(medicalProfileQueryKeys.detail(userId)) ||
      profile
    );
  }, [profile, queryClient, userId]);

  const safeProfile = useMemo(() => {
    if (!userId) return profile;
    if (ownerUserId && ownerUserId !== userId) {
      return null;
    }
    return profile;
  }, [ownerUserId, profile, userId]);

  return {
    profile: safeProfile,
    isLoading:
      !hydrated || (Boolean(userId) && isSyncing && safeProfile == null),
    isSaving: mutations.isMutating,
    error: mutations.error?.message || lifecycleError || null,
    refreshProfile,
    updateProfile: mutations.updateProfile,
    resetProfile: mutations.resetProfile,
    isReady,
    retry: requestMedicalProfileRetry,
  };
}

export default useMedicalProfileFacade;
