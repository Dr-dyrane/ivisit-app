import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../constants/notifications";
import * as Haptics from "expo-haptics";

/**
 * Notification Dispatcher
 * 
 * Centralizes all notification logic.
 * Triggered ONLY by state changes in the EmergencyContext (Source of Truth).
 * 
 * Responsibilities:
 * 1. Send In-App Notifications (Toast/Banner)
 * 2. Send Push Notifications (Future Integration)
 * 3. Trigger Haptics/Sounds
 */

export const notificationDispatcher = {
    /**
     * Dispatch a notification based on an emergency event
     * @param {string} event - 'accepted' | 'arriving' | 'completed' | 'cancelled'
     * @param {Object} data - The emergency request record
     * @param {Function} addNotification - The context function to add to local state
     */
    dispatch(event, data, addNotification) {
        if (!data || !addNotification) return;

        console.log(`[Dispatcher] Processing event: ${event}`, data.id);

        let title = "";
        let message = "";
        let type = NOTIFICATION_TYPES.SYSTEM;
        let priority = NOTIFICATION_PRIORITY.NORMAL;
        let haptic = Haptics.NotificationFeedbackType.Success;

        switch (event) {
            case 'accepted':
                title = "Help is on the way!";
                message = `${data.responder_name || 'An ambulance'} has accepted your request.`;
                type = NOTIFICATION_TYPES.EMERGENCY;
                priority = NOTIFICATION_PRIORITY.URGENT;
                haptic = Haptics.NotificationFeedbackType.Success;
                break;
            
            case 'arriving':
                title = "Ambulance Arriving";
                message = "The responder is approaching your location.";
                type = NOTIFICATION_TYPES.EMERGENCY;
                priority = NOTIFICATION_PRIORITY.HIGH;
                haptic = Haptics.NotificationFeedbackType.Warning;
                break;

            case 'completed':
                title = "Trip Completed";
                message = "You have arrived at the hospital.";
                type = NOTIFICATION_TYPES.EMERGENCY;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                haptic = Haptics.NotificationFeedbackType.Success;
                break;

            case 'cancelled':
                title = "Request Cancelled";
                message = "The emergency request was cancelled.";
                type = NOTIFICATION_TYPES.SYSTEM;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                haptic = Haptics.NotificationFeedbackType.Error;
                break;

            default:
                return;
        }

        // 1. In-App Notification
        addNotification({
            id: `evt_${data.id}_${event}`,
            type,
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false,
            priority,
            actionType: 'view_map', // Deep link action
            actionData: { requestId: data.id }
        });

        // 2. Haptics
        Haptics.notificationAsync(haptic);

        // 3. System Notification (Mimic Push)
        pushNotificationService.scheduleLocalNotification(title, message, { 
            requestId: data.id, 
            type: event 
        });
    }
};
