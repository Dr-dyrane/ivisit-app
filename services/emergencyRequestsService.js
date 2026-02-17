import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import { notificationDispatcher } from "./notificationDispatcher";
import { calculateEmergencyCost, checkInsuranceCoverage } from "./pricingService";
import { v4 as uuidv4 } from "uuid";

export const EmergencyRequestStatus = {
    PENDING_APPROVAL: "pending_approval",
    IN_PROGRESS: "in_progress",
    ACCEPTED: "accepted",
    ARRIVED: "arrived",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    PAYMENT_DECLINED: "payment_declined",
};

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
                const requests = rows.map((r) => ({
                    id: r.id,
                    requestId: r.request_id,
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
                    patient: r.patient_snapshot,
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
                }));

                await database.write(StorageKeys.EMERGENCY_REQUESTS, requests);

                return requests;
            }
        }

        // Fallback to local
        const items = await database.read(StorageKeys.EMERGENCY_REQUESTS, []);
        if (!Array.isArray(items)) return [];
        return items
            .filter((r) => r && typeof r === "object")
            .sort((a, b) => String(b?.createdAt ?? "").localeCompare(String(a?.createdAt ?? "")));
    },

    async create(request) {
        const { data: { user } } = await supabase.auth.getUser();
        const now = new Date().toISOString();
        const displayId = request?.requestId || `REQ-${Date.now()}`;

        // Prepare common fields
        const commonFields = {
            request_id: displayId,
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
            patient_snapshot: request?.patient ?? null,
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
            // NEW FLOW: Atomic Creation with Payment
            // If we have payment method and cost, we use the robust RPC
            if (request.paymentMethodId || request.payment_method_id) {
                const method = request.paymentMethodId || request.payment_method_id;
                // Map 'cash' keyword or UUIDs
                const isCash = method === 'cash' || (typeof method === 'string' && method.toLowerCase().includes('cash'));

                // Determine amounts
                // If total_cost is passed, we use it. If base_cost is missing, we re-derive or default.
                const total = parseFloat(request.total_cost || request.totalCost || 0);
                const base = parseFloat(request.base_cost || request.baseCost || (total / 1.025)); // Estimate if missing

                console.log('[emergencyRequestsService] Creating paid request via RPC:', {
                    method, isCash, total, base, displayId,
                    hospitalId: request.hospitalId
                });

                const { data, error } = await supabase.rpc('create_emergency_v3', {
                    p_payment_data: {
                        method: isCash ? 'cash' : 'card',
                        total_amount: total,
                        base_amount: base,
                        currency: 'USD',
                    },
                    p_request_data: {
                        hospital_id: request.hospitalId,
                        service_type: request.serviceType,
                        specialty: request.specialty,
                        patient_location: request.patientLocation,
                        patient_snapshot: request.patient,
                        request_id: displayId,
                    },
                    p_user_id: user.id
                });

                if (error) {
                    console.error('[emergencyRequestsService] RPC Creation Failed:', error);
                    throw error;
                }

                if (!data.success) {
                    console.error('[emergencyRequestsService] RPC returned error:', data.error);
                    throw new Error(data.error || 'Failed to create emergency request');
                }

                console.log('[emergencyRequestsService] ✅ RPC Success:', {
                    requestId: data.request_id,
                    paymentId: data.payment_id,
                    displayId: data.display_id,
                    feeAmount: data.fee_amount,
                    requiresApproval: data.requires_approval,
                    paymentStatus: data.payment_status,
                    emergencyStatus: data.emergency_status,
                });

                return {
                    ...request,
                    id: data.request_id, // The real UUID from DB
                    requestId: data.display_id || displayId,
                    paymentId: data.payment_id,
                    createdAt: now,
                    updatedAt: now,
                    status: data.emergency_status || EmergencyRequestStatus.IN_PROGRESS,
                    paymentStatus: data.payment_status || 'completed',
                    requiresApproval: data.requires_approval || false,
                    feeAmount: data.fee_amount || 0,
                };
            }

            // Fallback: Standard Insert (Legacy or No-Payment Flow)
            const uuid = uuidv4();
            const { data, error } = await supabase
                .from('emergency_requests')
                .insert({ ...commonFields, id: uuid, user_id: user.id })
                .select()
                .single();

            if (error) {
                console.error("Supabase Create Error:", error);
                throw error;
            }

            // Return standardized object
            return {
                ...request,
                id: data.id, // The real UUID
                requestId: data.request_id,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } else {
            // Local fallback
            const localItem = {
                ...request,
                ...commonFields,
                id: displayId, // Use display ID as PK for local storage
                requestId: displayId,
                createdAt: now,
                updatedAt: now
            };
            await database.createOne(StorageKeys.EMERGENCY_REQUESTS, localItem);
            return localItem;
        }
    },

    async update(id, updates) {
        const { data: { user } } = await supabase.auth.getUser();
        const requestId = String(id);
        const nextUpdatedAt = new Date().toISOString();

        // Detect if this is a real UUID or a display ID (e.g., AMB-449811)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);

        if (user) {
            const dbUpdates = { updated_at: nextUpdatedAt };
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.hospitalId !== undefined) dbUpdates.hospital_id = updates.hospitalId;
            if (updates.hospitalName !== undefined) dbUpdates.hospital_name = updates.hospitalName;
            if (updates.specialty !== undefined) dbUpdates.specialty = updates.specialty;
            if (updates.ambulanceType !== undefined) dbUpdates.ambulance_type = updates.ambulanceType;
            if (updates.ambulanceId !== undefined) dbUpdates.ambulance_id = updates.ambulanceId;
            if (updates.bedNumber !== undefined) dbUpdates.bed_number = updates.bedNumber;
            if (updates.bedType !== undefined) dbUpdates.bed_type = updates.bedType;
            if (updates.bedCount !== undefined) dbUpdates.bed_count = updates.bedCount;
            if (updates.estimatedArrival !== undefined) dbUpdates.estimated_arrival = updates.estimatedArrival;
            if (updates.patientLocation !== undefined) dbUpdates.patient_location = updates.patientLocation;
            if (updates.patientHeading !== undefined) dbUpdates.patient_heading = updates.patientHeading;
            if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
            if (updates.paymentMethodId !== undefined) dbUpdates.payment_method_id = updates.paymentMethodId;
            if (updates.totalCost !== undefined) dbUpdates.total_cost = updates.totalCost;

            if (isUUID) {
                // Try by UUID primary key first
                const { error, data } = await supabase
                    .from('emergency_requests')
                    .update(dbUpdates)
                    .eq('id', requestId)
                    .eq('user_id', user.id)
                    .select();

                if (error) {
                    console.error(`[emergencyRequestsService] Update failed for UUID ${requestId}:`, error);
                    throw error;
                }
                if (data && data.length > 0) return { id: requestId, ...updates, updatedAt: nextUpdatedAt };
            }

            // Fallback: try by request_id (display ID column, TEXT type)
            console.log(`[emergencyRequestsService] Trying update by request_id: ${requestId}`);
            const { error: error2, data: data2 } = await supabase
                .from('emergency_requests')
                .update(dbUpdates)
                .eq('request_id', requestId)
                .eq('user_id', user.id)
                .select();

            if (error2) {
                console.error(`[emergencyRequestsService] Update by request_id also failed for ${requestId}:`, error2);
                throw error2;
            }
            if (data2 && data2.length > 0) {
                console.log(`[emergencyRequestsService] ✅ Updated via request_id: ${requestId}`);
            } else {
                console.warn(`[emergencyRequestsService] No rows matched for ${requestId} (neither id nor request_id)`);
            }
        }

        if (!user) {
            const item = await database.updateOne(
                StorageKeys.EMERGENCY_REQUESTS,
                (r) => String(r?.id ?? r?.requestId) === requestId,
                { ...updates, updatedAt: nextUpdatedAt }
            );
            return item;
        }

        return { id: requestId, ...updates, updatedAt: nextUpdatedAt };
    },

    /**
     * Efficiently update only location (for tracking loops)
     */
    async updateLocation(id, location, heading) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Only sync location if logged in

        const { error } = await supabase
            .from('emergency_requests')
            .update({
                patient_location: location, // Expects PostGIS point or compatible format if using raw SQL, but JS client handles basic objects often? 
                // Actually, Supabase JS client usually needs `st_point(lon, lat)` via RPC or a specific format.
                // However, if the column is geography, sending a GeoJSON object often works:
                // { type: 'Point', coordinates: [lon, lat] }
                patient_heading: heading,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            // console.warn("Failed to update patient location:", error);
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
    async subscribeToEmergencyUpdates(requestId, callback) {
        const channel = supabase
            .channel(`emergency_${requestId}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'emergency_requests',
                    filter: `id=eq.${requestId}`
                },
                callback
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    async subscribeToAmbulanceLocation(requestId, callback) {
        const channel = supabase
            .channel(`ambulance_location_${requestId}`)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'ambulances',
                    filter: `current_call=eq.${requestId}`
                },
                callback
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    async subscribeToHospitalBeds(hospitalId, callback) {
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
            .subscribe();

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
