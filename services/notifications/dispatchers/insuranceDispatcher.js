import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../../../constants/notifications";
import { dispatchNotification } from "../notificationCore";

/**
 * Dispatch insurance related notifications
 * @param {string} action - 'created' | 'updated'
 * @param {Object} policy - Policy object
 */
export const dispatchInsuranceUpdate = async (action, policy) => {
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

    return dispatchNotification({
        type: NOTIFICATION_TYPES.SYSTEM,
        priority,
        title,
        message,
        icon,
        color,
        actionType: 'view_insurance',
        actionData: { policyId: policy.id },
    });
};
