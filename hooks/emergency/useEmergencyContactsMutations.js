import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  emergencyContactsApiService,
  sortEmergencyContacts,
  buildEmergencyContactSignature,
} from "../../services/emergencyContactsApiService";
import { emergencyContactsService } from "../../services/emergencyContactsService";
import { useEmergencyContactsStore } from "../../stores/emergencyContactsStore";
import { emergencyContactsQueryKeys } from "./emergencyContacts.queryKeys";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Layer 2 (TanStack Query write lane)
// Owns: optimistic create/update/delete behavior and post-settlement cache reconciliation.
// Does NOT own: persistent cross-surface reads (Zustand) or lifecycle legality (XState).

const buildOptimisticContact = (userId, input = {}) => {
  const normalized = emergencyContactsApiService.normalizeInput(input, {
    allowInvalid: true,
  });
  const timestamp = new Date().toISOString();
  return {
    id: `optimistic_${Date.now()}`,
    userId,
    displayId: null,
    name: normalized.name,
    relationship: normalized.relationship,
    phone: normalized.phone,
    isPrimary: normalized.isPrimary,
    isActive: normalized.isActive,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const replaceById = (contacts, id, nextContact) =>
  (Array.isArray(contacts) ? contacts : []).map((contact) =>
    String(contact?.id) === String(id) ? nextContact : contact,
  );

export function useEmergencyContactsMutations({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = emergencyContactsQueryKeys.list(userId);
  const incrementMutationCount = useEmergencyContactsStore(
    (state) => state.incrementMutationCount,
  );
  const decrementMutationCount = useEmergencyContactsStore(
    (state) => state.decrementMutationCount,
  );

  const createMutation = useMutation({
    mutationFn: (contact) =>
      emergencyContactsService.create(contact, { userId }),
    onMutate: async (contact) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousContacts = queryClient.getQueryData(queryKey) || [];
      const optimisticContact = buildOptimisticContact(userId, contact);
      queryClient.setQueryData(
        queryKey,
        sortEmergencyContacts([optimisticContact, ...previousContacts]),
      );
      return { previousContacts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousContacts) {
        queryClient.setQueryData(queryKey, context.previousContacts);
      }
    },
    onSuccess: (createdContact) => {
      queryClient.setQueryData(queryKey, (current = []) => {
        const createdSignature = buildEmergencyContactSignature(createdContact);
        // Drop only the matching optimistic row so parallel optimistic items do not disappear.
        const withoutOptimistic = (
          Array.isArray(current) ? current : []
        ).filter((contact) => {
          if (!String(contact?.id || "").startsWith("optimistic_")) return true;
          return buildEmergencyContactSignature(contact) !== createdSignature;
        });
        return sortEmergencyContacts([createdContact, ...withoutOptimistic]);
      });
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) =>
      emergencyContactsService.update(id, updates, { userId }),
    onMutate: async ({ id, updates }) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousContacts = queryClient.getQueryData(queryKey) || [];
      queryClient.setQueryData(
        queryKey,
        sortEmergencyContacts(
          replaceById(previousContacts, id, {
            ...(previousContacts.find(
              (contact) => String(contact?.id) === String(id),
            ) || {}),
            ...updates,
            id,
            updatedAt: new Date().toISOString(),
          }),
        ),
      );
      return { previousContacts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousContacts) {
        queryClient.setQueryData(queryKey, context.previousContacts);
      }
    },
    onSuccess: (updatedContact) => {
      queryClient.setQueryData(queryKey, (current = []) =>
        sortEmergencyContacts(
          replaceById(current, updatedContact.id, updatedContact),
        ),
      );
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => emergencyContactsService.remove(id, { userId }),
    onMutate: async (id) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousContacts = queryClient.getQueryData(queryKey) || [];
      queryClient.setQueryData(
        queryKey,
        (Array.isArray(previousContacts) ? previousContacts : []).filter(
          (contact) => String(contact?.id) !== String(id),
        ),
      );
      return { previousContacts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousContacts) {
        queryClient.setQueryData(queryKey, context.previousContacts);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createContact = useCallback(
    (contact) => createMutation.mutateAsync(contact),
    [createMutation],
  );
  const updateContact = useCallback(
    (id, updates) => updateMutation.mutateAsync({ id, updates }),
    [updateMutation],
  );
  const removeContact = useCallback(
    (id) => removeMutation.mutateAsync(id),
    [removeMutation],
  );

  return useMemo(
    () => ({
      createContact,
      updateContact,
      removeContact,
      isMutating:
        createMutation.isPending ||
        updateMutation.isPending ||
        removeMutation.isPending,
      error:
        createMutation.error ||
        updateMutation.error ||
        removeMutation.error ||
        null,
    }),
    [
      createContact,
      updateContact,
      removeContact,
      createMutation.error,
      createMutation.isPending,
      removeMutation.error,
      removeMutation.isPending,
      updateMutation.error,
      updateMutation.isPending,
    ],
  );
}

export default useEmergencyContactsMutations;
