import { useState, useEffect, useCallback } from "react";
import { notificationsService } from "../../services/notificationsService";
import { supabase } from "../../services/supabase";
import { hapticService } from "../../services/hapticService";
import { soundService } from "../../services/soundService";

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
            const newItem = await notificationsService.create(notification);
            setNotifications(prev => [newItem, ...prev]);
            return newItem;
        } catch (err) {
            console.error("[useNotificationsData] add error:", err);
            throw err;
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("[useNotificationsData] markAsRead error for", id, ":", err);
            throw err;
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("[useNotificationsData] markAllAsRead error:", err);
            throw err;
        }
    }, []);

    const clearNotification = useCallback(async (id) => {
        try {
            await notificationsService.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("[useNotificationsData] delete error for", id, ":", err);
            throw err;
        }
    }, []);

    const clearAllNotifications = useCallback(async () => {
        try {
            await notificationsService.clearAll();
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
        const MAX_NOTIFICATIONS = 50;
        
        const cleanupOldNotifications = async () => {
            if (notifications.length > MAX_NOTIFICATIONS) {
                const excessCount = notifications.length - MAX_NOTIFICATIONS;
                try {
                    await notificationsService.deleteOldest(excessCount);
                } catch (err) {
                    console.error("[useNotificationsData] cleanup error:", err);
                }
            }
        };

        cleanupOldNotifications();
    }, [notifications.length]);

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
                        if (payload.eventType === 'INSERT') {
                            const newNotification = payload.new;
                            setNotifications(prev => [newNotification, ...prev]);
                            hapticService.triggerForPriority(newNotification.priority);
                            soundService.playForPriority(newNotification.priority);
                        } 
                        else if (payload.eventType === 'UPDATE') {
                            const updatedNotification = payload.new;
                            setNotifications(prev => 
                                prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
                            );
                        } 
                        else if (payload.eventType === 'DELETE') {
                            const deletedId = payload.old.id;
                            setNotifications(prev => prev.filter(n => n.id !== deletedId));
                        }
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

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
