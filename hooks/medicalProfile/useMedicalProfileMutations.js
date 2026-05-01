import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { medicalProfileService } from "../../services/medicalProfileService";
import { useMedicalProfileStore } from "../../stores/medicalProfileStore";
import { normalizeMedicalProfile } from "../../services/medicalProfileService";
import { medicalProfileQueryKeys } from "./medicalProfile.queryKeys";

// PULLBACK NOTE: Medical profile five-layer pass - Layer 2 write lane.

export function useMedicalProfileMutations({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = medicalProfileQueryKeys.detail(userId);
  const incrementMutationCount = useMedicalProfileStore(
    (state) => state.incrementMutationCount,
  );
  const decrementMutationCount = useMedicalProfileStore(
    (state) => state.decrementMutationCount,
  );

  const updateMutation = useMutation({
    mutationFn: (updates) => medicalProfileService.update(updates, { userId }),
    onMutate: async (updates) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousProfile = queryClient.getQueryData(queryKey) || null;

      queryClient.setQueryData(queryKey, (current = null) =>
        normalizeMedicalProfile({
          ...(current || {}),
          ...updates,
          updatedAt: new Date().toISOString(),
        }),
      );

      return { previousProfile };
    },
    onError: (error, _variables, context) => {
      if (error?.nextProfile) {
        queryClient.setQueryData(
          queryKey,
          normalizeMedicalProfile(error.nextProfile),
        );
        return;
      }

      if (context?.previousProfile) {
        queryClient.setQueryData(queryKey, context.previousProfile);
      }
    },
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(queryKey, normalizeMedicalProfile(nextProfile));
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => medicalProfileService.reset(),
    onMutate: async () => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousProfile = queryClient.getQueryData(queryKey) || null;
      return { previousProfile };
    },
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(queryKey, normalizeMedicalProfile(nextProfile));
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKey, context.previousProfile);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateProfile = useCallback(
    (updates) => updateMutation.mutateAsync(updates),
    [updateMutation],
  );
  const resetProfile = useCallback(
    () => resetMutation.mutateAsync(),
    [resetMutation],
  );

  return useMemo(
    () => ({
      updateProfile,
      resetProfile,
      isMutating: updateMutation.isPending || resetMutation.isPending,
      error: updateMutation.error || resetMutation.error || null,
    }),
    [
      resetMutation.error,
      resetMutation.isPending,
      resetProfile,
      updateMutation.error,
      updateMutation.isPending,
      updateProfile,
    ],
  );
}

export default useMedicalProfileMutations;
