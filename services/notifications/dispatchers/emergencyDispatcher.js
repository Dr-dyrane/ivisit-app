import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../../../constants/notifications";
import { dispatchNotification } from "../notificationCore";

/**
 * Dispatch emergency-related notifications
 * @param {Object} request - Emergency request object
 * @param {string} status - New status
 */
export const dispatchEmergencyUpdate = async (request, status) => {
    let title = "Emergency Update";
    let message = `Status updated to: ${status}`;
    let icon = "medical";
    let color = "#FF3B30"; // Red
    let priority = NOTIFICATION_PRIORITY.URGENT;

    switch (status) {
        case 'accepted':
            title = "Ambulance En Route";
            message = "An ambulance has accepted your request and is on the way.";
            icon = "navigate";
            break;
        case 'arrived':
            title = "Ambulance Arrived";
            message = "The ambulance has arrived at your location.";
            icon = "location";
            break;
        case 'completed':
            title = "Emergency Trip Completed";
            message = "The emergency trip has been completed.";
            icon = "checkmark-circle";
            color = "#34C759"; // Green
            break;
        case 'in_progress':
            title = "Request Received";
            message = "Your emergency request is being processed.";
            break;
    }

    return dispatchNotification({
        type: NOTIFICATION_TYPES.EMERGENCY,
        priority,
        title,
        message,
        icon,
        color,
        actionType: 'view_request',
        actionData: { requestId: request.id },
    });
};
