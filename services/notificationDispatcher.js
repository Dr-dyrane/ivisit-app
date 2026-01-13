import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../constants/notifications";
import { notificationsService } from "./notificationsService";
import { v4 as uuidv4 } from "uuid";

/**
 * Notification Dispatcher
 * 
 * Universal notification dispatcher for all app events.
 * Creates notifications in the database via notificationsService.
 * 
 * Haptic/sound feedback is triggered by the useNotificationsData subscription,
 * NOT by this dispatcher (to ensure real-time feedback across all devices).
 * 
 * Responsibilities:
 * 1. Create standardized notification records in DB
 * 2. Map domain events to notification types/priorities
 * 3. Generate notification content (title, message)
 */

export const notificationDispatcher = {
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
    async dispatchNotification({ type, priority, title, message, actionType = null, actionData = null }) {
        try {
            const notification = {
                id: uuidv4(),
                type,
                priority,
                title,
                message,
                timestamp: new Date().toISOString(),
                read: false,
                actionType,
                actionData,
            };

            const result = await notificationsService.create(notification);
            return result;
        } catch (error) {
            console.error("[notificationDispatcher] Error creating notification:", error);
            throw error;
        }
    },

    /**
     * Dispatch visit-related notifications
     * @param {Object} visit - Visit object
     * @param {string} action - 'created' | 'updated' | 'cancelled' | 'completed'
     * @returns {Promise<Object>} Created notification
     */
    async dispatchVisitUpdate(visit, action) {
        if (!visit) {
            console.warn("[notificationDispatcher] dispatchVisitUpdate: visit is null");
            return;
        }

        let title = "";
        let message = "";
        let priority = NOTIFICATION_PRIORITY.NORMAL;
        const visitType = visit.visit_type || visit.visitType || "Visit";

        switch (action) {
            case 'created':
                title = `${visitType} Scheduled`;
                message = `Your ${visitType.toLowerCase()} has been scheduled.`;
                priority = NOTIFICATION_PRIORITY.HIGH;
                break;

            case 'updated':
                title = `${visitType} Updated`;
                message = `Your ${visitType.toLowerCase()} details have been updated.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            case 'cancelled':
                title = `${visitType} Cancelled`;
                message = `Your ${visitType.toLowerCase()} has been cancelled.`;
                priority = NOTIFICATION_PRIORITY.HIGH;
                break;

            case 'completed':
                title = `${visitType} Completed`;
                message = `Your ${visitType.toLowerCase()} has been completed.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            default:
                console.warn(`[notificationDispatcher] Unknown visit action: ${action}`);
                return;
        }

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.VISIT,
            priority,
            title,
            message,
            actionType: 'view_visit',
            actionData: { visitId: visit.id },
        });
    },

    /**
     * Dispatch auth-related notifications
     * @param {string} event - 'login' | 'signup' | 'password_change' | 'profile_update' | 'logout'
     * @param {Object} userData - User data (optional, for personalization)
     * @returns {Promise<Object>} Created notification
     */
    async dispatchAuthEvent(event, userData = {}) {
        let title = "";
        let message = "";
        let priority = NOTIFICATION_PRIORITY.NORMAL;
        const userName = userData.fullName || userData.full_name || "User";

        switch (event) {
            case 'login':
                title = "Welcome back!";
                message = `You've successfully signed in.`;
                priority = NOTIFICATION_PRIORITY.LOW;
                break;

            case 'signup':
                title = "Welcome to iVisit!";
                message = `Your account has been created successfully.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            case 'password_change':
                title = "Password Changed";
                message = "Your password has been updated successfully.";
                priority = NOTIFICATION_PRIORITY.HIGH;
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

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.SYSTEM,
            priority,
            title,
            message,
            actionType: null,
            actionData: null,
        });
    },

    /**
     * Dispatch emergency-related notifications
     * @param {string} event - 'accepted' | 'arriving' | 'completed' | 'cancelled'
     * @param {Object} data - Emergency request data
     * @returns {Promise<Object>} Created notification
     */
    async dispatchEmergencyEvent(event, data) {
        if (!data) {
            console.warn("[notificationDispatcher] dispatchEmergencyEvent: data is null");
            return;
        }

        let title = "";
        let message = "";
        let priority = NOTIFICATION_PRIORITY.NORMAL;

        switch (event) {
            case 'accepted':
                title = "Help is on the way!";
                message = `${data.responder_name || 'An ambulance'} has accepted your request.`;
                priority = NOTIFICATION_PRIORITY.URGENT;
                break;

            case 'arriving':
                title = "Ambulance Arriving";
                message = "The responder is approaching your location.";
                priority = NOTIFICATION_PRIORITY.HIGH;
                break;

            case 'completed':
                title = "Trip Completed";
                message = "You have arrived at the hospital.";
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            case 'cancelled':
                title = "Request Cancelled";
                message = "The emergency request was cancelled.";
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            default:
                console.warn(`[notificationDispatcher] Unknown emergency event: ${event}`);
                return;
        }

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.EMERGENCY,
            priority,
            title,
            message,
            actionType: 'view_map',
            actionData: { requestId: data.id },
        });
    },

    /**
     * Dispatch support-related notifications
     * @param {string} event - 'ticket_created' | 'ticket_updated' | 'reply_received'
     * @param {Object} data - Ticket data
     * @returns {Promise<Object>} Created notification
     */
    async dispatchSupportEvent(event, data) {
        let title = "";
        let message = "";
        let priority = NOTIFICATION_PRIORITY.NORMAL;

        switch (event) {
            case 'ticket_created':
                title = "Support Request Received";
                message = `We've received your request: "${data.subject}". A team member will respond shortly.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            case 'ticket_updated':
                title = "Support Ticket Updated";
                message = `Your ticket "${data.subject}" has been updated.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;
            
            case 'reply_received':
                title = "New Support Reply";
                message = `New reply on ticket: "${data.subject}"`;
                priority = NOTIFICATION_PRIORITY.HIGH;
                break;

            default:
                console.warn(`[notificationDispatcher] Unknown support event: ${event}`);
                return;
        }

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.SUPPORT,
            priority,
            title,
            message,
            actionType: 'view_ticket',
            actionData: { ticketId: data.id },
        });
    },

    /**
     * Dispatch insurance-related notifications
     * @param {string} event - 'created' | 'updated' | 'deleted'
     * @param {Object} data - Insurance policy data
     * @returns {Promise<Object>} Created notification
     */
    async dispatchInsuranceEvent(event, data) {
        let title = "";
        let message = "";
        let priority = NOTIFICATION_PRIORITY.NORMAL;

        switch (event) {
            case 'created':
                title = "Insurance Linked";
                message = `Your ${data.provider_name} policy has been successfully linked.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            case 'updated':
                title = "Insurance Updated";
                message = `Your ${data.provider_name} policy details have been updated.`;
                priority = NOTIFICATION_PRIORITY.NORMAL;
                break;

            case 'deleted':
                title = "Insurance Removed";
                message = `The ${data.provider_name} policy has been removed from your profile.`;
                priority = NOTIFICATION_PRIORITY.LOW;
                break;

            default:
                console.warn(`[notificationDispatcher] Unknown insurance event: ${event}`);
                return;
        }

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.SYSTEM,
            priority,
            title,
            message,
            actionType: 'view_insurance',
            actionData: { policyId: data.id },
        });
    },

    /**
     * Legacy method for backward compatibility with EmergencyContext
     * @deprecated Use dispatchEmergencyEvent instead
     */
    async dispatch(event, data, addNotification) {
        console.warn("[notificationDispatcher] dispatch() is deprecated. Use dispatchEmergencyEvent() instead.");
        return this.dispatchEmergencyEvent(event, data);
    },
};
