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
  dismissedAt: row.dismissed_at,
  updatedAt: row.updated_at,
});

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
      .is("dismissed_at", null)
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
      .is("dismissed_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error(`[notificationsService] Get by id error for ${id}:`, error);
      throw error;
    }

    return normalizeNotification(mapFromDb(data));
  },

  async create(_notification) {
    // Canonical notifications are emitted by trusted RPCs and database hooks.
    // Authenticated clients intentionally have no INSERT grant.
    return null;
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

  async dismiss(id) {
    if (!id) return false;
    const dismissedCount = await this.dismissMany([id]);
    return dismissedCount > 0;
  },

  async dismissMany(ids) {
    const notificationIds = [
      ...new Set(
        (Array.isArray(ids) ? ids : [ids])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    ];
    if (notificationIds.length === 0) return 0;

    const userId = await requireUserId();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ dismissed_at: now, updated_at: now })
      .eq("user_id", userId)
      .in("id", notificationIds)
      .is("dismissed_at", null)
      .select("id");

    if (error) {
      console.error("[notificationsService] dismissMany error:", error);
      throw error;
    }

    return data?.length || 0;
  },

  async dismissAll() {
    const userId = await requireUserId();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ dismissed_at: now, updated_at: now })
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .select("id");

    if (error) {
      console.error("[notificationsService] dismissAll error:", error);
      throw error;
    }

    return data?.length || 0;
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
