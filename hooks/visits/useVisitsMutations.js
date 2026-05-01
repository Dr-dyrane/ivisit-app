import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { visitsService } from "../../services/visitsService";
import { useVisitsStore } from "../../stores/visitsStore";
import {
  buildVisitKeySet,
  mergeVisitByKey,
  removeVisitByAnyKey,
  visitMatchesAnyKey,
} from "../../stores/visitsSelectors";
import {
  normalizeVisit,
  normalizeVisitsList,
} from "../../utils/domainNormalize";
import { visitsQueryKeys } from "./visits.queryKeys";

// PULLBACK NOTE: Visits five-layer pass - Layer 2 write lane.
// Owns: optimistic visit writes and cache reconciliation across scheduled and
// emergency-backed visit keys.

const buildOptimisticVisit = (input = {}) =>
  normalizeVisit({
    ...input,
    id: input?.id || `optimistic_${Date.now()}`,
    createdAt: input?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

export function useVisitsMutations({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = visitsQueryKeys.list(userId);
  const incrementMutationCount = useVisitsStore(
    (state) => state.incrementMutationCount,
  );
  const decrementMutationCount = useVisitsStore(
    (state) => state.decrementMutationCount,
  );

  const createMutation = useMutation({
    mutationFn: (visit) => visitsService.create(visit),
    onMutate: async (visit) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousVisits = queryClient.getQueryData(queryKey) || [];
      const optimisticVisit = buildOptimisticVisit(visit);

      queryClient.setQueryData(queryKey, (current = []) =>
        normalizeVisitsList([
          optimisticVisit,
          ...(Array.isArray(current) ? current : []),
        ]),
      );

      return {
        previousVisits,
        optimisticVisitId: optimisticVisit?.id || null,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKey, context.previousVisits);
      }
    },
    onSuccess: (createdVisit, _variables, context) => {
      queryClient.setQueryData(queryKey, (current = []) => {
        const next = (Array.isArray(current) ? current : []).filter(
          (visit) => String(visit?.id) !== String(context?.optimisticVisitId),
        );
        return normalizeVisitsList([createdVisit, ...next]);
      });
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => visitsService.update(id, updates),
    onMutate: async ({ id, updates }) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousVisits = queryClient.getQueryData(queryKey) || [];
      const previousMatch = (
        Array.isArray(previousVisits) ? previousVisits : []
      ).find((visit) => visitMatchesAnyKey(visit, buildVisitKeySet(id)));

      queryClient.setQueryData(queryKey, (current = []) =>
        mergeVisitByKey(current, id, {
          ...(previousMatch || null),
          ...updates,
          updatedAt: new Date().toISOString(),
        }),
      );

      return { previousVisits };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKey, context.previousVisits);
      }
    },
    onSuccess: (updatedVisit, variables) => {
      if (!updatedVisit) return;
      queryClient.setQueryData(queryKey, (current = []) =>
        mergeVisitByKey(current, variables?.id, updatedVisit),
      );
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => visitsService.cancel(id),
    onMutate: async (id) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousVisits = queryClient.getQueryData(queryKey) || [];
      const previousMatch = (
        Array.isArray(previousVisits) ? previousVisits : []
      ).find((visit) => visitMatchesAnyKey(visit, buildVisitKeySet(id)));

      queryClient.setQueryData(queryKey, (current = []) =>
        mergeVisitByKey(current, id, {
          ...(previousMatch || null),
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        }),
      );

      return { previousVisits };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKey, context.previousVisits);
      }
    },
    onSuccess: (updatedVisit, id) => {
      if (!updatedVisit) return;
      queryClient.setQueryData(queryKey, (current = []) =>
        mergeVisitByKey(current, id, updatedVisit),
      );
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id) => visitsService.complete(id),
    onMutate: async (id) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousVisits = queryClient.getQueryData(queryKey) || [];
      const previousMatch = (
        Array.isArray(previousVisits) ? previousVisits : []
      ).find((visit) => visitMatchesAnyKey(visit, buildVisitKeySet(id)));

      queryClient.setQueryData(queryKey, (current = []) =>
        mergeVisitByKey(current, id, {
          ...(previousMatch || null),
          status: "completed",
          updatedAt: new Date().toISOString(),
        }),
      );

      return { previousVisits };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKey, context.previousVisits);
      }
    },
    onSuccess: (updatedVisit, id) => {
      if (!updatedVisit) return;
      queryClient.setQueryData(queryKey, (current = []) =>
        mergeVisitByKey(current, id, updatedVisit),
      );
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => visitsService.delete(id),
    onMutate: async (id) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousVisits = queryClient.getQueryData(queryKey) || [];

      queryClient.setQueryData(queryKey, (current = []) =>
        removeVisitByAnyKey(current, id),
      );

      return { previousVisits };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKey, context.previousVisits);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addVisit = useCallback(
    (visit) => createMutation.mutateAsync(visit),
    [createMutation],
  );
  const updateVisit = useCallback(
    (id, updates) => updateMutation.mutateAsync({ id, updates }),
    [updateMutation],
  );
  const cancelVisit = useCallback(
    (id) => cancelMutation.mutateAsync(id),
    [cancelMutation],
  );
  const completeVisit = useCallback(
    (id) => completeMutation.mutateAsync(id),
    [completeMutation],
  );
  const deleteVisit = useCallback(
    (id) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  return useMemo(
    () => ({
      addVisit,
      updateVisit,
      cancelVisit,
      completeVisit,
      deleteVisit,
      isMutating:
        createMutation.isPending ||
        updateMutation.isPending ||
        cancelMutation.isPending ||
        completeMutation.isPending ||
        deleteMutation.isPending,
      error:
        createMutation.error ||
        updateMutation.error ||
        cancelMutation.error ||
        completeMutation.error ||
        deleteMutation.error ||
        null,
    }),
    [
      addVisit,
      cancelMutation.error,
      cancelMutation.isPending,
      cancelVisit,
      completeMutation.error,
      completeMutation.isPending,
      completeVisit,
      createMutation.error,
      createMutation.isPending,
      deleteMutation.error,
      deleteMutation.isPending,
      deleteVisit,
      updateMutation.error,
      updateMutation.isPending,
      updateVisit,
    ],
  );
}

export default useVisitsMutations;
