import { supabase } from "../supabase";
import { notificationDispatcher } from "../notificationDispatcher";
import { update, getActive, EmergencyRequestStatus } from "./emergencyCore";

/**
 * Efficiently update only location (for tracking loops)
 */
export const updateLocation = async (id, location, heading) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Only sync location if logged in

    const { error } = await supabase
        .from('emergency_requests')
        .update({
            patient_location: location, 
            patient_heading: heading,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        // console.warn("Failed to update patient location:", error);
    }
};

/**
 * Set the status of an emergency request
 */
export const setStatus = async (id, status) => {
    const nextStatus =
        status === EmergencyRequestStatus.CANCELLED ||
            status === EmergencyRequestStatus.COMPLETED ||
            status === EmergencyRequestStatus.ACCEPTED ||
            status === EmergencyRequestStatus.ARRIVED
            ? status
            : EmergencyRequestStatus.IN_PROGRESS;

    const result = await update(id, { status: nextStatus });

    // Dispatch notification
    try {
        const request = await getActive();
        if (request && (String(request.id) === String(id) || String(request.requestId) === String(id))) {
            await notificationDispatcher.dispatchEmergencyUpdate(request, nextStatus);
        }
    } catch (e) {
        console.warn("Failed to dispatch emergency update:", e);
    }

    return result;
};
