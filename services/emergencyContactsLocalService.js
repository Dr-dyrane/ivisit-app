import { v4 as uuidv4 } from "uuid";
import { database, StorageKeys } from "../database";
import { isValidName, isValidPhone } from "../utils/validation";
import {
  normalizeEmergencyContactInput,
  sortEmergencyContacts,
} from "./emergencyContactsApiService";

// PULLBACK NOTE: EmergencyContacts backend-unavailable compatibility lane.
// Owns: canonical local CRUD shape when server truth is temporarily unavailable.
// Does NOT own: deciding when fallback mode is active; the facade service owns that policy.

const STORAGE_KEY = StorageKeys.EMERGENCY_CONTACTS;

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

const buildFallbackId = (contact, index = 0) => {
  const phone = normalizeOptionalText(contact?.phone) || "no-phone";
  const name = normalizeText(contact?.name).toLowerCase() || "contact";
  const relationship =
    normalizeOptionalText(contact?.relationship)?.toLowerCase() || "none";
  return `legacy_${name}_${relationship}_${phone}_${index}`;
};

const mapLocalRecord = (record, userId, index = 0) => {
  const name = normalizeText(record?.name);
  const relationship = normalizeOptionalText(record?.relationship);
  const phone = normalizeOptionalText(record?.phone);

  if (!isValidName(name) || !phone || !isValidPhone(phone)) {
    return null;
  }

  return {
    id: record?.id ? String(record.id) : buildFallbackId(record, index),
    userId: record?.userId ? String(record.userId) : String(userId),
    displayId: record?.displayId ? String(record.displayId) : null,
    name,
    relationship,
    phone,
    isPrimary: record?.isPrimary === true,
    isActive: record?.isActive !== false,
    createdAt: record?.createdAt ? String(record.createdAt) : null,
    updatedAt: record?.updatedAt
      ? String(record.updatedAt)
      : record?.createdAt
        ? String(record.createdAt)
        : null,
  };
};

const serializeLocalContact = (contact, userId) => ({
  id: String(contact.id),
  userId: String(userId),
  displayId: contact?.displayId ? String(contact.displayId) : null,
  name: normalizeText(contact?.name),
  relationship: normalizeOptionalText(contact?.relationship),
  phone: normalizeOptionalText(contact?.phone),
  isPrimary: contact?.isPrimary === true,
  isActive: contact?.isActive !== false,
  createdAt: contact?.createdAt ? String(contact.createdAt) : null,
  updatedAt: contact?.updatedAt ? String(contact.updatedAt) : null,
});

const readRawContacts = async () => {
  const raw = await database.read(STORAGE_KEY, []);
  return Array.isArray(raw) ? raw : [];
};

const partitionContacts = (rawContacts, userId) => {
  const foreignContacts = [];
  const skippedLegacyContacts = [];
  const canonicalContacts = [];

  rawContacts.forEach((record, index) => {
    // Preserve foreign-user rows while still treating the storage bucket as a shared legacy artifact.
    if (record?.userId && String(record.userId) !== String(userId)) {
      foreignContacts.push(record);
      return;
    }

    const mapped = mapLocalRecord(record, userId, index);
    if (mapped) {
      canonicalContacts.push(mapped);
      return;
    }

    if (hasLegacySignal(record)) {
      skippedLegacyContacts.push(record);
    }
  });

  return {
    foreignContacts,
    skippedLegacyContacts,
    canonicalContacts: sortEmergencyContacts(canonicalContacts),
  };
};

const writeCanonicalContacts = async (
  userId,
  nextCanonicalContacts,
  partition,
) => {
  const persistedContacts = sortEmergencyContacts(
    Array.isArray(nextCanonicalContacts)
      ? nextCanonicalContacts.filter(Boolean)
      : [],
  ).map((contact) => serializeLocalContact(contact, userId));

  await database.write(STORAGE_KEY, [
    ...(Array.isArray(partition?.foreignContacts)
      ? partition.foreignContacts
      : []),
    ...(Array.isArray(partition?.skippedLegacyContacts)
      ? partition.skippedLegacyContacts
      : []),
    ...persistedContacts,
  ]);

  return persistedContacts;
};

export const emergencyContactsLocalService = {
  async listByUser(userId) {
    if (!userId) return [];
    const rawContacts = await readRawContacts();
    return partitionContacts(rawContacts, userId).canonicalContacts;
  },

  async create(userId, input = {}) {
    if (!userId) {
      throw new Error("AUTH_REQUIRED|User not logged in");
    }

    const normalized = normalizeEmergencyContactInput(input);
    const rawContacts = await readRawContacts();
    const partition = partitionContacts(rawContacts, userId);
    const timestamp = new Date().toISOString();
    const createdContact = {
      id: uuidv4(),
      userId: String(userId),
      displayId: null,
      name: normalized.name,
      relationship: normalized.relationship,
      phone: normalized.phone,
      isPrimary: normalized.isPrimary,
      isActive: normalized.isActive,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await writeCanonicalContacts(
      userId,
      [createdContact, ...partition.canonicalContacts],
      partition,
    );

    return createdContact;
  },

  async update(userId, contactId, updates = {}) {
    if (!userId) {
      throw new Error("AUTH_REQUIRED|User not logged in");
    }
    if (!contactId) {
      throw new Error("NOT_FOUND|Contact not found");
    }

    const rawContacts = await readRawContacts();
    const partition = partitionContacts(rawContacts, userId);
    const existingContact = partition.canonicalContacts.find(
      (contact) => String(contact?.id) === String(contactId),
    );

    if (!existingContact) {
      throw new Error("NOT_FOUND|Contact not found");
    }

    const normalized = normalizeEmergencyContactInput({
      ...existingContact,
      ...updates,
      isPrimary:
        updates?.isPrimary !== undefined
          ? updates.isPrimary
          : existingContact.isPrimary,
      isActive:
        updates?.isActive !== undefined
          ? updates.isActive
          : existingContact.isActive,
    });

    const updatedContact = {
      ...existingContact,
      ...normalized,
      updatedAt: new Date().toISOString(),
    };

    await writeCanonicalContacts(
      userId,
      partition.canonicalContacts.map((contact) =>
        String(contact?.id) === String(contactId) ? updatedContact : contact,
      ),
      partition,
    );

    return updatedContact;
  },

  async remove(userId, contactId) {
    if (!userId || !contactId) return true;

    const rawContacts = await readRawContacts();
    const partition = partitionContacts(rawContacts, userId);
    const nextContacts = partition.canonicalContacts.filter(
      (contact) => String(contact?.id) !== String(contactId),
    );

    await writeCanonicalContacts(userId, nextContacts, partition);
    return true;
  },
};

export default emergencyContactsLocalService;
