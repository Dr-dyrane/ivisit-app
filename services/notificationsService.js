import { supabase } from "./supabase";
import { normalizeNotification } from "../utils/domainNormalize";

const TABLE = "notifications";

const mapFromDb = (row) => ({
    ...row,
    actionType: row.action_type,
    actionData: row.action_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapToDb = (item) => {
    const db = { ...item };
    if (item.actionType !== undefined) db.action_type = item.actionType;
    if (item.actionData !== undefined) db.action_data = item.actionData;
    
    // Remove camelCase keys
    delete db.actionType;
    delete db.actionData;
    delete db.createdAt;
    delete db.updatedAt;
    
    return db;
};

export const notificationsService = {
    async list() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return [];
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("[notificationsService] Fetch notifications error:", error);
            return [];
        }

        const result = data.map(mapFromDb).map(n => normalizeNotification(n)).filter(Boolean);
        return result;
    },

    async create(notification) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");

        const normalized = normalizeNotification(notification);
        const dbItem = mapToDb({ ...normalized, user_id: user.id });

        const { data, error } = await supabase
            .from(TABLE)
            .insert(dbItem)
            .select()
            .single();

        if (error) {
            console.error(`[notificationsService] Create error for ${normalized.id}:`, error);
            throw error;
        }
        
        const result = normalizeNotification(mapFromDb(data));
        return result;
    },

    async markAsRead(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from(TABLE)
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error(`[notificationsService] markAsRead error for ${id}:`, error);
            throw error;
        }
    },

    async markAllAsRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from(TABLE)
            .update({ read: true, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('read', false);

        if (error) {
            console.error("[notificationsService] markAllAsRead error:", error);
            throw error;
        }
    },

    async delete(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error(`[notificationsService] delete error for ${id}:`, error);
            throw error;
        }
    },

    async clearAll() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error("[notificationsService] clearAll error:", error);
            throw error;
        }
    },

    async deleteOldest(count) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: oldestNotifications, error: fetchError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(count);

        if (fetchError) {
            console.error("[notificationsService] deleteOldest fetch error:", fetchError);
            throw fetchError;
        }

        if (!oldestNotifications || oldestNotifications.length === 0) {
            return;
        }

        const idsToDelete = oldestNotifications.map(n => n.id);

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .in('id', idsToDelete)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error("[notificationsService] deleteOldest delete error:", deleteError);
            throw deleteError;
        }
    }
};
