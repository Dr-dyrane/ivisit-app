import { supabase } from "./supabase";
import {
  normalizeNotification,
  normalizeNotificationsList,
} from "../utils/domainNormalize";

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
  if (item.icon !== undefined) db.icon = item.icon;
  if (item.color !== undefined) db.color = item.color;

  delete db.actionType;
  delete db.actionData;
  delete db.createdAt;
  delete db.updatedAt;

  return db;
};

const resolveUserId = async (options = {}) => {
  if (options?.userId) return String(options.userId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ? String(user.id) : null;
};

const requireUserId = async (options = {}) => {
  const userId = await resolveUserId(options);
  if (!userId) {
    throw new Error("AUTH_REQUIRED|User not logged in");
  }
  return userId;
};

export const notificationsService = {
  async list(options = {}) {
    const userId = await resolveUserId(options);
    if (!userId) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[notificationsService] Fetch notifications error:", error);
      throw error;
    }

    return normalizeNotificationsList((data || []).map(mapFromDb));
  },

  async getById(id, options = {}) {
    if (!id) return null;
    const userId = await resolveUserId(options);
    if (!userId) return null;

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error(`[notificationsService] Get by id error for ${id}:`, error);
      throw error;
    }

    return normalizeNotification(mapFromDb(data));
  },

  async create(notification) {
    const userId = await requireUserId();
    const normalized = normalizeNotification(notification);
    const dbItem = mapToDb({ ...normalized, user_id: userId });

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (dbItem.id) {
      if (typeof dbItem.id !== "string" || !uuidRegex.test(dbItem.id)) {
        delete dbItem.id;
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbItem)
      .select()
      .single();

    if (error) {
      console.error(
        `[notificationsService] Create error for ${normalized.id}:`,
        error,
      );
      throw error;
    }

    return normalizeNotification(mapFromDb(data));
  },

  async markAsRead(id) {
    const userId = await requireUserId();

    const { error } = await supabase
      .from(TABLE)
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(`[notificationsService] markAsRead error for ${id}:`, error);
      throw error;
    }
  },

  async markAllAsRead() {
    const userId = await requireUserId();

    const { error } = await supabase
      .from(TABLE)
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("[notificationsService] markAllAsRead error:", error);
      throw error;
    }
  },

  async delete(id) {
    const userId = await requireUserId();

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error(`[notificationsService] delete error for ${id}:`, error);
      throw error;
    }
  },

  async clearAll() {
    const userId = await requireUserId();

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[notificationsService] clearAll error:", error);
      throw error;
    }
  },

  async deleteOldest(count) {
    const userId = await requireUserId();

    const { data: oldestNotifications, error: fetchError } = await supabase
      .from(TABLE)
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(count);

    if (fetchError) {
      console.error(
        "[notificationsService] deleteOldest fetch error:",
        fetchError,
      );
      throw fetchError;
    }

    if (!oldestNotifications || oldestNotifications.length === 0) {
      return;
    }

    const idsToDelete = oldestNotifications.map((notification) => notification.id);

    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .in("id", idsToDelete)
      .eq("user_id", userId);

    if (deleteError) {
      console.error(
        "[notificationsService] deleteOldest delete error:",
        deleteError,
      );
      throw deleteError;
    }
  },

  subscribe(userId, onEvent) {
    if (!userId || typeof onEvent !== "function") {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(`notifications_${userId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE,
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

export default notificationsService;
