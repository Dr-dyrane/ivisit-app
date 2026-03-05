import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";

const DEFAULT_MEDICAL_PROFILE = {
    bloodType: "",
    allergies: "",
    medications: "",
    conditions: "",
    surgeries: "",
    notes: "",
    updatedAt: null,
};

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

export const medicalProfileService = {
    async get() {
        // Try fetching from Supabase first
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            if (!isValidUUID(user.id)) return { ...DEFAULT_MEDICAL_PROFILE };

            const { data, error } = await supabase
                .from('medical_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                // Map DB columns to App fields
                const profile = {
                    bloodType: data.blood_type || "",
                    allergies: Array.isArray(data.allergies) ? data.allergies.join(", ") : (data.allergies || ""),
                    medications: Array.isArray(data.medications) ? data.medications.join(", ") : (data.medications || ""),
                    conditions: Array.isArray(data.conditions) ? data.conditions.join(", ") : (data.conditions || ""),
                    surgeries: "", // Surgeries field not in DB yet, keeping local or adding to notes
                    notes: data.emergency_notes || "",
                    updatedAt: data.updated_at
                };

                // Cache it locally
                await database.write(StorageKeys.MEDICAL_PROFILE, profile);
                return profile;
            }
        }

        // Fallback to local storage
        const stored = await database.read(StorageKeys.MEDICAL_PROFILE, null);
        if (!stored || typeof stored !== "object") return { ...DEFAULT_MEDICAL_PROFILE };
        return { ...DEFAULT_MEDICAL_PROFILE, ...stored };
    },

    async update(updates) {
        const { data: { user } } = await supabase.auth.getUser();

        // Prepare DB payload
        const dbPayload = {
            updated_at: new Date().toISOString()
        };

        if (updates.bloodType !== undefined) dbPayload.blood_type = normalizeNullableText(updates.bloodType);
        if (updates.allergies !== undefined) dbPayload.allergies = normalizeTextArray(updates.allergies);
        if (updates.medications !== undefined) dbPayload.medications = normalizeTextArray(updates.medications);
        if (updates.conditions !== undefined) dbPayload.conditions = normalizeTextArray(updates.conditions);
        if (updates.notes !== undefined) dbPayload.emergency_notes = normalizeNullableText(updates.notes);
        if (updates.insuranceProvider !== undefined) {
            dbPayload.insurance_provider = normalizeNullableText(updates.insuranceProvider);
        }
        if (updates.insurancePolicyNumber !== undefined) {
            dbPayload.insurance_policy_number = normalizeNullableText(updates.insurancePolicyNumber);
        }
        if (updates.emergencyContactName !== undefined) {
            dbPayload.emergency_contact_name = normalizeNullableText(updates.emergencyContactName);
        }
        if (updates.emergencyContactPhone !== undefined) {
            dbPayload.emergency_contact_phone = normalizeNullableText(updates.emergencyContactPhone);
        }
        if (updates.emergencyContactRelationship !== undefined) {
            dbPayload.emergency_contact_relationship = normalizeNullableText(updates.emergencyContactRelationship);
        }
        if (updates.organDonor !== undefined) {
            dbPayload.organ_donor = updates.organDonor === null ? null : !!updates.organDonor;
        }

        let updateError = null;
        if (user) {
            dbPayload.user_id = user.id;

            // Upsert guarantees row creation if bootstrap trigger missed the profile row.
            const { error } = await supabase
                .from('medical_profiles')
                .upsert(dbPayload, { onConflict: 'user_id' });

            if (error) {
                // Check for "column does not exist" error
                if (error.code === 'PGRST204' || (error.message && error.message.includes('emergency_notes'))) {
                    console.warn("Schema mismatch: 'emergency_notes' column missing. Retrying without it.");
                    delete dbPayload.emergency_notes;
                    delete dbPayload.user_id;
                    // Retry update without the problematic column
                    const { error: retryError } = await supabase
                        .from('medical_profiles')
                        .update(dbPayload)
                        .eq('user_id', user.id);

                    if (retryError) {
                        console.error("Error updating medical profile (retry):", retryError);
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
                ? { ...current, ...updates, updatedAt: new Date().toISOString() }
                : { ...current, updatedAt: new Date().toISOString() };
        await database.write(StorageKeys.MEDICAL_PROFILE, next);

        // Throw error if DB update failed but cache succeeded
        if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
        }

        return next;
    },

    async reset() {
        // We probably don't want to delete from DB on reset, just clear local?
        // Or actually clear DB fields.
        const next = { ...DEFAULT_MEDICAL_PROFILE, updatedAt: new Date().toISOString() };
        await database.write(StorageKeys.MEDICAL_PROFILE, next);
        return next;
    },
};

