import { supabase } from "./supabase";
import {
  emergencyContactsApiService,
  isEmergencyContactsBackendUnavailableError,
} from "./emergencyContactsApiService";
import { emergencyContactsMigrationService } from "./emergencyContactsMigrationService";
import { emergencyContactsLocalService } from "./emergencyContactsLocalService";

const migrationPromises = new Map();
const backendStateByUserId = new Map();

const createDefaultBackendState = () => ({
  serverBacked: true,
  backendUnavailable: false,
  lastError: null,
});

const resolveUserId = async (options = {}) => {
  if (options?.userId) return String(options.userId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ? String(user.id) : null;
};

const requireUserId = async (options = {}) => {
  const userId = await resolveUserId(options);
  if (!userId) {
    throw new Error("AUTH_REQUIRED|User not logged in");
  }
  return userId;
};

const getBackendStateForUser = (userId) => {
  if (!userId) return createDefaultBackendState();
  return (
    backendStateByUserId.get(String(userId)) || createDefaultBackendState()
  );
};

const setBackendStateForUser = (userId, nextState = {}) => {
  if (!userId) return createDefaultBackendState();
  const resolvedState = {
    ...createDefaultBackendState(),
    ...nextState,
    lastError: nextState?.lastError || null,
  };
  backendStateByUserId.set(String(userId), resolvedState);
  return resolvedState;
};

const markBackendAvailable = (userId) =>
  setBackendStateForUser(userId, {
    serverBacked: true,
    backendUnavailable: false,
    lastError: null,
  });

const markBackendUnavailable = (userId, error) =>
  setBackendStateForUser(userId, {
    serverBacked: false,
    backendUnavailable: true,
    lastError: error || null,
  });

const runWithBackendFallback = async (
  userId,
  serverOperation,
  localOperation,
) => {
  const backendState = getBackendStateForUser(userId);

  if (backendState.backendUnavailable) {
    return localOperation();
  }

  try {
    const result = await serverOperation();
    markBackendAvailable(userId);
    return result;
  } catch (error) {
    if (!isEmergencyContactsBackendUnavailableError(error)) {
      throw error;
    }
    markBackendUnavailable(userId, error);
    return localOperation();
  }
};

export const emergencyContactsService = {
  async list(options = {}) {
    const userId = await resolveUserId(options);
    if (!userId) return [];
    return runWithBackendFallback(
      userId,
      () => emergencyContactsApiService.listByUser(userId),
      () => emergencyContactsLocalService.listByUser(userId),
    );
  },

  async create(contact, options = {}) {
    const userId = await requireUserId(options);
    return runWithBackendFallback(
      userId,
      () => emergencyContactsApiService.create(userId, contact),
      () => emergencyContactsLocalService.create(userId, contact),
    );
  },

  async update(id, updates, options = {}) {
    const userId = await requireUserId(options);
    return runWithBackendFallback(
      userId,
      () => emergencyContactsApiService.update(userId, id, updates),
      () => emergencyContactsLocalService.update(userId, id, updates),
    );
  },

  async remove(id, options = {}) {
    const userId = await requireUserId(options);
    return runWithBackendFallback(
      userId,
      () => emergencyContactsApiService.remove(userId, id),
      () => emergencyContactsLocalService.remove(userId, id),
    );
  },

  async readLegacySnapshot() {
    return emergencyContactsMigrationService.readLegacyContacts();
  },

  async getMigrationState(options = {}) {
    const userId = await resolveUserId(options);
    if (!userId) return emergencyContactsMigrationService.getDefaultState();
    return emergencyContactsMigrationService.getMigrationStateForUser(userId);
  },

  async ensureLegacyMigration(options = {}) {
    const userId = await resolveUserId(options);
    if (!userId) return emergencyContactsMigrationService.getDefaultState();

    if (migrationPromises.has(userId)) {
      return migrationPromises.get(userId);
    }

    const promise = emergencyContactsMigrationService
      .migrateLegacyContacts(userId)
      .finally(() => {
        migrationPromises.delete(userId);
      });

    migrationPromises.set(userId, promise);
    return promise;
  },

  async removeSkippedLegacyContact(legacyId, options = {}) {
    const userId = await requireUserId(options);
    return emergencyContactsMigrationService.removeSkippedLegacyContact(
      userId,
      legacyId,
    );
  },

  getBackendState(options = {}) {
    const userId = options?.userId ? String(options.userId) : null;
    return getBackendStateForUser(userId);
  },

  resetBackendState(options = {}) {
    const userId = options?.userId ? String(options.userId) : null;
    if (!userId) return createDefaultBackendState();
    backendStateByUserId.delete(String(userId));
    return getBackendStateForUser(userId);
  },

  subscribe(userId, onEvent) {
    const backendState = getBackendStateForUser(userId);
    if (backendState.backendUnavailable) {
      return { unsubscribe: () => {} };
    }
    return emergencyContactsApiService.subscribe(userId, onEvent);
  },
};

export default emergencyContactsService;
