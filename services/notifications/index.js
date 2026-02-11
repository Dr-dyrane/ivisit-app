import { dispatchNotification } from "./notificationCore";
import { dispatchAuthEvent } from "./dispatchers/authDispatcher";
import { dispatchEmergencyUpdate } from "./dispatchers/emergencyDispatcher";
import { dispatchInsuranceUpdate } from "./dispatchers/insuranceDispatcher";
import { dispatchVisitUpdate } from "./dispatchers/visitDispatcher";

// Re-export the data service
export { notificationsService } from './notificationsData';

export const notificationDispatcher = {
    dispatchNotification,
    dispatchAuthEvent,
    dispatchEmergencyUpdate,
    dispatchInsuranceUpdate,
    dispatchVisitUpdate
};

export default notificationDispatcher;
