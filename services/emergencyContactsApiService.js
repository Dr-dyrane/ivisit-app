import { supabase } from "./supabase";
import { isValidName, isValidPhone, isValidUUID } from "../utils/validation";

// PULLBACK NOTE: EmergencyContacts five-layer pass - canonical Supabase adapter.
// Owns: row mapping, input normalization, CRUD, and realtime channel subscription for `public.emergency_contacts`.
// Does NOT own: local fallback policy or migration metadata.

const TABLE_NAME = "emergency_contacts";
const SELECT_FIELDS = [
  "id",
  "user_id",
  "display_id",
  "name",
  "relationship",
  "phone",
  "is_primary",
  "is_active",
  "created_at",
  "updated_at",
].join(", ");

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalText = (value) => {
  const next = normalizeText(value);
  return next.length > 0 ? next : null;
};

const toBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export const isEmergencyContactsBackendUnavailableError = (error) =>
  error?.code === "PGRST205" ||
  (typeof error?.message === "string" &&
    error.message.includes("public.emergency_contacts") &&
    error.message.includes("schema cache"));

export const sortEmergencyContacts = (contacts = []) =>
  [...(Array.isArray(contacts) ? contacts : [])].sort((a, b) => {
    const primaryDelta =
      Number(b?.isPrimary === true) - Number(a?.isPrimary === true);
    if (primaryDelta !== 0) return primaryDelta;
    return String(b?.updatedAt ?? "").localeCompare(String(a?.updatedAt ?? ""));
  });

export const mapEmergencyContactRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const phone = normalizeText(row.phone);
  if (!phone) return null;

  return {
    id: row.id ? String(row.id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    displayId: row.display_id ? String(row.display_id) : null,
    name: normalizeText(row.name),
    relationship: normalizeOptionalText(row.relationship),
    phone,
    isPrimary: row.is_primary === true,
    isActive: row.is_active !== false,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at
      ? String(row.updated_at)
      : row.created_at
        ? String(row.created_at)
        : null,
  };
};

export const normalizeEmergencyContactInput = (input = {}, options = {}) => {
  const allowInvalid = options.allowInvalid === true;
  const normalized = {
    name: normalizeText(input?.name),
    relationship: normalizeOptionalText(input?.relationship),
    phone: normalizeOptionalText(input?.phone),
    isPrimary: toBoolean(input?.isPrimary, false),
    isActive: input?.isActive === false ? false : true,
  };

  if (!allowInvalid) {
    if (!isValidName(normalized.name)) {
      throw new Error("INVALID_INPUT|Name is required");
    }
    if (!normalized.phone || !isValidPhone(normalized.phone)) {
      throw new Error("INVALID_INPUT|A valid phone number is required");
    }
  }

  return normalized;
};

export const buildEmergencyContactSignature = (contact) => {
  const normalized = normalizeEmergencyContactInput(contact, {
    allowInvalid: true,
  });
  return [
    normalized.name.toLowerCase(),
    String(normalized.relationship || "").toLowerCase(),
    String(normalized.phone || ""),
  ].join("|");
};

const createPayload = (userId, input = {}) => {
  if (!userId || !isValidUUID(String(userId))) {
    throw new Error("AUTH_REQUIRED|User not logged in");
  }
  // All server writes re-run through the same canonical normalizer so local optimistic shape and server shape stay aligned.
  const normalized = normalizeEmergencyContactInput(input);
  return {
    user_id: userId,
    name: normalized.name,
    relationship: normalized.relationship,
    phone: normalized.phone,
    is_primary: normalized.isPrimary,
    is_active: normalized.isActive,
  };
};

async function selectContactById(userId, contactId) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .eq("id", contactId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return mapEmergencyContactRow(data);
}

export const emergencyContactsApiService = {
  mapRow: mapEmergencyContactRow,
  normalizeInput: normalizeEmergencyContactInput,
  buildSignature: buildEmergencyContactSignature,

  async listByUser(userId) {
    if (!userId || !isValidUUID(String(userId))) return [];

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(SELECT_FIELDS)
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return sortEmergencyContacts(
      (data || []).map(mapEmergencyContactRow).filter(Boolean),
    );
  },

  async getById(userId, contactId) {
    if (!contactId) return null;
    return selectContactById(userId, contactId);
  },

  async create(userId, input) {
    const payload = createPayload(userId, input);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;

    return mapEmergencyContactRow(data);
  },

  async update(userId, contactId, updates = {}) {
    if (!contactId) throw new Error("NOT_FOUND|Contact not found");

    const current = await selectContactById(userId, contactId);
    if (!current) throw new Error("NOT_FOUND|Contact not found");

    const payload = createPayload(userId, {
      ...current,
      ...updates,
      isPrimary:
        updates?.isPrimary !== undefined
          ? updates.isPrimary
          : current.isPrimary,
      isActive:
        updates?.isActive !== undefined ? updates.isActive : current.isActive,
    });

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq("user_id", userId)
      .eq("id", contactId)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;

    return mapEmergencyContactRow(data);
  },

  async remove(userId, contactId) {
    if (!contactId) return true;

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("user_id", userId)
      .eq("id", contactId);

    if (error) throw error;
    return true;
  },

  subscribe(userId, onEvent) {
    if (!userId || typeof onEvent !== "function") {
      return { unsubscribe: () => {} };
    }

    // Unique channel names prevent stale listeners from colliding across auth/user switches in dev.
    const channel = supabase
      .channel(`emergency_contacts_${userId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE_NAME,
          filter: `user_id=eq.${userId}`,
        },
        onEvent,
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },
};

export default emergencyContactsApiService;
