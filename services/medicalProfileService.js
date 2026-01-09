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
        if (updates.notes !== undefined) dbPayload.emergency_notes = updates.notes;

        if (user) {
            const { error } = await supabase
                .from('medical_profiles')
                .update(dbPayload)
                .eq('user_id', user.id);
                
            if (error) console.error("Error updating medical profile:", error);
        }

        // Update Local Cache
		const current = await this.get();
		const next =
			updates && typeof updates === "object"
				? { ...current, ...updates, updatedAt: new Date().toISOString() }
				: { ...current, updatedAt: new Date().toISOString() };
		await database.write(StorageKeys.MEDICAL_PROFILE, next);
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

