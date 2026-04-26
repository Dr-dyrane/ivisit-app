import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import { notificationDispatcher } from "./notificationDispatcher";
import { calculateEmergencyCost, checkInsuranceCoverage } from "./pricingService";
import { v4 as uuidv4 } from "uuid";
import { isValidUUID } from "./displayIdService";

export const EmergencyRequestStatus = {
    PENDING_APPROVAL: "pending_approval",
    IN_PROGRESS: "in_progress",
    ACCEPTED: "accepted",
    ARRIVED: "arrived",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    PAYMENT_DECLINED: "payment_declined",
};

export const ACTIVE_EMERGENCY_REQUEST_STATUSES = Object.freeze([
    EmergencyRequestStatus.PENDING_APPROVAL,
    EmergencyRequestStatus.IN_PROGRESS,
    EmergencyRequestStatus.ACCEPTED,
    EmergencyRequestStatus.ARRIVED,
]);

export const ACTIVE_EMERGENCY_REQUEST_ERROR_CODE = "ACTIVE_EMERGENCY_REQUEST_EXISTS";

const EMERGENCY_STATUS_ALIASES = Object.freeze({
    pending: EmergencyRequestStatus.PENDING_APPROVAL,
    dispatched: EmergencyRequestStatus.IN_PROGRESS,
    assigned: EmergencyRequestStatus.ACCEPTED,
    responding: EmergencyRequestStatus.ACCEPTED,
    en_route: EmergencyRequestStatus.ACCEPTED,
    resolved: EmergencyRequestStatus.COMPLETED,
    canceled: EmergencyRequestStatus.CANCELLED,
});

const canonicalizeEmergencyStatus = (value, fallback = null) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (!normalized) return fallback;
    return EMERGENCY_STATUS_ALIASES[normalized] || normalized;
};

const parsePointInput = (value) => {
    if (!value) return null;

    if (typeof value === "object") {
        if (Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
            return { lat: Number(value.lat), lng: Number(value.lng) };
        }
        if (Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
            return { lat: Number(value.latitude), lng: Number(value.longitude) };
        }
        if (
            value.type === "Point" &&
            Array.isArray(value.coordinates) &&
            value.coordinates.length >= 2
        ) {
            return {
                lat: Number(value.coordinates[1]),
                lng: Number(value.coordinates[0]),
            };
        }
    }

    if (typeof value === "string") {
        const match = value.trim().match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
        if (match) {
            return { lat: Number(match[2]), lng: Number(match[1]) };
        }
    }

    return null;
};

const resolveOwnedRequestUuid = async (requestKey, userId) => {
    if (isValidUUID(requestKey)) {
        return requestKey;
    }

    const { data, error } = await supabase
        .from('emergency_requests')
        .select('id')
        .eq('display_id', requestKey)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
};

const isPlainObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value);

const resolveTriageSnapshot = (request) => {
    const patientSnapshot = isPlainObject(request?.patient_snapshot)
        ? request.patient_snapshot
        : isPlainObject(request?.patient)
            ? request.patient
            : null;

    const directSnapshot =
        request?.triageSnapshot ??
        request?.triage_snapshot ??
        request?.triage ??
        null;
    const nestedSnapshot =
        patientSnapshot?.triageSnapshot ??
        patientSnapshot?.triage_snapshot ??
        patientSnapshot?.triage ??
        null;
    const snapshot = directSnapshot ?? nestedSnapshot;

    return isPlainObject(snapshot) ? snapshot : null;
};

const resolveTriageCheckin = (triageSnapshot) => {
    if (!isPlainObject(triageSnapshot)) return null;
    const checkin =
        triageSnapshot?.signals?.userCheckin ??
        triageSnapshot?.signals?.checkin ??
        triageSnapshot?.userCheckin ??
        triageSnapshot?.checkin ??
        null;
    return isPlainObject(checkin) ? checkin : null;
};

const resolveTriageProgress = (triageSnapshot) => {
    if (!isPlainObject(triageSnapshot)) return null;
    return isPlainObject(triageSnapshot?.progress)
        ? triageSnapshot.progress
        : null;
};

const withResolvedTriageFields = (request) => {
    const fallbackCheckin = isPlainObject(request?.triageCheckin)
        ? request.triageCheckin
        : null;
    const triageSnapshot =
        resolveTriageSnapshot(request) ??
        (fallbackCheckin ? { signals: { userCheckin: fallbackCheckin } } : null);
    return {
        ...request,
        triage: triageSnapshot,
        triageSnapshot,
        triageCheckin: fallbackCheckin ?? resolveTriageCheckin(triageSnapshot),
        triageProgress: request?.triageProgress ?? resolveTriageProgress(triageSnapshot),
    };
};

const mapEmergencyRequestRow = (r) => withResolvedTriageFields({
    id: r.id,
    requestId: r.display_id,
    displayId: r.display_id,
    serviceType: r.service_type,
    hospitalId: r.hospital_id,
    hospitalName: r.hospital_name,
    specialty: r.specialty,
    ambulanceType: r.ambulance_type,
    ambulanceId: r.ambulance_id,
    bedNumber: r.bed_number,
    bedType: r.bed_type,
    bedCount: r.bed_count,
    estimatedArrival: r.estimated_arrival,
    status: r.status,
    totalCost: r.total_cost,
    paymentStatus: r.payment_status,
    paymentMethodId: r.payment_method_id ?? null,
    patient: r.patient_snapshot,
    patient_snapshot: r.patient_snapshot,
    shared: r.shared_data_snapshot,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    responderName: r.responder_name,
    responderPhone: r.responder_phone,
    responderVehicleType: r.responder_vehicle_type,
    responderVehiclePlate: r.responder_vehicle_plate,
    responderLocation: r.responder_location,
    responderHeading: r.responder_heading,
    patientLocation: r.patient_location,
    patientHeading: r.patient_heading,
});

const createActiveRequestError = (serviceType, activeRequest) => {
    const label = serviceType === "bed" ? "bed reservation" : "ambulance request";
    const error = new Error(`You already have an active ${label}.`);
    error.code = ACTIVE_EMERGENCY_REQUEST_ERROR_CODE;
    error.serviceType = serviceType;
    error.activeRequest = activeRequest ?? null;
    return error;
};

const isGuardedServiceType = (serviceType) =>
    serviceType === "ambulance" || serviceType === "bed";

export const emergencyRequestsService = {
    async list() {
        const { data: { user } } = await supabase.auth.getUser();

        // Fetch active request from Supabase
        if (user) {
            const { data, error } = await supabase
                .from('emergency_requests')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived'])
                .order('created_at', { ascending: false });

            if (error) {
                if (__DEV__) {
                    // console.log("[emergencyRequestsService.list] Supabase error, falling back to local:", {
                    //     code: error?.code ?? null,
                    //     message: error?.message ?? null,
                    // });
                }
            } else {
                const rows = Array.isArray(data) ? data : [];
                const requests = rows.map(mapEmergencyRequestRow);
                await database.write(StorageKeys.EMERGENCY_REQUESTS, requests);

                return requests;
            }
        }

        // Fallback to local
        const items = await database.read(StorageKeys.EMERGENCY_REQUESTS, []);
        if (!Array.isArray(items)) return [];
        return items
            .filter((r) => r && typeof r === "object")
            .map(withResolvedTriageFields)
            .sort((a, b) => String(b?.createdAt ?? "").localeCompare(String(a?.createdAt ?? "")));
    },

    async create(request) {
        const { data: { user } } = await supabase.auth.getUser();
        const now = new Date().toISOString();
        const displayId = request?.requestId || `REQ-${Date.now()}`;
        const requestTriageSnapshot =
            resolveTriageSnapshot(request) ??
            (isPlainObject(request?.triageCheckin)
                ? { signals: { userCheckin: request.triageCheckin } }
                : null);
        const basePatientSnapshot = isPlainObject(request?.patient)
            ? request.patient
            : {};
        const patientSnapshot = requestTriageSnapshot
            ? { ...basePatientSnapshot, triage: requestTriageSnapshot }
            : (request?.patient ?? null);

        // Prepare common fields
        const commonFields = {
            display_id: displayId,
            service_type: request?.serviceType ?? null,
            hospital_id: request?.hospitalId ?? null,
            hospital_name: request?.hospitalName ?? null,
            specialty: request?.specialty ?? null,
            ambulance_type: request?.ambulanceType ?? null,
            ambulance_id: request?.ambulanceId ?? null,
            bed_number: request?.bedNumber ?? null,
            bed_type: request?.bedType ?? null,
            bed_count: request?.bedCount ?? null,
            estimated_arrival: request?.estimatedArrival ?? null,
            status: request?.status ?? EmergencyRequestStatus.IN_PROGRESS,
            patient_snapshot: patientSnapshot,
            shared_data_snapshot: request?.shared ?? null,
            created_at: request?.createdAt ?? now,
            updated_at: now,
            patient_location: request?.patientLocation ?? null,
            patient_heading: request?.patientHeading ?? null,
            total_cost: request?.total_cost ?? null,
            payment_status: request?.payment_status ?? null,
            payment_method_id: request?.payment_method_id ?? null
        };

        if (user) {
            // Determine payment info
            const paymentMethod = request.paymentMethod || null;
            const method =
                request.paymentMethodId ||
                request.payment_method_id ||
                paymentMethod?.id ||
                'cash';
            const normalizedMethod = String(method || '').toLowerCase();
            const isCash =
                paymentMethod?.is_cash === true ||
                normalizedMethod === 'cash' ||
                normalizedMethod.includes('cash');
            const isWallet =
                paymentMethod?.is_wallet === true ||
                normalizedMethod === 'wallet' ||
                normalizedMethod.includes('wallet');
            const deferDispatchUntilPayment =
                request.deferDispatchUntilPayment === true && !isCash && !isWallet;
            const total = parseFloat(request.total_cost || request.totalCost || 0);

            console.log('[emergencyRequestsService] Creating fluid request via v4 RPC:', {
                method, isCash, total, hospitalId: request.hospitalId
            });

            const rpcPatientLocation = parsePointInput(request.patientLocation);
            const serviceType = request?.serviceType ?? null;
            if (isGuardedServiceType(serviceType)) {
                const { data: activeRows, error: activeError } = await supabase
                    .from("emergency_requests")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("service_type", serviceType)
                    .in("status", ACTIVE_EMERGENCY_REQUEST_STATUSES)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (activeError) {
                    console.error("[emergencyRequestsService] Active request preflight failed:", activeError);
                    throw activeError;
                }

                const activeRequest = Array.isArray(activeRows) && activeRows[0]
                    ? mapEmergencyRequestRow(activeRows[0])
                    : null;
                if (activeRequest) {
                    throw createActiveRequestError(serviceType, activeRequest);
                }
            }

            const { data, error } = await supabase.rpc('create_emergency_v4', {
                p_user_id: user.id,
                p_request_data: {
                    hospital_id: request.hospitalId,
                    hospital_name: request.hospitalName,
                    service_type: serviceType,
                    specialty: request.specialty,
                    patient_location: rpcPatientLocation,
                    patient_snapshot: patientSnapshot,
                    ambulance_type: request.ambulanceType
                },
                p_payment_data: {
                    method: isCash ? 'cash' : (isWallet ? 'wallet' : 'card'),
                    total_amount: total,
                    fee_amount: request.feeAmount || (total * 0.025),
                    currency: request.currency || 'USD',
                    method_id: method,
                    defer_dispatch_until_payment: deferDispatchUntilPayment
                }
            });

            if (error) {
                console.error('[emergencyRequestsService] Fluid Creation Failed:', error);
                throw error;
            }

            return {
                ...request,
                id: data.request_id,
                requestId: data.display_id,
                paymentId: data.payment_id,
                createdAt: now,
                updatedAt: now,
                status: data.emergency_status,
                requiresApproval: data.requires_approval,
                awaitsPaymentConfirmation: data.awaits_payment_confirmation === true,
                paymentStatus: data.payment_status || null,
            };
        } else {
            // Local fallback
            const serviceType = request?.serviceType ?? null;
            if (isGuardedServiceType(serviceType)) {
                const existingItems = await database.read(StorageKeys.EMERGENCY_REQUESTS, []);
                const activeLocalRequest = Array.isArray(existingItems)
                    ? existingItems.find(
                            (item) =>
                                item?.serviceType === serviceType &&
                                ACTIVE_EMERGENCY_REQUEST_STATUSES.includes(
                                    canonicalizeEmergencyStatus(item?.status, "")
                                )
                        )
                    : null;
                if (activeLocalRequest) {
                    throw createActiveRequestError(serviceType, withResolvedTriageFields(activeLocalRequest));
                }
            }

            const localItem = {
                ...request,
                ...commonFields,
                id: displayId,
                requestId: displayId,
                createdAt: now,
                updatedAt: now
            };
            const normalizedLocalItem = withResolvedTriageFields(localItem);
            await database.createOne(StorageKeys.EMERGENCY_REQUESTS, normalizedLocalItem);
            return normalizedLocalItem;
        }
    },

    async update(id, updates) {
        const { data: { user } } = await supabase.auth.getUser();
        const requestId = String(id);
        const nextUpdatedAt = new Date().toISOString();

        if (user) {
            const resolvedRequestId = await resolveOwnedRequestUuid(requestId, user.id);
            if (!resolvedRequestId) {
                console.warn(`[emergencyRequestsService] No matching emergency request for update: ${requestId}`);
                return { id: requestId, ...updates, updatedAt: nextUpdatedAt };
            }

            const rpcPayload = {};
            if (updates.status !== undefined) {
                rpcPayload.status = canonicalizeEmergencyStatus(updates.status, null);
            }
            if (updates.patientLocation !== undefined) {
                rpcPayload.patient_location = parsePointInput(updates.patientLocation) || updates.patientLocation;
            }
            if (updates.triageSnapshot !== undefined) {
                rpcPayload.triage_snapshot = updates.triageSnapshot;
            }
            if (typeof updates.transition_reason === "string" && updates.transition_reason.trim()) {
                rpcPayload.transition_reason = updates.transition_reason.trim();
            }
            if (typeof updates.reason === "string" && updates.reason.trim()) {
                rpcPayload.reason = updates.reason.trim();
            }

            if (Object.keys(rpcPayload).length > 0) {
                const { data, error } = await supabase.rpc('patient_update_emergency_request', {
                    p_request_id: resolvedRequestId,
                    p_payload: rpcPayload
                });

                if (error) {
                    console.error(`[emergencyRequestsService] RPC update failed for ${requestId}:`, error);
                    throw error;
                }
                if (!data?.success || !data?.request) {
                    throw new Error(data?.error || 'Emergency update failed');
                }
            }

            return { id: resolvedRequestId, ...updates, updatedAt: nextUpdatedAt };
        }

        const item = await database.updateOne(
            StorageKeys.EMERGENCY_REQUESTS,
            (r) => String(r?.id ?? r?.requestId) === requestId,
            { ...updates, updatedAt: nextUpdatedAt }
        );
        return item;
    },

    /**
     * Efficiently update only location (for tracking loops)
     */
    async updateLocation(id, location, heading) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Only sync location if logged in

        void heading;

        const requestId = String(id);
        const resolvedRequestId = await resolveOwnedRequestUuid(requestId, user.id);
        if (!resolvedRequestId) return;

        const normalizedLocation = parsePointInput(location) || location;
        const { error, data } = await supabase.rpc('patient_update_emergency_request', {
            p_request_id: resolvedRequestId,
            p_payload: {
                patient_location: normalizedLocation
            }
        });

        if (error || !data?.success) {
            // console.warn("Failed to update patient location:", error || data?.error);
        }
    },

    async setStatus(id, status) {
        const nextStatus =
            status === EmergencyRequestStatus.CANCELLED ||
                status === EmergencyRequestStatus.COMPLETED ||
                status === EmergencyRequestStatus.ACCEPTED ||
                status === EmergencyRequestStatus.ARRIVED
                ? status
                : EmergencyRequestStatus.IN_PROGRESS;

        const result = await this.update(id, { status: nextStatus });

        // Dispatch notification
        try {
            const request = await this.getActive();
            if (request && (String(request.id) === String(id) || String(request.requestId) === String(id))) {
                await notificationDispatcher.dispatchEmergencyUpdate(request, nextStatus);
            }
        } catch (e) {
            console.warn("Failed to dispatch emergency update:", e);
        }

        return result;
    },

    async updateTriage(id, triageSnapshot, options = {}) {
        if (!id || !triageSnapshot || typeof triageSnapshot !== "object") {
            return null;
        }

        const reason =
            typeof options.reason === "string" && options.reason.trim()
                ? options.reason.trim()
                : "triage_parallel_capture";

        try {
            return await this.update(id, {
                triageSnapshot,
                transition_reason: reason,
            });
        } catch (error) {
            console.warn("[emergencyRequestsService] updateTriage failed (non-blocking):", error);
            return null;
        }
    },

    async getActive() {
        const items = await this.list();
        return (
            items.find(
                (r) =>
                    r?.status === EmergencyRequestStatus.PENDING_APPROVAL ||
                    r?.status === EmergencyRequestStatus.IN_PROGRESS ||
                    r?.status === EmergencyRequestStatus.ACCEPTED ||
                    r?.status === EmergencyRequestStatus.ARRIVED
            ) ?? null
        );
    },

    // REAL-TIME SUBSCRIPTIONS
    async subscribeToEmergencyUpdates(requestId, callback, onStatus = null) {
        const requestKey = String(requestId ?? "");
        const requestIdIsUuid = isValidUUID(requestKey);
        const filter = requestIdIsUuid
            ? `id=eq.${requestKey}`
            : `display_id=eq.${requestKey}`;

        const channel = supabase
            .channel(`emergency_${requestKey}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'emergency_requests',
                    filter
                },
                callback
            )
            .subscribe((status) => {
                if (typeof onStatus === 'function') {
                    onStatus(status);
                }
            });

        return () => supabase.removeChannel(channel);
    },

    async subscribeToAmbulanceLocation(requestId, callback, onStatus = null) {
        const requestKey = String(requestId ?? "");
        let requestUuid = requestKey;

        if (!isValidUUID(requestKey)) {
            try {
                const { data, error } = await supabase
                    .from('emergency_requests')
                    .select('id')
                    .eq('display_id', requestKey)
                    .limit(1)
                    .maybeSingle();

                if (!error && data?.id && isValidUUID(data.id)) {
                    requestUuid = data.id;
                }
            } catch (resolveError) {
                console.warn('[emergencyRequestsService] Could not resolve request UUID for ambulance subscription:', resolveError);
            }
        }

        const filterValue = isValidUUID(requestUuid) ? requestUuid : requestKey;
        const channel = supabase
            .channel(`ambulance_location_${filterValue}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'ambulances',
                    filter: `current_call=eq.${filterValue}`
                },
                callback
            )
            .subscribe((status) => {
                if (typeof onStatus === 'function') {
                    onStatus(status);
                }
            });

        return () => supabase.removeChannel(channel);
    },

    async subscribeToHospitalBeds(hospitalId, callback, onStatus = null) {
        const channel = supabase
            .channel(`hospital_beds_${hospitalId}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'hospitals',
                    filter: `id=eq.${hospitalId}`
                },
                callback
            )
            .subscribe((status) => {
                if (typeof onStatus === 'function') {
                    onStatus(status);
                }
            });

        return () => supabase.removeChannel(channel);
    },

    // INSURANCE COVERAGE METHODS
    async calculateRequestCost(requestId) {
        try {
            const { data: request, error } = await supabase
                .from('emergency_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (error) throw error;

            const costBreakdown = await calculateEmergencyCost(request);
            return costBreakdown;
        } catch (error) {
            console.error('Error calculating request cost:', error);
            throw error;
        }
    },

    async checkRequestInsuranceCoverage(requestId) {
        try {
            const { data: request, error } = await supabase
                .from('emergency_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (error) throw error;

            const coverage = await checkInsuranceCoverage(request.user_id, request);
            return coverage;
        } catch (error) {
            console.error('Error checking insurance coverage:', error);
            throw error;
        }
    },
};

