import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { emergencyContactsService } from "../../services/emergencyContactsService";
import {
  selectEmergencyContacts,
  selectHasSkippedLegacyContacts,
} from "../../stores/emergencyContactsSelectors";
import { useEmergencyContactsStore } from "../../stores/emergencyContactsStore";
import { useEmergencyContactsMutations } from "./useEmergencyContactsMutations";
import { emergencyContactsQueryKeys } from "./emergencyContacts.queryKeys";

// PULLBACK NOTE: EmergencyContacts compatibility facade hook.
// OLD: Hook owned bootstrap, migration, query observer, realtime, lifecycle, and consumer-facing CRUD.
// NEW: Bootstrap runs once at runtime; this hook now exposes canonical data, runtime status, and mutations to consumers.
// REASON: Remove side-effect-only hook calls and stop per-consumer bootstrap duplication.

export function useEmergencyContacts() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const queryClient = useQueryClient();

  const contacts = useEmergencyContactsStore(selectEmergencyContacts);
  const hydrated = useEmergencyContactsStore((state) => state.hydrated);
  const ownerUserId = useEmergencyContactsStore((state) => state.ownerUserId);
  const migrationStatus = useEmergencyContactsStore(
    (state) => state.migrationStatus,
  );
  const skippedLegacyContacts = useEmergencyContactsStore(
    (state) => state.skippedLegacyContacts,
  );
  const serverBacked = useEmergencyContactsStore((state) => state.serverBacked);
  const backendUnavailable = useEmergencyContactsStore(
    (state) => state.backendUnavailable,
  );
  const isSyncing = useEmergencyContactsStore((state) => state.isSyncing);
  const isReady = useEmergencyContactsStore((state) => state.isReady);
  const lifecycleError = useEmergencyContactsStore(
    (state) => state.lifecycleError,
  );
  const needsMigrationReview = useEmergencyContactsStore(
    (state) => state.needsMigrationReview,
  );
  const dismissMigrationReview = useEmergencyContactsStore(
    (state) => state.dismissMigrationReview,
  );
  const requestEmergencyContactsRetry = useEmergencyContactsStore(
    (state) => state.requestEmergencyContactsRetry,
  );
  const setMigrationStatus = useEmergencyContactsStore(
    (state) => state.setMigrationStatus,
  );
  const setSkippedLegacyContacts = useEmergencyContactsStore(
    (state) => state.setSkippedLegacyContacts,
  );

  const mutations = useEmergencyContactsMutations({ userId });

  const refreshContacts = useCallback(async () => {
    if (!userId) return [];
    emergencyContactsService.resetBackendState({ userId });
    await queryClient.invalidateQueries({
      queryKey: emergencyContactsQueryKeys.list(userId),
      exact: true,
    });
    await queryClient.refetchQueries({
      queryKey: emergencyContactsQueryKeys.list(userId),
      exact: true,
    });
    return (
      queryClient.getQueryData(emergencyContactsQueryKeys.list(userId)) || []
    );
  }, [queryClient, userId]);

  const removeSkippedLegacyContact = useCallback(
    async (legacyId) => {
      if (!userId) {
        throw new Error("AUTH_REQUIRED|User not logged in");
      }
      const nextState =
        await emergencyContactsService.removeSkippedLegacyContact(legacyId, {
          userId,
        });
      setMigrationStatus(nextState.status);
      setSkippedLegacyContacts(nextState.skippedLegacyContacts);
      if (nextState.skippedLegacyContacts.length === 0) {
        dismissMigrationReview();
      }
      return nextState;
    },
    [
      dismissMigrationReview,
      setMigrationStatus,
      setSkippedLegacyContacts,
      userId,
    ],
  );

  const safeContacts = useMemo(() => {
    if (!userId) return [];
    if (ownerUserId && ownerUserId !== userId) return [];
    return contacts;
  }, [contacts, ownerUserId, userId]);

  const safeSkippedLegacyContacts = useMemo(() => {
    if (!userId) return [];
    if (ownerUserId && ownerUserId !== userId) return [];
    return Array.isArray(skippedLegacyContacts) ? skippedLegacyContacts : [];
  }, [ownerUserId, skippedLegacyContacts, userId]);

  const isLoading =
    !hydrated ||
    (Boolean(userId) &&
      isSyncing &&
      safeContacts.length === 0 &&
      !backendUnavailable);

  const error = mutations.error?.message || lifecycleError || null;

  const syncNotice = backendUnavailable
    ? "Emergency contacts are in local-only mode until the backend table is applied."
    : null;

  return {
    contacts: safeContacts,
    isLoading,
    error,
    refreshContacts,
    addContact: mutations.createContact,
    updateContact: mutations.updateContact,
    removeContact: mutations.removeContact,
    migrationStatus,
    skippedLegacyContacts: safeSkippedLegacyContacts,
    serverBacked,
    backendUnavailable,
    syncNotice,
    isReady: isReady || needsMigrationReview,
    needsMigrationReview,
    removeSkippedLegacyContact,
    dismissMigrationReview,
    retry: requestEmergencyContactsRetry,
    hasSkippedLegacyContacts: selectHasSkippedLegacyContacts({
      skippedLegacyContacts: safeSkippedLegacyContacts,
    }),
  };
}

export default useEmergencyContacts;
