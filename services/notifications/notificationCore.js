import { v4 as uuidv4 } from "uuid";
import { notificationsService } from "./notificationsData";

/**
 * Universal notification dispatcher
 * @param {Object} params - Notification parameters
 * @param {string} params.type - NOTIFICATION_TYPES constant
 * @param {string} params.priority - NOTIFICATION_PRIORITY constant
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.actionType - Optional action type for deep linking
 * @param {Object} params.actionData - Optional action data
 * @returns {Promise<Object>} Created notification
 */
export const dispatchNotification = async ({ 
    type, 
    priority, 
    title, 
    message, 
    icon = null, 
    color = null, 
    actionType = null, 
    actionData = null 
}) => {
    try {
        const notification = {
            id: uuidv4(),
            type,
            priority,
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false,
            icon,
            color,
            actionType,
            actionData,
        };

        const result = await notificationsService.create(notification);
        return result;
    } catch (error) {
        console.error("[notificationDispatcher] Error creating notification:", error);
        throw error;
    }
};
