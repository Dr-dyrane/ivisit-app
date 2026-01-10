// contexts/NotificationsContext.jsx - Notifications state management

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { NOTIFICATION_FILTERS, NOTIFICATION_TYPES } from "../constants/notifications";
import { useNotificationsData } from "../hooks/notifications/useNotificationsData";
import { usePushNotifications } from "../hooks/notifications/usePushNotifications";

// Create the notifications context
const NotificationsContext = createContext();

// Notifications provider component
export function NotificationsProvider({ children }) {
    const { expoPushToken } = usePushNotifications();
    const { 
        notifications, 
        isLoading, 
        addNotification, 
        markAsRead, 
        markAllAsRead, 
        clearNotification, 
        clearAllNotifications,
        refetch: refreshNotifications
    } = useNotificationsData();

    const [filter, setFilter] = useState("all");

    // Derived state
    const unreadCount = useMemo(() => {
        return notifications.filter((n) => !n.read).length;
    }, [notifications]);

    // Derived: Filtered notifications
    const filteredNotifications = useMemo(() => {
        const list = notifications.filter(n => n && typeof n === "object");
        switch (filter) {
            case "unread":
                return list.filter(n => n.read !== true);
            case "emergency":
                return list.filter(n => n.type === NOTIFICATION_TYPES.EMERGENCY);
            case "appointments":
                return list.filter(n => 
                    n.type === NOTIFICATION_TYPES.APPOINTMENT || 
                    n.type === NOTIFICATION_TYPES.VISIT
                );
            default:
                return list;
        }
    }, [notifications, filter]);

    // Derived: Counts per filter
    const filterCounts = useMemo(() => ({
        all: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        emergency: notifications.filter(n => n.type === NOTIFICATION_TYPES.EMERGENCY).length,
        appointments: notifications.filter(n => 
            n.type === NOTIFICATION_TYPES.APPOINTMENT || n.type === NOTIFICATION_TYPES.VISIT
        ).length,
    }), [notifications]);

    const setFilterType = useCallback((filterType) => {
        setFilter(filterType);
    }, []);

    const deleteNotification = clearNotification;
    const clearAll = clearAllNotifications;

    const value = {
        notifications,
        filteredNotifications,
        filter,
        filters: NOTIFICATION_FILTERS,
        filterCounts,
        unreadCount,
        isLoading,
        setFilterType,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification,
        refreshNotifications,
        expoPushToken,
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

// Custom hook to use the notifications context
export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationsProvider");
    }
    return context;
}

export default NotificationsContext;
