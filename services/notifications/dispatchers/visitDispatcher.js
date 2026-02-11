import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../../../constants/notifications";
import { dispatchNotification } from "../notificationCore";

/**
 * Dispatch visit-related notifications
 * @param {Object} visit - Visit object
 * @param {string} action - 'created' | 'updated' | 'cancelled' | 'completed'
 * @param {Object} changes - Optional changes object
 * @returns {Promise<Object>} Created notification
 */
export const dispatchVisitUpdate = async (visit, action, changes = null) => {
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

    return dispatchNotification({
        type: NOTIFICATION_TYPES.VISIT,
        priority,
        title,
        message,
        icon,   // Pass explicit icon
        color,  // Pass explicit color
        actionType: 'view_visit',
        actionData: { visitId: visit.id },
    });
};
