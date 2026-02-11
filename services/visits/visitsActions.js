import { supabase } from "../supabase";
import { TABLE, mapFromDb } from "./visitsMapper";
import { normalizeVisit } from "../../utils/domainNormalize";
import { notificationDispatcher } from "../notificationDispatcher";
import { update, ensureExists, deleteVisit as deleteVisitCore } from "./visitsCore";
import { notificationsService } from "../notificationsService";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../../constants/notifications";

export const cancel = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const dbUpdates = { status: 'cancelled', updated_at: new Date().toISOString() };

    const { data, error } = await supabase
        .from(TABLE)
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

    if (error) {
        console.error(`[visitsService] Cancel error for ${id}:`, error);
        throw error;
    }
    if (!data || data.length === 0) {
        const ensured = await ensureExists({
            id,
            requestId: String(id),
            status: "cancelled",
        });

        try {
            await notificationDispatcher.dispatchVisitUpdate(ensured, 'cancelled');
        } catch (notifError) {
            console.error(
                `[visitsService] Failed to create notification for visit cancellation ${id}:`,
                notifError
            );
        }

        return ensured;
    }
    const result = normalizeVisit(mapFromDb(data[0]));

    try {
        await notificationDispatcher.dispatchVisitUpdate(result, 'cancelled');
    } catch (notifError) {
        console.error(`[visitsService] Failed to create notification for visit cancellation ${id}:`, notifError);
    }

    return result;
};

export const complete = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const dbUpdates = { status: 'completed', updated_at: new Date().toISOString() };

    const { data, error } = await supabase
        .from(TABLE)
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

    if (error) {
        console.error(`[visitsService] Complete error for ${id}:`, error);
        throw error;
    }
    if (!data || data.length === 0) {
        const ensured = await ensureExists({
            id,
            requestId: String(id),
            status: "completed",
        });

        try {
            await notificationDispatcher.dispatchVisitUpdate(ensured, 'completed');
        } catch (notifError) {
            console.error(
                `[visitsService] Failed to create notification for visit completion ${id}:`,
                notifError
            );
        }

        return ensured;
    }
    const result = normalizeVisit(mapFromDb(data[0]));

    try {
        await notificationDispatcher.dispatchVisitUpdate(result, 'completed');
    } catch (notifError) {
        console.error(`[visitsService] Failed to create notification for visit completion ${id}:`, notifError);
    }

    return result;
};

export const setLifecycleState = async (id, lifecycleState) => {
    return await update(id, {
        lifecycleState,
        lifecycleUpdatedAt: new Date().toISOString(),
    });
};

export const deleteVisit = async (id) => {
    // Core deletion logic
    const { deleted, visitData } = await deleteVisitCore(id);

    // Dispatch notification for successful deletion
    if (visitData) {
        try {
            const visit = normalizeVisit(mapFromDb(visitData));
            const visitTypeName = visit.type || "Visit";
            const hospitalName = visit.hospital || "hospital";

            const notification = {
                type: NOTIFICATION_TYPES.VISIT,
                priority: NOTIFICATION_PRIORITY.MEDIUM,
                title: `${visitTypeName} Deleted`,
                message: `Your ${visitTypeName.toLowerCase()} at ${hospitalName} has been deleted`,
                read: false,
                timestamp: new Date().toISOString(),
                icon: "trash-outline",
                color: "#FF3B30", // Red
                actionType: "navigate",
                actionData: {
                    screen: "visits"
                }
            };

            await notificationsService.create(notification);
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit deletion ${id}:`, notifError);
        }
    }

    return deleted;
};
