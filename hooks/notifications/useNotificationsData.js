import { useState, useEffect, useCallback } from "react";
import { notificationsService } from "../../services/notificationsService";

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
        } catch (err) {
            console.error("useNotificationsData fetch error:", err);
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
            console.error("useNotificationsData add error:", err);
            throw err;
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error("useNotificationsData markAsRead error:", err);
            throw err;
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("useNotificationsData markAllAsRead error:", err);
            throw err;
        }
    }, []);

    const clearNotification = useCallback(async (id) => {
        try {
            await notificationsService.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("useNotificationsData delete error:", err);
            throw err;
        }
    }, []);

    const clearAllNotifications = useCallback(async () => {
        try {
            await notificationsService.clearAll();
            setNotifications([]);
        } catch (err) {
            console.error("useNotificationsData clearAll error:", err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
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
