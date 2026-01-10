import { supabase } from "./supabase";
import { normalizeVisit } from "../utils/domainNormalize";
import { notificationsService } from "./notificationsService";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../constants/notifications";
import { notificationDispatcher } from "./notificationDispatcher";

const TABLE = "visits";

const mapToDb = (item) => {
    const db = { ...item };
    if (item.hospitalId !== undefined) db.hospital_id = item.hospitalId;
    if (item.roomNumber !== undefined) db.room_number = item.roomNumber;
    if (item.estimatedDuration !== undefined) db.estimated_duration = item.estimatedDuration;
    if (item.requestId !== undefined) db.request_id = item.requestId;
    if (item.doctorImage !== undefined) db.doctor_image = item.doctorImage;
    if (item.insuranceCovered !== undefined) db.insurance_covered = item.insuranceCovered;
    if (item.nextVisit !== undefined) db.next_visit = item.nextVisit;
    
    // Remove camelCase keys
    delete db.hospitalId;
    delete db.roomNumber;
    delete db.estimatedDuration;
    delete db.requestId;
    delete db.createdAt;
    delete db.updatedAt;
    delete db.doctorImage;
    delete db.insuranceCovered;
    delete db.nextVisit;
    delete db.visitId;
    
    return db;
};

const mapFromDb = (row) => ({
    ...row,
    hospitalId: row.hospital_id,
    roomNumber: row.room_number,
    estimatedDuration: row.estimated_duration,
    requestId: row.request_id,
    doctorImage: row.doctor_image,
    insuranceCovered: row.insurance_covered,
    nextVisit: row.next_visit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export const visitsService = {
    async list() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("[visitsService] No user logged in");
            return [];
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("[visitsService] Fetch visits error:", error);
            return [];
        }

        console.log(`[visitsService] Fetched ${data?.length ?? 0} visits from database`);
        const result = data.map(mapFromDb).map(v => normalizeVisit(v)).filter(Boolean);
        console.log(`[visitsService] After normalization: ${result.length} visits`);
        return result;
    },

    async create(visit) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const normalized = normalizeVisit(visit);
        const dbItem = mapToDb({ ...normalized, user_id: user.id });
        
        console.log(`[visitsService] Creating visit: ${normalized.id} with status ${normalized.status}`);
        
        const { data, error } = await supabase
            .from(TABLE)
            .insert(dbItem)
            .select()
            .single();

        if (error) {
            console.error(`[visitsService] Create error for ${normalized.id}:`, error);
            throw error;
        }
        
        const result = normalizeVisit(mapFromDb(data));
        console.log(`[visitsService] Visit created successfully: ${result.id}`);
        
        try {
            const visitTypeName = result.type || "Visit";
            const hospitalName = result.hospitalName || "hospital";
            const statusText = result.status === "in_progress" ? "in progress" : result.status || "scheduled";
            
            const notification = {
                id: `notification_${result.id}_${Date.now()}`,
                type: NOTIFICATION_TYPES.VISIT,
                priority: NOTIFICATION_PRIORITY.HIGH,
                title: `${visitTypeName} Scheduled`,
                message: `Your ${visitTypeName.toLowerCase()} at ${hospitalName} is ${statusText}`,
                read: false,
                timestamp: new Date().toISOString(),
                actionType: "navigate",
                actionData: {
                    screen: "visits",
                    visitId: result.id
                }
            };
            
            await notificationsService.create(notification);
            console.log(`[visitsService] Notification created for visit: ${result.id}`);
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit ${result.id}:`, notifError);
        }
        
        return result;
    },

    async update(id, updates) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const dbUpdates = mapToDb(updates);
        dbUpdates.updated_at = new Date().toISOString();

        console.log(`[visitsService] Updating visit ${id}:`, updates);

        const { data, error } = await supabase
            .from(TABLE)
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select();

        if (error) {
            console.error(`[visitsService] Update error for ${id}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            const err = new Error(`Visit with id ${id} not found`);
            console.error(`[visitsService]`, err.message);
            throw err;
        }
        const result = normalizeVisit(mapFromDb(data[0]));
        console.log(`[visitsService] Visit updated: ${result.id} status=${result.status}`);
        
        try {
            await notificationDispatcher.dispatchVisitUpdate(result, 'updated');
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit update ${id}:`, notifError);
        }
        
        return result;
    },

    async cancel(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const dbUpdates = { status: 'cancelled', updated_at: new Date().toISOString() };
        console.log(`[visitsService] Cancelling visit ${id}`);

        const { data, error } = await supabase
            .from(TABLE)
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select();

        if (error) {
            console.error(`[visitsService] Cancel error for ${id}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            const err = new Error(`Visit with id ${id} not found`);
            console.error(`[visitsService]`, err.message);
            throw err;
        }
        const result = normalizeVisit(mapFromDb(data[0]));
        console.log(`[visitsService] Visit cancelled: ${result.id}`);
        
        try {
            await notificationDispatcher.dispatchVisitUpdate(result, 'cancelled');
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit cancellation ${id}:`, notifError);
        }
        
        return result;
    },
    
    async complete(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const dbUpdates = { status: 'completed', updated_at: new Date().toISOString() };
        console.log(`[visitsService] Completing visit ${id}`);

        const { data, error } = await supabase
            .from(TABLE)
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select();

        if (error) {
            console.error(`[visitsService] Complete error for ${id}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            const err = new Error(`Visit with id ${id} not found`);
            console.error(`[visitsService]`, err.message);
            throw err;
        }
        const result = normalizeVisit(mapFromDb(data[0]));
        console.log(`[visitsService] Visit completed: ${result.id}`);
        
        try {
            await notificationDispatcher.dispatchVisitUpdate(result, 'completed');
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit completion ${id}:`, notifError);
        }
        
        return result;
    }
};
