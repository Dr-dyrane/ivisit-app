import { database, StorageKeys } from "../database";
import { isValidName, isValidPhone } from "../utils/validation";
import {
  emergencyContactsApiService,
  buildEmergencyContactSignature,
  isEmergencyContactsBackendUnavailableError,
  sortEmergencyContacts,
} from "./emergencyContactsApiService";
import { emergencyContactsLocalService } from "./emergencyContactsLocalService";

// PULLBACK NOTE: EmergencyContacts five-layer pass - legacy migration adapter.
// Owns: reading legacy storage, partitioning migratable vs skipped rows, and persisting migration metadata.
// Does NOT own: screen presentation of migration review; UI reads the resulting metadata through the store.

const DEFAULT_MIGRATION_STATE = {
  status: "idle",
  lastMigratedAt: null,
  migratedCount: 0,
  legacyItemCount: 0,
  skippedLegacyContacts: [],
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalText = (value) => {
  const next = normalizeText(value);
  return next.length > 0 ? next : null;
};

const hasLegacySignal = (contact) =>
  Boolean(
    normalizeText(contact?.name) ||
    normalizeText(contact?.relationship) ||
    normalizeText(contact?.phone) ||
    normalizeText(contact?.email),
  );

const normalizeLegacyContact = (contact, index = 0) => {
  const name = normalizeText(contact?.name);
  const relationship = normalizeOptionalText(contact?.relationship);
  const phone = normalizeOptionalText(contact?.phone);
  const email = normalizeOptionalText(contact?.email)?.toLowerCase() ?? null;
  const legacyId =
    contact?.id != null
      ? String(contact.id)
      : `legacy_contact_${index}_${name || "contact"}`;

  return {
    legacyId,
    name,
    relationship,
    phone,
    email,
    createdAt: contact?.createdAt ? String(contact.createdAt) : null,
    updatedAt: contact?.updatedAt ? String(contact.updatedAt) : null,
  };
};

const buildSkippedReason = (contact) => {
  if (!isValidName(contact?.name)) return "needs_name";
  if (!contact?.phone) return "needs_phone";
  if (!isValidPhone(contact.phone)) return "invalid_phone";
  return "needs_review";
};

const normalizeMigrationRecord = (record = {}) => ({
  status:
    record?.status === "completed" ||
    record?.status === "partial" ||
    record?.status === "error" ||
    record?.status === "migrating"
      ? record.status
      : DEFAULT_MIGRATION_STATE.status,
  lastMigratedAt: record?.lastMigratedAt ? String(record.lastMigratedAt) : null,
  migratedCount: Number.isFinite(Number(record?.migratedCount))
    ? Number(record.migratedCount)
    : 0,
  legacyItemCount: Number.isFinite(Number(record?.legacyItemCount))
    ? Number(record.legacyItemCount)
    : 0,
  skippedLegacyContacts: Array.isArray(record?.skippedLegacyContacts)
    ? record.skippedLegacyContacts
        .map((item, index) => normalizeLegacyContact(item, index))
        .filter(hasLegacySignal)
    : [],
});

const normalizeMetadata = (value) => {
  if (!value || typeof value !== "object") return { users: {} };
  return {
    users: value.users && typeof value.users === "object" ? value.users : {},
  };
};

const readMetadata = async () =>
  normalizeMetadata(
    await database.read(StorageKeys.EMERGENCY_CONTACTS_MIGRATION, null),
  );

const writeMetadata = async (metadata) => {
  await database.write(StorageKeys.EMERGENCY_CONTACTS_MIGRATION, metadata);
  return metadata;
};

const writeMigrationStateForUser = async (userId, nextState) => {
  const metadata = await readMetadata();
  metadata.users[String(userId)] = normalizeMigrationRecord(nextState);
  await writeMetadata(metadata);
  return metadata.users[String(userId)];
};

const removeSkippedLegacyContactById = (contacts, legacyId) =>
  (Array.isArray(contacts) ? contacts : []).filter(
    (contact) => String(contact?.legacyId) !== String(legacyId),
  );

const removeLegacyContactFromStorage = async (userId, legacyId) => {
  const raw = await database.read(StorageKeys.EMERGENCY_CONTACTS, []);
  if (!Array.isArray(raw)) return;

  const filtered = raw.filter((contact, index) => {
    if (
      userId &&
      contact?.userId &&
      String(contact.userId) !== String(userId)
    ) {
      return true;
    }
    return (
      String(normalizeLegacyContact(contact, index).legacyId) !==
      String(legacyId)
    );
  });

  if (filtered.length !== raw.length) {
    await database.write(StorageKeys.EMERGENCY_CONTACTS, filtered);
  }
};

export const emergencyContactsMigrationService = {
  getDefaultState() {
    return { ...DEFAULT_MIGRATION_STATE };
  },

  async readLegacyContacts(userId = null) {
    const raw = await database.read(StorageKeys.EMERGENCY_CONTACTS, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) =>
        userId ? !item?.userId || String(item.userId) === String(userId) : true,
      )
      .map((item, index) => normalizeLegacyContact(item, index))
      .filter(hasLegacySignal);
  },

  async getMigrationStateForUser(userId) {
    if (!userId) return { ...DEFAULT_MIGRATION_STATE };
    const metadata = await readMetadata();
    return normalizeMigrationRecord(
      metadata.users[String(userId)] || DEFAULT_MIGRATION_STATE,
    );
  },

  async migrateLegacyContacts(userId) {
    if (!userId) return { ...DEFAULT_MIGRATION_STATE };

    const legacyContacts = await this.readLegacyContacts(userId);
    const migratable = [];
    const skippedLegacyContacts = [];

    legacyContacts.forEach((contact) => {
      if (!hasLegacySignal(contact)) return;
      if (
        isValidName(contact.name) &&
        contact.phone &&
        isValidPhone(contact.phone)
      ) {
        migratable.push(contact);
        return;
      }
      skippedLegacyContacts.push({
        ...contact,
        reason: buildSkippedReason(contact),
      });
    });

    let existingBySignature;
    let migratedCount = 0;

    try {
      const existingContacts =
        await emergencyContactsApiService.listByUser(userId);
      existingBySignature = new Map(
        existingContacts.map((contact) => [
          buildEmergencyContactSignature(contact),
          contact,
        ]),
      );

      for (const contact of migratable) {
        const signature = buildEmergencyContactSignature(contact);
        // Signature matching keeps repeated launches from duplicating pre-existing legacy contacts.
        if (existingBySignature.has(signature)) continue;
        const created = await emergencyContactsApiService.create(userId, {
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          isPrimary: false,
          isActive: true,
        });
        existingBySignature.set(signature, created);
        migratedCount += 1;
      }
    } catch (error) {
      if (!isEmergencyContactsBackendUnavailableError(error)) {
        throw error;
      }

      // Preserve a usable canonical list when the backend contract is not live yet.
      const fallbackContacts =
        await emergencyContactsLocalService.listByUser(userId);
      const nextState = normalizeMigrationRecord({
        status: skippedLegacyContacts.length > 0 ? "partial" : "completed",
        lastMigratedAt: null,
        migratedCount: 0,
        legacyItemCount: legacyContacts.length,
        skippedLegacyContacts,
      });

      await writeMigrationStateForUser(userId, nextState);

      return {
        ...nextState,
        contacts: fallbackContacts,
        serverBacked: false,
        backendUnavailable: true,
      };
    }

    const nextState = normalizeMigrationRecord({
      status: skippedLegacyContacts.length > 0 ? "partial" : "completed",
      lastMigratedAt: new Date().toISOString(),
      migratedCount,
      legacyItemCount: legacyContacts.length,
      skippedLegacyContacts,
    });

    await writeMigrationStateForUser(userId, nextState);

    return {
      ...nextState,
      contacts: sortEmergencyContacts(Array.from(existingBySignature.values())),
      serverBacked: true,
      backendUnavailable: false,
    };
  },

  async removeSkippedLegacyContact(userId, legacyId) {
    if (!userId) return { ...DEFAULT_MIGRATION_STATE };
    const current = await this.getMigrationStateForUser(userId);
    const skippedLegacyContacts = removeSkippedLegacyContactById(
      current.skippedLegacyContacts,
      legacyId,
    );
    await removeLegacyContactFromStorage(userId, legacyId);
    const nextState = normalizeMigrationRecord({
      ...current,
      status: skippedLegacyContacts.length > 0 ? "partial" : "completed",
      skippedLegacyContacts,
    });
    await writeMigrationStateForUser(userId, nextState);
    return nextState;
  },
};

export default emergencyContactsMigrationService;
