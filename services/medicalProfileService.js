import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";

export const DEFAULT_MEDICAL_PROFILE = {
  bloodType: "",
  allergies: "",
  medications: "",
  conditions: "",
  surgeries: "",
  notes: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  organDonor: null,
  updatedAt: null,
};

export function normalizeMedicalProfile(profile) {
  return {
    ...DEFAULT_MEDICAL_PROFILE,
    ...(profile && typeof profile === "object" ? profile : {}),
  };
}

function normalizeTextArray(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : null;
  }
  if (typeof value === "string") {
    const normalized = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : null;
  }
  return null;
}

function normalizeNullableText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = String(value).trim();
  return next.length ? next : null;
}

const resolveUserId = async (options = {}) => {
  if (options?.userId) return String(options.userId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ? String(user.id) : null;
};

const mapRowToProfile = (data = {}) =>
  normalizeMedicalProfile({
    bloodType: data.blood_type || "",
    allergies: Array.isArray(data.allergies)
      ? data.allergies.join(", ")
      : data.allergies || "",
    medications: Array.isArray(data.medications)
      ? data.medications.join(", ")
      : data.medications || "",
    conditions: Array.isArray(data.conditions)
      ? data.conditions.join(", ")
      : data.conditions || "",
    surgeries: "",
    notes: data.emergency_notes || "",
    insuranceProvider: data.insurance_provider || "",
    insurancePolicyNumber: data.insurance_policy_number || "",
    emergencyContactName: data.emergency_contact_name || "",
    emergencyContactPhone: data.emergency_contact_phone || "",
    emergencyContactRelationship: data.emergency_contact_relationship || "",
    organDonor: typeof data.organ_donor === "boolean" ? data.organ_donor : null,
    updatedAt: data.updated_at || null,
  });

export const medicalProfileService = {
  async get(options = {}) {
    // Try fetching from Supabase first
    const userId = await resolveUserId(options);
    if (userId) {
      if (!isValidUUID(userId)) return { ...DEFAULT_MEDICAL_PROFILE };

      const { data, error } = await supabase
        .from("medical_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        const profile = mapRowToProfile(data);

        // Cache it locally
        await database.write(StorageKeys.MEDICAL_PROFILE, profile);
        return profile;
      }
    }

    // Fallback to local storage
    const [cachedSnapshot, stored] = await Promise.all([
      database.read(StorageKeys.MEDICAL_PROFILE_CACHE, null),
      database.read(StorageKeys.MEDICAL_PROFILE, null),
    ]);
    if (cachedSnapshot?.profile && typeof cachedSnapshot.profile === "object") {
      return normalizeMedicalProfile(cachedSnapshot.profile);
    }
    if (!stored || typeof stored !== "object")
      return { ...DEFAULT_MEDICAL_PROFILE };
    return normalizeMedicalProfile(stored);
  },

  async update(updates, options = {}) {
    const userId = await resolveUserId(options);

    // Prepare DB payload
    const dbPayload = {
      updated_at: new Date().toISOString(),
    };

    if (updates.bloodType !== undefined)
      dbPayload.blood_type = normalizeNullableText(updates.bloodType);
    if (updates.allergies !== undefined)
      dbPayload.allergies = normalizeTextArray(updates.allergies);
    if (updates.medications !== undefined)
      dbPayload.medications = normalizeTextArray(updates.medications);
    if (updates.conditions !== undefined)
      dbPayload.conditions = normalizeTextArray(updates.conditions);
    if (updates.notes !== undefined)
      dbPayload.emergency_notes = normalizeNullableText(updates.notes);
    if (updates.insuranceProvider !== undefined) {
      dbPayload.insurance_provider = normalizeNullableText(
        updates.insuranceProvider,
      );
    }
    if (updates.insurancePolicyNumber !== undefined) {
      dbPayload.insurance_policy_number = normalizeNullableText(
        updates.insurancePolicyNumber,
      );
    }
    if (updates.emergencyContactName !== undefined) {
      dbPayload.emergency_contact_name = normalizeNullableText(
        updates.emergencyContactName,
      );
    }
    if (updates.emergencyContactPhone !== undefined) {
      dbPayload.emergency_contact_phone = normalizeNullableText(
        updates.emergencyContactPhone,
      );
    }
    if (updates.emergencyContactRelationship !== undefined) {
      dbPayload.emergency_contact_relationship = normalizeNullableText(
        updates.emergencyContactRelationship,
      );
    }
    if (updates.organDonor !== undefined) {
      dbPayload.organ_donor =
        updates.organDonor === null ? null : !!updates.organDonor;
    }

    let updateError = null;
    if (userId) {
      dbPayload.user_id = userId;

      // Upsert guarantees row creation if bootstrap trigger missed the profile row.
      const { error } = await supabase
        .from("medical_profiles")
        .upsert(dbPayload, { onConflict: "user_id" });

      if (error) {
        // Check for "column does not exist" error
        if (
          error.code === "PGRST204" ||
          (error.message && error.message.includes("emergency_notes"))
        ) {
          console.warn(
            "Schema mismatch: 'emergency_notes' column missing. Retrying without it.",
          );
          delete dbPayload.emergency_notes;
          delete dbPayload.user_id;
          // Retry update without the problematic column
          const { error: retryError } = await supabase
            .from("medical_profiles")
            .update(dbPayload)
            .eq("user_id", userId);

          if (retryError) {
            console.error(
              "Error updating medical profile (retry):",
              retryError,
            );
            updateError = retryError;
          }
        } else {
          console.error("Error updating medical profile:", error);
          updateError = error;
        }
      }
    }

    // Update Local Cache regardless of DB error (for offline support)
    const current = await this.get();
    const next =
      updates && typeof updates === "object"
        ? normalizeMedicalProfile({
            ...current,
            ...updates,
            updatedAt: new Date().toISOString(),
          })
        : normalizeMedicalProfile({
            ...current,
            updatedAt: new Date().toISOString(),
          });
    await database.write(StorageKeys.MEDICAL_PROFILE, next);

    // Throw error if DB update failed but cache succeeded
    if (updateError) {
      const syncError = new Error(
        `Database update failed: ${updateError.message}`,
      );
      syncError.localSaved = true;
      syncError.nextProfile = next;
      throw syncError;
    }

    return next;
  },

  async reset() {
    // We probably don't want to delete from DB on reset, just clear local?
    // Or actually clear DB fields.
    const next = {
      ...DEFAULT_MEDICAL_PROFILE,
      updatedAt: new Date().toISOString(),
    };
    await database.write(StorageKeys.MEDICAL_PROFILE, next);
    return next;
  },

  subscribe(userId, onEvent) {
    if (!userId || typeof onEvent !== "function") {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(`medical_profile_${userId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medical_profiles",
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
