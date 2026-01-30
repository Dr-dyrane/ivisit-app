// contexts/NotificationsContext.jsx - Notifications state management

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { NOTIFICATION_FILTERS, NOTIFICATION_TYPES } from "../constants/notifications";
import { useNotificationsData } from "../hooks/notifications/useNotificationsData";

// Create the notifications context
const NotificationsContext = createContext();

// Notifications provider component
export function NotificationsProvider({ children }) {
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
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedNotifications, setSelectedNotifications] = useState(new Set());

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
            case "support":
                return list.filter(n => n.type === NOTIFICATION_TYPES.SUPPORT);
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
        support: notifications.filter(n => n.type === NOTIFICATION_TYPES.SUPPORT).length,
    }), [notifications]);

    const setFilterType = useCallback((filterType) => {
        setFilter(filterType);
    }, []);

    // Selection management functions
    const toggleSelectMode = useCallback(() => {
        setIsSelectMode(prev => !prev);
        setSelectedNotifications(new Set());
    }, []);

    const toggleNotificationSelection = useCallback((notificationId) => {
        setSelectedNotifications(prev => {
            const newSet = new Set(prev);
            if (newSet.has(notificationId)) {
                newSet.delete(notificationId);
            } else {
                newSet.add(notificationId);
            }
            return newSet;
        });
    }, []);

    const selectAllNotifications = useCallback(() => {
        const allIds = filteredNotifications.map(n => n.id);
        setSelectedNotifications(new Set(allIds));
    }, [filteredNotifications]);

    const clearSelection = useCallback(() => {
        setSelectedNotifications(new Set());
    }, []);

    const markSelectedAsRead = useCallback(async () => {
        const selectedIds = Array.from(selectedNotifications);
        if (selectedIds.length === 0) return;
        
        try {
            await Promise.all(selectedIds.map(id => markAsRead(id)));
            clearSelection();
        } catch (error) {
            console.error('Failed to mark selected notifications as read:', error);
        }
    }, [selectedNotifications, markAsRead, clearSelection]);

    const deleteSelectedNotifications = useCallback(async () => {
        const selectedIds = Array.from(selectedNotifications);
        if (selectedIds.length === 0) return;
        
        try {
            await Promise.all(selectedIds.map(id => clearNotification(id)));
            clearSelection();
            toggleSelectMode();
        } catch (error) {
            console.error('Failed to delete selected notifications:', error);
        }
    }, [selectedNotifications, clearNotification, clearSelection, toggleSelectMode]);

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
        // Selection mode properties
        isSelectMode,
        selectedNotifications,
        toggleSelectMode,
        toggleNotificationSelection,
        selectAllNotifications,
        clearSelection,
        markSelectedAsRead,
        deleteSelectedNotifications,
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
