import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../../../constants/notifications";
import { dispatchNotification } from "../notificationCore";

/**
 * Dispatch auth-related notifications
 * @param {string} event - 'login' | 'signup' | 'password_change' | 'profile_update' | 'logout'
 * @param {Object} userData - User data (optional, for personalization)
 * @returns {Promise<Object>} Created notification
 */
export const dispatchAuthEvent = async (event, userData = {}) => {
    let title = "";
    let message = "";
    let priority = NOTIFICATION_PRIORITY.NORMAL;
    let icon = null;
    let color = null;
    const userName = userData.fullName || userData.full_name || "User";

    switch (event) {
        case 'login':
            title = "Welcome back!";
            message = `You've successfully signed in.`;
            priority = NOTIFICATION_PRIORITY.LOW;
            icon = "log-in-outline";
            color = "#34C759"; // Green
            break;

        case 'signup':
            title = "Welcome to iVisit!";
            message = `Your account has been created successfully.`;
            priority = NOTIFICATION_PRIORITY.NORMAL;
            icon = "person-add-outline";
            color = "#007AFF"; // Blue
            break;

        case 'password_change':
            title = "Password Changed";
            message = "Your password has been updated successfully.";
            priority = NOTIFICATION_PRIORITY.HIGH;
            icon = "lock-closed-outline";
            color = "#FF9500"; // Orange
            break;

        case 'profile_update':
            title = "Profile Updated";
            message = "Your profile has been updated successfully.";
            priority = NOTIFICATION_PRIORITY.NORMAL;
            break;

        case 'logout':
            title = "Signed Out";
            message = "You have been signed out successfully.";
            priority = NOTIFICATION_PRIORITY.LOW;
            break;

        default:
            console.warn(`[notificationDispatcher] Unknown auth event: ${event}`);
            return;
    }

    return dispatchNotification({
        type: NOTIFICATION_TYPES.SYSTEM,
        priority,
        title,
        message,
        icon,
        color,
        actionType: null,
        actionData: null,
    });
};
