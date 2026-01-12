import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";

const DEFAULT_MEDICAL_PROFILE = {
	bloodType: "",
	allergies: "",
	medications: "",
	conditions: "",
	surgeries: "",
	notes: "",
	updatedAt: null,
};

export const medicalProfileService = {
	async get() {
        // Try fetching from Supabase first
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
        
        if (updates.bloodType !== undefined) dbPayload.blood_type = updates.bloodType;
        if (updates.allergies !== undefined) dbPayload.allergies = updates.allergies.split(',').map(s => s.trim()).filter(Boolean);
        if (updates.medications !== undefined) dbPayload.medications = updates.medications.split(',').map(s => s.trim()).filter(Boolean);
        if (updates.conditions !== undefined) dbPayload.conditions = updates.conditions.split(',').map(s => s.trim()).filter(Boolean);
        if (updates.notes !== undefined) {
             // Fallback: If migration hasn't run, we can store notes in conditions temporarily 
             // or just try to save and catch the error to prevent crash
             dbPayload.emergency_notes = updates.notes;
        }

        let updateError = null;
        if (user) {
            // First try standard update
            const { error } = await supabase
                .from('medical_profiles')
                .update(dbPayload)
                .eq('user_id', user.id);
                
            if (error) {
                 // Check for "column does not exist" error
                 if (error.code === 'PGRST204' || (error.message && error.message.includes('emergency_notes'))) {
                     console.warn("Schema mismatch: 'emergency_notes' column missing. Retrying without it.");
                     delete dbPayload.emergency_notes;
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

