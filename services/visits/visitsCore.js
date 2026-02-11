import { supabase } from "../supabase";
import { 
    TABLE, 
    mapToDb, 
    mapFromDb, 
    fromDbRow, 
    stripExtendedEmergencyColumns, 
    shouldDisableExtendedColumns 
} from "./visitsMapper";
import { normalizeVisit } from "../../utils/domainNormalize";
import { notificationDispatcher } from "../notificationDispatcher";

// Shared state for column support
let supportsExtendedEmergencyColumns = null;

export const list = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("[visitsService] Fetch visits error:", error);
        return [];
    }

    const result = data.map((row) => fromDbRow(row)).filter(Boolean);
    return result;
};

export const ensureExists = async ({
    id,
    requestId,
    hospitalId,
    hospital,
    specialty,
    type,
    status,
    date,
    time,
    lifecycleState,
}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");
    if (!id) throw new Error("Missing visit id");

    const nowIso = new Date().toISOString();
    const base = {
        id: String(id),
        user_id: user.id,
        request_id: requestId ?? String(id),
        hospital_id: hospitalId ?? null,
        hospital: hospital ?? null,
        specialty: specialty ?? null,
        type: type ?? null,
        status: status ?? "upcoming",
        lifecycle_state: lifecycleState ?? null,
        lifecycle_updated_at: nowIso,
        date: date ?? nowIso.slice(0, 10),
        time:
            time ??
            new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        updated_at: nowIso,
    };

    let upsertBase = base;
    if (supportsExtendedEmergencyColumns === false) {
        upsertBase = stripExtendedEmergencyColumns(upsertBase);
    }

    let data;
    let error;
    ({ data, error } = await supabase
        .from(TABLE)
        .upsert(upsertBase, { onConflict: "id" })
        .select()
        .single());

    if (error && supportsExtendedEmergencyColumns !== false && shouldDisableExtendedColumns(error)) {
        supportsExtendedEmergencyColumns = false;
        const retryBase = stripExtendedEmergencyColumns(upsertBase);
        ({ data, error } = await supabase
            .from(TABLE)
            .upsert(retryBase, { onConflict: "id" })
            .select()
            .single());
    }

    if (error) {
        if (error?.code === "PGRST204") {
            throw error;
        }
        console.error(`[visitsService] ensureExists error for ${id}:`, error);
        throw error;
    }

    return normalizeVisit(mapFromDb(data));
};

export const create = async (visit) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const normalized = normalizeVisit(visit);
    let dbItem = mapToDb({ ...normalized, user_id: user.id });
    if (supportsExtendedEmergencyColumns === false) {
        dbItem = stripExtendedEmergencyColumns(dbItem);
    }

    let data;
    let error;
    ({ data, error } = await supabase
        .from(TABLE)
        .upsert(dbItem, { onConflict: "id" })
        .select()
        .single());

    if (error && supportsExtendedEmergencyColumns !== false && shouldDisableExtendedColumns(error)) {
        supportsExtendedEmergencyColumns = false;
        const retryItem = stripExtendedEmergencyColumns(dbItem);
        ({ data, error } = await supabase
            .from(TABLE)
            .upsert(retryItem, { onConflict: "id" })
            .select()
            .single());
    }

    if (error) {
        if (error?.code === "PGRST204") {
            throw error;
        }
        console.error(`[visitsService] Create error for ${normalized.id}:`, error);
        throw error;
    }

    const result = normalizeVisit(mapFromDb(data));

    try {
        await notificationDispatcher.dispatchVisitUpdate(result, 'created');
    } catch (notifError) {
        console.error(`[visitsService] Failed to create notification for visit ${result.id}:`, notifError);
    }

    return result;
};

export const update = async (id, updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    let dbUpdates = mapToDb(updates);
    dbUpdates.updated_at = new Date().toISOString();
    if (supportsExtendedEmergencyColumns === false) {
        dbUpdates = stripExtendedEmergencyColumns(dbUpdates);
    }

    let data;
    let error;
    ({ data, error } = await supabase
        .from(TABLE)
        .update(dbUpdates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select());

    if (error && supportsExtendedEmergencyColumns !== false && shouldDisableExtendedColumns(error)) {
        supportsExtendedEmergencyColumns = false;
        const retryUpdates = stripExtendedEmergencyColumns(dbUpdates);
        ({ data, error } = await supabase
            .from(TABLE)
            .update(retryUpdates)
            .eq("id", id)
            .eq("user_id", user.id)
            .select());
    }

    if (error) {
        if (error?.code === "PGRST204") {
            throw error;
        }
        console.error(`[visitsService] Update error for ${id}:`, error);
        throw error;
    }
    if (!data || data.length === 0) {
        let upserted;
        let upsertError;
        ({ data: upserted, error: upsertError } = await supabase
            .from(TABLE)
            .upsert(
                {
                    id: String(id),
                    user_id: user.id,
                    ...dbUpdates,
                },
                { onConflict: "id" }
            )
            .select()
            .single());

        if (
            upsertError &&
            supportsExtendedEmergencyColumns !== false &&
            shouldDisableExtendedColumns(upsertError)
        ) {
            supportsExtendedEmergencyColumns = false;
            const retryUpsert = stripExtendedEmergencyColumns({
                id: String(id),
                user_id: user.id,
                ...dbUpdates,
            });
            ({ data: upserted, error: upsertError } = await supabase
                .from(TABLE)
                .upsert(retryUpsert, { onConflict: "id" })
                .select()
                .single());
        }

        if (upsertError) {
            console.error(`[visitsService] Upsert fallback failed for ${id}:`, upsertError);
            throw upsertError;
        }

        if (__DEV__) {
            console.log("[visitsService] Update fallback upserted missing visit:", {
                id: String(id),
            });
        }

        const result = normalizeVisit(mapFromDb(upserted));
        try {
            await notificationDispatcher.dispatchVisitUpdate(result, "updated", updates);
        } catch (notifError) {
            console.error(
                `[visitsService] Failed to create notification for visit update ${id}:`,
                notifError
            );
        }
        return result;
    }
    const result = normalizeVisit(mapFromDb(data[0]));

    try {
        await notificationDispatcher.dispatchVisitUpdate(result, 'updated', updates);
    } catch (notifError) {
        console.error(`[visitsService] Failed to create notification for visit update ${id}:`, notifError);
    }

    return result;
};

export const deleteVisit = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    // First get the visit details for notification before deleting
    const { data: visitData, error: fetchError } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (fetchError) {
        console.error(`[visitsService] Fetch visit for delete notification error for ${id}:`, fetchError);
    }

    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

    if (error) {
        console.error(`[visitsService] Delete error for ${id}:`, error);
        throw error;
    }

    // Return deleted data for notification dispatching (handled by caller or separate logic if needed)
    return { deleted: data?.[0] || null, visitData };
};
