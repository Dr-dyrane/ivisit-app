import { supabase } from "./supabase";
import { normalizeVisit } from "../utils/domainNormalize";
import { notificationsService } from "./notificationsService";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../constants/notifications";
import { notificationDispatcher } from "./notificationDispatcher";
import { isValidUUID } from "./displayIdService";

const TABLE = "visits";

// Helper: build the correct .eq() filter based on ID type
const eqById = (query, id) => {
    const strId = String(id);
    if (isValidUUID(strId)) {
        return query.eq('id', strId);
    }
    // Display ID: use display_id column (TEXT type)
    console.log(`[visitsService] Using display_id column for non-UUID: ${strId}`);
    return query.eq('display_id', strId);
};

const toFlatName = (value) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && typeof value.name === "string") {
        return value.name;
    }
    return null;
};

const resolveEmergencyRequestIdForUser = async (key, userId) => {
    const lookup = String(key || "").trim();
    if (!lookup || !userId) return null;

    let requestQuery = supabase
        .from("emergency_requests")
        .select("id")
        .eq("user_id", userId);

    if (isValidUUID(lookup)) {
        requestQuery = requestQuery.eq("id", lookup);
    } else {
        requestQuery = requestQuery.eq("display_id", lookup);
    }

    const { data, error } = await requestQuery.maybeSingle();
    if (error) {
        console.warn(`[visitsService] resolveEmergencyRequestIdForUser failed for ${lookup}:`, error);
        return null;
    }
    return data?.id ?? null;
};

const resolveVisitRowForKey = async (key, userId) => {
    const lookup = String(key || "").trim();
    if (!lookup || !userId) return null;

    let visitQuery = supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId);

    if (isValidUUID(lookup)) {
        visitQuery = visitQuery.eq("id", lookup);
    } else {
        visitQuery = visitQuery.eq("display_id", lookup);
    }

    const { data: directVisit, error: directError } = await visitQuery.maybeSingle();
    if (directError) {
        console.warn(`[visitsService] resolveVisitRowForKey direct lookup failed for ${lookup}:`, directError);
    }
    if (directVisit) return directVisit;

    const requestId = await resolveEmergencyRequestIdForUser(lookup, userId);
    if (!requestId) return null;

    const { data: requestVisit, error: requestError } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", userId)
        .eq("request_id", requestId)
        .maybeSingle();

    if (requestError) {
        console.warn(`[visitsService] resolveVisitRowForKey request lookup failed for ${lookup}:`, requestError);
        return null;
    }

    return requestVisit ?? null;
};

let supportsExtendedEmergencyColumns = null;

const isMissingColumnError = (err, column) => {
    if (!err) return false;
    if (err.code !== "PGRST204") return false;
    const message = typeof err.message === "string" ? err.message : "";
    const details = typeof err.details === "string" ? err.details : "";
    return message.includes(column) || details.includes(column);
};

const stripExtendedEmergencyColumns = (dbItem) => {
    if (!dbItem || typeof dbItem !== "object") return dbItem;
    const next = { ...dbItem };
    delete next.lifecycle_state;
    delete next.lifecycle_updated_at;
    delete next.rating;
    delete next.rating_comment;
    delete next.rated_at;
    delete next.tip_amount;
    delete next.tip_currency;
    delete next.tipped_at;
    delete next.tip_payment_id;
    return next;
};

const shouldDisableExtendedColumns = (err) => {
    return (
        isMissingColumnError(err, "lifecycle_state") ||
        isMissingColumnError(err, "lifecycle_updated_at") ||
        isMissingColumnError(err, "rating") ||
        isMissingColumnError(err, "rating_comment") ||
        isMissingColumnError(err, "rated_at") ||
        isMissingColumnError(err, "tip_amount") ||
        isMissingColumnError(err, "tip_currency") ||
        isMissingColumnError(err, "tipped_at") ||
        isMissingColumnError(err, "tip_payment_id")
    );
};

const mapToDb = (item) => {
    const db = { ...item };
    if (item.hospitalId !== undefined) db.hospital_id = item.hospitalId;
    if (item.hospitalName !== undefined) db.hospital_name = item.hospitalName;
    if (item.hospital !== undefined && item.hospitalName === undefined) db.hospital_name = toFlatName(item.hospital);
    if (item.doctorName !== undefined) db.doctor_name = item.doctorName;
    if (item.doctor !== undefined && item.doctorName === undefined) db.doctor_name = toFlatName(item.doctor);
    if (item.roomNumber !== undefined) db.room_number = item.roomNumber;
    if (item.estimatedDuration !== undefined) db.estimated_duration = item.estimatedDuration;
    if (item.requestId !== undefined) db.request_id = item.requestId;
    if (item.doctorImage !== undefined) db.doctor_image = item.doctorImage;
    if (item.insuranceCovered !== undefined) db.insurance_covered = item.insuranceCovered;
    if (item.nextVisit !== undefined) db.next_visit = item.nextVisit;
    if (item.meetingLink !== undefined) db.meeting_link = item.meetingLink;
    if (item.lifecycleState !== undefined) db.lifecycle_state = item.lifecycleState;
    if (item.lifecycleUpdatedAt !== undefined) db.lifecycle_updated_at = item.lifecycleUpdatedAt;
    if (item.rating !== undefined) db.rating = item.rating;
    if (item.ratingComment !== undefined) db.rating_comment = item.ratingComment;
    if (item.ratedAt !== undefined) db.rated_at = item.ratedAt;
    if (item.tipAmount !== undefined) db.tip_amount = item.tipAmount;
    if (item.tipCurrency !== undefined) db.tip_currency = item.tipCurrency;
    if (item.tippedAt !== undefined) db.tipped_at = item.tippedAt;
    if (item.tipPaymentId !== undefined) db.tip_payment_id = item.tipPaymentId;

    // Remove camelCase keys
    delete db.hospitalId;
    delete db.hospital;
    delete db.hospitalName;
    delete db.doctor;
    delete db.doctorName;
    delete db.roomNumber;
    delete db.estimatedDuration;
    delete db.requestId;
    delete db.createdAt;
    delete db.updatedAt;
    delete db.doctorImage;
    delete db.insuranceCovered;
    delete db.nextVisit;
    delete db.visitId;
    delete db.meetingLink;
    delete db.lifecycleState;
    delete db.lifecycleUpdatedAt;
    delete db.rating;
    delete db.ratingComment;
    delete db.ratedAt;
    delete db.tipAmount;
    delete db.tipCurrency;
    delete db.tippedAt;
    delete db.tipPaymentId;

    return db;
};

const mapFromDb = (row) => ({
    ...row,
    hospitalId: row.hospital_id,
    hospital: row.hospital_name ?? row.hospital ?? null,
    hospitalName: row.hospital_name ?? row.hospital ?? null,
    doctor: row.doctor_name ?? row.doctor ?? null,
    doctorName: row.doctor_name ?? row.doctor ?? null,
    roomNumber: row.room_number,
    estimatedDuration: row.estimated_duration,
    requestId: row.request_id,
    doctorImage: row.doctor_image,
    insuranceCovered: row.insurance_covered,
    nextVisit: row.next_visit,
    meetingLink: row.meeting_link,
    displayId: row.display_id,
    lifecycleState: row.lifecycle_state,
    lifecycleUpdatedAt: row.lifecycle_updated_at,
    rating: row.rating,
    ratingComment: row.rating_comment,
    ratedAt: row.rated_at,
    tipAmount: row.tip_amount,
    tipCurrency: row.tip_currency,
    tippedAt: row.tipped_at,
    tipPaymentId: row.tip_payment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export const visitsService = {
    fromDbRow(row) {
        return normalizeVisit(mapFromDb(row));
    },
    async list() {
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

        const result = data.map((row) => this.fromDbRow(row)).filter(Boolean);
        return result;
    },

    async ensureExists({
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
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");
        if (!id) throw new Error("Missing visit id");

        const nowIso = new Date().toISOString();
        const base = {
            id: String(id),
            user_id: user.id,
            request_id: requestId ?? String(id),
            hospital_id: hospitalId ?? null,
            hospital_name: hospital ?? null,
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
    },

    async create(visit) {
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
    },

    async update(id, updates) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");
        const lookupId = String(id);
        const [resolvedVisitRow, resolvedEmergencyRequestId] = await Promise.all([
            resolveVisitRowForKey(lookupId, user.id),
            resolveEmergencyRequestIdForUser(lookupId, user.id),
        ]);
        const targetId = resolvedVisitRow?.id ?? lookupId;

        let dbUpdates = mapToDb(updates);
        dbUpdates.updated_at = new Date().toISOString();
        if (supportsExtendedEmergencyColumns === false) {
            dbUpdates = stripExtendedEmergencyColumns(dbUpdates);
        }

        let data;
        let error;
        let updateQuery = supabase
            .from(TABLE)
            .update(dbUpdates);
        updateQuery = eqById(updateQuery, targetId);
        ({ data, error } = await updateQuery
            .eq("user_id", user.id)
            .select());

        if (error && supportsExtendedEmergencyColumns !== false && shouldDisableExtendedColumns(error)) {
            supportsExtendedEmergencyColumns = false;
            const retryUpdates = stripExtendedEmergencyColumns(dbUpdates);
            let retryQuery = supabase
                .from(TABLE)
                .update(retryUpdates);
            retryQuery = eqById(retryQuery, targetId);
            ({ data, error } = await retryQuery
                .eq("user_id", user.id)
                .select());
        }

        if (error) {
            if (error?.code === "PGRST204") {
                throw error;
            }
            console.error(`[visitsService] Update error for ${lookupId}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            // Never invent visit rows from emergency request keys; DB sync owns those rows.
            if (resolvedEmergencyRequestId || !isValidUUID(targetId)) {
                console.warn(
                    `[visitsService] No visit matched key ${lookupId}; skipping upsert fallback`
                );
                return normalizeVisit(
                    mapFromDb({
                        ...(resolvedVisitRow || {}),
                        id: targetId,
                        request_id: resolvedVisitRow?.request_id ?? resolvedEmergencyRequestId ?? null,
                        ...dbUpdates,
                    })
                );
            }
            let upserted;
            let upsertError;
            ({ data: upserted, error: upsertError } = await supabase
                .from(TABLE)
                .upsert(
                    {
                        id: targetId,
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
                    id: targetId,
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
                console.error(`[visitsService] Upsert fallback failed for ${lookupId}:`, upsertError);
                throw upsertError;
            }

            if (__DEV__) {
                console.log("[visitsService] Update fallback upserted missing visit:", {
                    id: targetId,
                });
            }

            const result = normalizeVisit(mapFromDb(upserted));
            try {
                await notificationDispatcher.dispatchVisitUpdate(result, "updated", updates);
            } catch (notifError) {
                console.error(
                    `[visitsService] Failed to create notification for visit update ${lookupId}:`,
                    notifError
                );
            }
            return result;
        }
        const result = normalizeVisit(mapFromDb(data[0]));

        try {
            await notificationDispatcher.dispatchVisitUpdate(result, 'updated', updates);
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit update ${lookupId}:`, notifError);
        }

        return result;
    },

    async cancel(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");
        const lookupId = String(id);
        const [resolvedVisitRow, resolvedEmergencyRequestId] = await Promise.all([
            resolveVisitRowForKey(lookupId, user.id),
            resolveEmergencyRequestIdForUser(lookupId, user.id),
        ]);
        const targetId = resolvedVisitRow?.id ?? lookupId;

        const dbUpdates = { status: 'cancelled', updated_at: new Date().toISOString() };

        let cancelQuery = supabase
            .from(TABLE)
            .update(dbUpdates);
        cancelQuery = eqById(cancelQuery, targetId);
        const { data, error } = await cancelQuery
            .eq('user_id', user.id)
            .select();

        if (error) {
            console.error(`[visitsService] Cancel error for ${lookupId}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            // Don't try to ensureExists with display IDs — backend trigger handles creation
            if (resolvedEmergencyRequestId || !isValidUUID(targetId)) {
                console.warn(
                    `[visitsService] No visit matched key ${lookupId}; cancel skipped without upsert`
                );
                return normalizeVisit(
                    mapFromDb({
                        ...(resolvedVisitRow || {}),
                        id: targetId,
                        request_id: resolvedVisitRow?.request_id ?? resolvedEmergencyRequestId ?? null,
                        ...dbUpdates,
                    })
                );
            }
            const ensured = await this.ensureExists({
                id: targetId,
                requestId: resolvedEmergencyRequestId ?? String(targetId),
                status: "cancelled",
            });

            try {
                await notificationDispatcher.dispatchVisitUpdate(ensured, 'cancelled');
            } catch (notifError) {
                console.error(
                    `[visitsService] Failed to create notification for visit cancellation ${lookupId}:`,
                    notifError
                );
            }

            return ensured;
        }
        const result = normalizeVisit(mapFromDb(data[0]));

        try {
            await notificationDispatcher.dispatchVisitUpdate(result, 'cancelled');
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit cancellation ${lookupId}:`, notifError);
        }

        return result;
    },

    async complete(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not logged in");
        const lookupId = String(id);
        const [resolvedVisitRow, resolvedEmergencyRequestId] = await Promise.all([
            resolveVisitRowForKey(lookupId, user.id),
            resolveEmergencyRequestIdForUser(lookupId, user.id),
        ]);
        const targetId = resolvedVisitRow?.id ?? lookupId;

        const dbUpdates = { status: 'completed', updated_at: new Date().toISOString() };

        let completeQuery = supabase
            .from(TABLE)
            .update(dbUpdates);
        completeQuery = eqById(completeQuery, targetId);
        const { data, error } = await completeQuery
            .eq('user_id', user.id)
            .select();

        if (error) {
            console.error(`[visitsService] Complete error for ${lookupId}:`, error);
            throw error;
        }
        if (!data || data.length === 0) {
            if (resolvedEmergencyRequestId || !isValidUUID(targetId)) {
                console.warn(
                    `[visitsService] No visit matched key ${lookupId}; complete skipped without upsert`
                );
                return normalizeVisit(
                    mapFromDb({
                        ...(resolvedVisitRow || {}),
                        id: targetId,
                        request_id: resolvedVisitRow?.request_id ?? resolvedEmergencyRequestId ?? null,
                        ...dbUpdates,
                    })
                );
            }
            const ensured = await this.ensureExists({
                id: targetId,
                requestId: resolvedEmergencyRequestId ?? String(targetId),
                status: "completed",
            });

            try {
                await notificationDispatcher.dispatchVisitUpdate(ensured, 'completed');
            } catch (notifError) {
                console.error(
                    `[visitsService] Failed to create notification for visit completion ${lookupId}:`,
                    notifError
                );
            }

            return ensured;
        }
        const result = normalizeVisit(mapFromDb(data[0]));

        try {
            await notificationDispatcher.dispatchVisitUpdate(result, 'completed');
        } catch (notifError) {
            console.error(`[visitsService] Failed to create notification for visit completion ${lookupId}:`, notifError);
        }

        return result;
    },

    async setLifecycleState(id, lifecycleState) {
        return await this.update(id, {
            lifecycleState,
            lifecycleUpdatedAt: new Date().toISOString(),
        });
    },

    async delete(id) {
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

        return data?.[0] || null;
    }
};
