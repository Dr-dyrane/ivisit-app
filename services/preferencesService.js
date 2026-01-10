import { supabase } from "./supabase";
import { database, StorageKeys } from "../database";

const DEFAULT_PREFERENCES = {
	demoModeEnabled: true,
	notificationsEnabled: true,
	notificationSoundsEnabled: true,
	appointmentReminders: true,
	emergencyUpdates: true,
	privacyShareMedicalProfile: false,
	privacyShareEmergencyContacts: false,
};

const mapFromDb = (row) => ({
    demoModeEnabled: row.demo_mode_enabled,
    notificationsEnabled: row.notifications_enabled,
    notificationSoundsEnabled: row.notification_sounds_enabled,
    appointmentReminders: row.appointment_reminders,
    emergencyUpdates: row.emergency_updates,
    privacyShareMedicalProfile: row.privacy_share_medical_profile,
    privacyShareEmergencyContacts: row.privacy_share_emergency_contacts,
});

const mapToDb = (prefs) => {
    const db = {};
    if (prefs.demoModeEnabled !== undefined) db.demo_mode_enabled = prefs.demoModeEnabled;
    if (prefs.notificationsEnabled !== undefined) db.notifications_enabled = prefs.notificationsEnabled;
    if (prefs.notificationSoundsEnabled !== undefined) db.notification_sounds_enabled = prefs.notificationSoundsEnabled;
    if (prefs.appointmentReminders !== undefined) db.appointment_reminders = prefs.appointmentReminders;
    if (prefs.emergencyUpdates !== undefined) db.emergency_updates = prefs.emergencyUpdates;
    if (prefs.privacyShareMedicalProfile !== undefined) db.privacy_share_medical_profile = prefs.privacyShareMedicalProfile;
    if (prefs.privacyShareEmergencyContacts !== undefined) db.privacy_share_emergency_contacts = prefs.privacyShareEmergencyContacts;
    return db;
};

export const preferencesService = {
	async getPreferences() {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Fallback to local default if no user (e.g. before login)
        if (!user) return { ...DEFAULT_PREFERENCES };

		const { data, error } = await supabase
            .from('preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.warn("Could not fetch preferences:", error);
            // If row doesn't exist, we might want to return defaults or even insert them
            return { ...DEFAULT_PREFERENCES };
        }

		return { ...DEFAULT_PREFERENCES, ...mapFromDb(data) };
	},

	async updatePreferences(updates) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const dbUpdates = mapToDb(updates);
        dbUpdates.updated_at = new Date().toISOString();

		const { data, error } = await supabase
            .from('preferences')
            .update(dbUpdates)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
             // If update fails because row doesn't exist (e.g. user created before triggers), try upsert
             if (error.code === 'PGRST116' || error.message.includes('not found')) {
                 const { data: upsertData, error: upsertError } = await supabase
                    .from('preferences')
                    .upsert({ user_id: user.id, ...dbUpdates })
                    .select()
                    .single();
                 
                 if (upsertError) throw upsertError;
                 return { ...DEFAULT_PREFERENCES, ...mapFromDb(upsertData) };
             }
             throw error;
        }

		return { ...DEFAULT_PREFERENCES, ...mapFromDb(data) };
	},

	async resetPreferences() {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return { ...DEFAULT_PREFERENCES };

         const defaults = mapToDb(DEFAULT_PREFERENCES);
         defaults.updated_at = new Date().toISOString();

		const { data, error } = await supabase
            .from('preferences')
            .update(defaults)
            .eq('user_id', user.id)
            .select()
            .single();
            
        if (error) throw error;
		return { ...DEFAULT_PREFERENCES, ...mapFromDb(data) };
	},
};
