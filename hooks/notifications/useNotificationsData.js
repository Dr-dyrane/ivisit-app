import { useState, useEffect, useCallback } from "react";
import { notificationsService } from "../../services/notificationsService";
import { supabase } from "../../services/supabase";

/**
 * Hook to manage notifications data
 * @returns {Object} { notifications, isLoading, error, refetch, addNotification, markAsRead, markAllAsRead, clearNotification, clearAllNotifications }
 */
export function useNotificationsData() {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await notificationsService.list();
            console.log('[useNotificationsData] Fetched notifications:', data.length, 'items');
            setNotifications(data);
            setError(null);
        } catch (err) {
            console.error("[useNotificationsData] fetch error:", err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addNotification = useCallback(async (notification) => {
        try {
            console.log('[useNotificationsData] Adding notification:', notification.id, notification.title);
            const newItem = await notificationsService.create(notification);
            console.log('[useNotificationsData] Notification added successfully:', newItem.id);
            setNotifications(prev => [newItem, ...prev]);
            return newItem;
        } catch (err) {
            console.error("[useNotificationsData] add error:", err);
            throw err;
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            console.log('[useNotificationsData] Marking notification as read:', id);
            await notificationsService.markAsRead(id);
            console.log('[useNotificationsData] Notification marked as read:', id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("[useNotificationsData] markAsRead error for", id, ":", err);
            throw err;
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            console.log('[useNotificationsData] Marking all notifications as read');
            await notificationsService.markAllAsRead();
            console.log('[useNotificationsData] All notifications marked as read');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("[useNotificationsData] markAllAsRead error:", err);
            throw err;
        }
    }, []);

    const clearNotification = useCallback(async (id) => {
        try {
            console.log('[useNotificationsData] Deleting notification:', id);
            await notificationsService.delete(id);
            console.log('[useNotificationsData] Notification deleted:', id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("[useNotificationsData] delete error for", id, ":", err);
            throw err;
        }
    }, []);

    const clearAllNotifications = useCallback(async () => {
        try {
            console.log('[useNotificationsData] Clearing all notifications');
            await notificationsService.clearAll();
            console.log('[useNotificationsData] All notifications cleared');
            setNotifications([]);
        } catch (err) {
            console.error("[useNotificationsData] clearAll error:", err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        let subscription;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            subscription = supabase
                .channel('notifications_updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('[useNotificationsData] Real-time update:', payload.eventType, payload.new?.id);
                        fetchNotifications();
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, [fetchNotifications]);

    return {
        notifications,
        isLoading,
        error,
        refetch: fetchNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications
    };
}
