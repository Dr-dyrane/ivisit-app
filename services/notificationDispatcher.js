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
    async dispatchNotification({ type, priority, title, message, icon = null, color = null, actionType = null, actionData = null }) {
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
    },

    /**
     * Dispatch visit-related notifications
     * @param {Object} visit - Visit object
     * @param {string} action - 'created' | 'updated' | 'cancelled' | 'completed'
     * @returns {Promise<Object>} Created notification
     */
    async dispatchVisitUpdate(visit, action, changes = null) {
        if (!visit) {
            console.warn("[notificationDispatcher] dispatchVisitUpdate: visit is null");
            return;
        }

        let title = "";
        let message = "";
        let priority = NOTIFICATION_PRIORITY.NORMAL;
        let icon = null;
        let color = null;

        // Normalize visit type for consistent checking
        const rawType = visit.visit_type || visit.visitType || "Visit";
        const visitType = rawType.toLowerCase();
        const displayType = rawType; // Keep original casing for display
        const hospitalName = visit.hospital || visit.hospitalName || "hospital";

        // ACTION-BASED LOGIC
        switch (action) {
            case 'created':
                priority = NOTIFICATION_PRIORITY.HIGH;
                color = "#007AFF"; // Blue

                if (visitType.includes('ambulance')) {
                    title = "Ambulance Requested";
                    message = `An ambulance request has been initiated for ${hospitalName}.`;
                    icon = "medical"; // specific icon
                    color = "#FF3B30"; // Red for emergency
                    priority = NOTIFICATION_PRIORITY.URGENT;
                } else if (visitType.includes('bed')) {
                    title = "Bed Booking Confirmed";
                    message = `Your bed at ${hospitalName} has been successfully booked.`;
                    icon = "bed";
                } else if (visitType.includes('tele')) {
                    title = "Telehealth Session Scheduled";
                    message = `Video consultation with ${visit.doctorName || 'doctor'} scheduled.`;
                    icon = "videocam";
                } else {
                    title = `${displayType} Scheduled`;
                    message = `Your ${displayType.toLowerCase()} at ${hospitalName} is confirmed.`;
                    icon = "calendar";
                }
                break;

            case 'updated':
                priority = NOTIFICATION_PRIORITY.NORMAL;
                color = "#FF9500"; // Orange
                icon = "create-outline";

                if (visitType.includes('ambulance')) {
                    // Handled by emergencyRequestsService.dispatchEmergencyUpdate, so we suppress generic updates here
                    // to avoid double notifications.
                    return;
                } else if (visitType.includes('bed')) {
                    if (changes && changes.lifecycleState === 'confirmed') {
                        title = "Bed Confirmed";
                        message = `Your bed at ${hospitalName} is confirmed.`;
                        icon = "checkmark-circle";
                        color = "#34C759"; // Green
                    } else if (changes && changes.lifecycleState === 'monitoring') {
                        title = "Health Monitoring";
                        message = `Active monitoring session started at ${hospitalName}.`;
                        icon = "pulse";
                        color = "#007AFF"; // Blue
                    } else if (changes && changes.lifecycleState === 'discharged') {
                        title = "Discharged";
                        message = "You have been discharged from care.";
                        icon = "log-out";
                    } else {
                        title = "Booking Details Updated";
                        message = "Your bed booking details have been modified.";
                        icon = "bed-outline";
                    }
                } else {
                    // Smart detection for regular visits
                    if (changes && (changes.date || changes.time)) {
                        title = "Appointment Rescheduled";
                        message = `Your appointment has been moved to ${visit.date} at ${visit.time}.`;
                        icon = "time";
                    } else if (changes && changes.status) {
                        title = "Status Update";
                        message = `Your visit status is now: ${visit.status.replace('_', ' ')}.`;
                        icon = "alert-circle-outline";
                    } else if (changes && (changes.hospitalId || changes.hospital)) {
                        title = "Location Changed";
                        message = `The location for your visit has changed to ${hospitalName}.`;
                        icon = "location";
                    } else if (changes && (changes.doctorName || changes.doctor_name)) {
                        title = "Provider Update";
                        message = `Your assigned doctor has been updated.`;
                        icon = "person";
                    } else {
                        title = `${displayType} Updated`;
                        message = `Details for your ${displayType.toLowerCase()} at ${hospitalName} have changed.`;
                    }
                }
                break;

            case 'cancelled':
                title = `${displayType} Cancelled`;
                message = `Your ${displayType.toLowerCase()} at ${hospitalName} was cancelled.`;
                priority = NOTIFICATION_PRIORITY.HIGH;
                icon = "close-circle-outline";
                color = "#FF3B30"; // Red
                break;

            case 'completed':
                priority = NOTIFICATION_PRIORITY.NORMAL;
                color = "#34C759"; // Green
                icon = "checkmark-circle-outline";

                if (visitType.includes('ambulance')) {
                    title = "Trip Completed";
                    message = "You have arrived at your destination.";
                } else if (visitType.includes('bed')) {
                    title = "Discharged";
                    message = "Your hospital stay has been marked as completed.";
                } else {
                    title = `${displayType} Completed`;
                    message = `Your visit at ${hospitalName} is complete.`;
                }
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
            icon,   // Pass explicit icon
            color,  // Pass explicit color
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

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.SYSTEM,
            priority,
            title,
            message,
            icon,
            color,
            actionType: null,
            actionData: null,
        });
    },

    async dispatchEmergencyUpdate(request, status) {
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

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.EMERGENCY,
            priority,
            title,
            message,
            icon,
            color,
            actionType: 'view_request',
            actionData: { requestId: request.id },
        });
    },

    /**
     * Dispatch insurance related notifications
     * @param {string} action - 'created' | 'updated'
     * @param {Object} policy - Policy object
     */
    async dispatchInsuranceUpdate(action, policy) {
        let title = "";
        let message = "";
        let icon = "shield-checkmark";
        let color = "#007AFF"; // Blue
        let priority = NOTIFICATION_PRIORITY.NORMAL;

        const provider = policy.providerName || policy.provider_name || "Insurance";

        switch (action) {
            case 'created':
                title = "New Policy Added";
                message = `Your insurance policy with ${provider} has been successfully added.`;
                color = "#34C759"; // Green
                break;
            case 'updated':
                title = "Policy Updated";
                message = `Updates have been made to your ${provider} policy.`;
                break;
            default:
                return;
        }

        return this.dispatchNotification({
            type: NOTIFICATION_TYPES.SYSTEM,
            priority,
            title,
            message,
            icon,
            color,
            actionType: 'view_insurance',
            actionData: { policyId: policy.id },
        });
    },
}

