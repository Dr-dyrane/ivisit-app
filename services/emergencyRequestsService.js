import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
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
    responderId: r.responder_id ?? null,
    currentResponderAssignmentId:
        r.current_responder_assignment_id ?? null,
    dispatchOrganizationId: r.dispatch_organization_id ?? null,
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
    dispatchAcceptedAt:
        r.dispatchAcceptedAt ?? r.dispatch_accepted_at ?? null,
    responderArrivedAt:
        r.responderArrivedAt ?? r.responder_arrived_at ?? null,
    responderName: r.responder_name,
    responderPhone: r.responder_phone,
    responderVehicleType: r.responder_vehicle_type,
    responderVehiclePlate: r.responder_vehicle_plate,
    responderLocation: r.responder_location,
    responderHeading: r.responder_heading,
    responderLocationAccuracyMeters: r.responder_location_accuracy_meters ?? null,
    responderLocationObservedAt: r.responder_location_observed_at ?? null,
    responderLocationReceivedAt: r.responder_location_received_at ?? null,
    responderTelemetrySequence: r.responder_telemetry_sequence ?? null,
    responderTelemetryLeaseExpiresAt:
        r.responder_telemetry_lease_expires_at ?? null,
    patientAcknowledgedArrivalAt: r.patient_acknowledged_arrival_at ?? null,
    patientLocation: r.patient_location,
    patientHeading: r.patient_heading,
});

const attachLifecycleTransitionTimes = async (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const requestIds = sourceRows
        .map((row) => row?.id)
        .filter((id) => typeof id === "string" && id);
    if (requestIds.length === 0) return sourceRows;

    const { data, error } = await supabase
        .from("emergency_status_transitions")
        .select("emergency_request_id, to_status, occurred_at")
        .in("emergency_request_id", requestIds)
        .in("to_status", [EmergencyRequestStatus.ACCEPTED, EmergencyRequestStatus.ARRIVED])
        .order("occurred_at", { ascending: true });

    if (error) {
        if (__DEV__) {
            console.warn(
                "[emergencyRequestsService] Lifecycle timestamps unavailable:",
                error.message,
            );
        }
        return sourceRows;
    }

    const lifecycleByRequest = new Map();
    for (const transition of Array.isArray(data) ? data : []) {
        const requestId = transition?.emergency_request_id;
        if (!requestId) continue;
        const current = lifecycleByRequest.get(requestId) || {};
        if (
            transition?.to_status === EmergencyRequestStatus.ACCEPTED &&
            !current.dispatchAcceptedAt
        ) {
            current.dispatchAcceptedAt = transition.occurred_at ?? null;
        }
        if (
            transition?.to_status === EmergencyRequestStatus.ARRIVED &&
            !current.responderArrivedAt
        ) {
            current.responderArrivedAt = transition.occurred_at ?? null;
        }
        lifecycleByRequest.set(requestId, current);
    }

    return sourceRows.map((row) => ({
        ...row,
        ...(lifecycleByRequest.get(row?.id) || {}),
    }));
};

const createActiveRequestError = (serviceType, activeRequest) => {
    const label = serviceType === "bed" ? "bed reservation" : "ambulance request";
    const error = new Error(`You already have an active ${label}.`);
    error.code = ACTIVE_EMERGENCY_REQUEST_ERROR_CODE;
    error.serviceType = serviceType;
    error.activeRequest = activeRequest ?? null;
    return error;
};

const requireEmergencyUser = (user) => {
    if (user?.id) return user;
    const error = new Error("Sign in to request or change emergency care.");
    error.code = "AUTH_REQUIRED";
    throw error;
};

const isGuardedServiceType = (serviceType) =>
    serviceType === "ambulance" || serviceType === "bed";

export const emergencyRequestsService = {
    async list() {
        const { data: { user } } = await supabase.auth.getUser();
        requireEmergencyUser(user);

        const { data, error } = await supabase
            .from('emergency_requests')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived'])
            .order('created_at', { ascending: false });

        // The persisted trip store already supplies last-known presentation while
        // this query retries. The legacy collection cache is not user-scoped and
        // must never masquerade as a successful canonical read.
        if (error) throw error;

        const rows = await attachLifecycleTransitionTimes(
            Array.isArray(data) ? data : [],
        );
        const requests = rows.map(mapEmergencyRequestRow);
        await database.write(StorageKeys.EMERGENCY_REQUESTS, requests);

        return requests;
    },

    async create(request) {
        const { data: { user } } = await supabase.auth.getUser();
        requireEmergencyUser(user);
        const now = new Date().toISOString();
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
            const isCard = !isCash && !isWallet;
            const deferDispatchUntilPayment = isCard;
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
                    ambulance_type: request.ambulanceType,
                    bed_number: request.bedNumber,
                    bed_type: request.bedType,
                    bed_count: request.bedCount,
                    distance_km: Number.isFinite(Number(request.distanceKm))
                        ? Number(request.distanceKm)
                        : 0
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
                awaitsPaymentConfirmation:
                    isCard || data.awaits_payment_confirmation === true,
                requiresWalletSettlement:
                    isWallet || data.requires_wallet_settlement === true,
                paymentStatus: data.payment_status || null,
                canonicalTotal: Number.isFinite(Number(data.canonical_total))
                    ? Number(data.canonical_total)
                    : null,
                pricing: data.pricing && typeof data.pricing === "object" ? data.pricing : null,
                pricingSource: data.pricing_source || data.pricing?.pricing_source || null,
                pricingIsFallback:
                    data.pricing_is_fallback === true ||
                    data.pricing?.pricing_is_fallback === true,
                currency: data.currency || request.currency || 'USD',
            };
    },

    async update(id, updates) {
        const { data: { user } } = await supabase.auth.getUser();
        requireEmergencyUser(user);
        const requestId = String(id);
        const nextUpdatedAt = new Date().toISOString();
        const requestedStatus = updates.status === undefined
            ? null
            : canonicalizeEmergencyStatus(updates.status, null);

        if (
            requestedStatus !== null &&
            requestedStatus !== EmergencyRequestStatus.CANCELLED
        ) {
            throw new Error('Patients may only cancel an emergency request');
        }

        const resolvedRequestId = await resolveOwnedRequestUuid(requestId, user.id);
        if (!resolvedRequestId) {
            throw new Error("Emergency request not found or no longer available.");
        }

        const rpcPayload = {};
        if (requestedStatus !== null) {
            rpcPayload.status = requestedStatus;
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
        if (status !== EmergencyRequestStatus.CANCELLED) {
            throw new Error('Patients may only cancel an emergency request');
        }

        const result = await this.update(id, { status });
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

    async getOwnedById(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !id) return null;

        const requestId = String(id);
        const resolvedRequestId = await resolveOwnedRequestUuid(requestId, user.id);
        if (!resolvedRequestId) return null;

        const { data, error } = await supabase
            .from('emergency_requests')
            .select('*')
            .eq('id', resolvedRequestId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;
        const [row] = await attachLifecycleTransitionTimes([data]);
        return mapEmergencyRequestRow(row);
    },

    async syncDemoResponderLifecycle(id, action, payload = {}) {
        const requestId = String(id ?? "").trim();
        const normalizedAction = String(action ?? "").trim().toLowerCase();
        if (!requestId) throw new Error("Emergency request id is required");
        if (
            ![
                "ensure_dispatch",
                "report_telemetry",
                "mark_arrived",
                "mark_completed",
            ].includes(normalizedAction)
        ) {
            throw new Error("Unsupported demo emergency lifecycle action");
        }

        const { data, error } = await supabase.functions.invoke(
            "demo-emergency-lifecycle",
            {
                body: {
                    requestId,
                    action: normalizedAction,
                    ...(normalizedAction === "report_telemetry"
                        ? { telemetry: payload?.telemetry || payload }
                        : {}),
                },
            },
        );
        if (error) throw error;
        if (!data?.success && data?.retryable !== true) {
            const lifecycleError = new Error(
                data?.error || "Demo emergency lifecycle could not advance",
            );
            lifecycleError.code = data?.code || null;
            throw lifecycleError;
        }

        return {
            ...data,
            request: data?.request ? mapEmergencyRequestRow(data.request) : null,
        };
    },

    async acknowledgeResponderArrival(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const requestId = String(id ?? '');
        const resolvedRequestId = await resolveOwnedRequestUuid(requestId, user.id);
        if (!resolvedRequestId) {
            throw new Error('Emergency request not found');
        }

        const { data, error } = await supabase.rpc(
            'patient_acknowledge_responder_arrival',
            { p_request_id: resolvedRequestId }
        );
        if (error) throw error;
        if (!data?.success) {
            throw new Error(data?.error || 'Could not acknowledge responder arrival');
        }

        return {
            success: true,
            requestId: data.request_id || resolvedRequestId,
            patientAcknowledgedArrivalAt:
                data.acknowledged_at ||
                data.patient_acknowledged_arrival_at ||
                null,
            status:
                data.request_status || data.status || data.request?.status || null,
            request: data.request ? mapEmergencyRequestRow(data.request) : null,
        };
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

