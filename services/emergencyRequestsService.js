import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";

export const EmergencyRequestStatus = {
	IN_PROGRESS: "in_progress",
	ACCEPTED: "accepted",
	ARRIVED: "arrived",
	COMPLETED: "completed",
	CANCELLED: "cancelled",
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
                .in('status', ['in_progress', 'accepted', 'arrived'])
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
                }));
                
                await database.write(StorageKeys.EMERGENCY_REQUESTS, requests);

                if (__DEV__) {
                    // console.log("[emergencyRequestsService.list] Supabase active requests:", {
                    //     count: requests.length,
                    //     ids: requests.slice(0, 3).map((r) => r?.id),
                    // });
                }
                
                return requests;
            }
        }

        // Fallback to local
		const items = await database.read(StorageKeys.EMERGENCY_REQUESTS, []);
        if (__DEV__) {
            // console.log("[emergencyRequestsService.list] Using local cache:", {
            //     hasUser: !!user,
            //     count: Array.isArray(items) ? items.length : 0,
            // });
        }
		if (!Array.isArray(items)) return [];
		return items
			.filter((r) => r && typeof r === "object")
			.sort((a, b) => String(b?.createdAt ?? "").localeCompare(String(a?.createdAt ?? "")));
	},

	async create(request) {
        const { data: { user } } = await supabase.auth.getUser();
		const now = new Date().toISOString();
		const id = request?.id ? String(request.id) : request?.requestId ? String(request.requestId) : `er_${Date.now()}`;
		
        const item = {
			id,
			requestId: id,
			serviceType: request?.serviceType ?? null,
			hospitalId: request?.hospitalId ?? null,
			hospitalName: request?.hospitalName ?? null,
			specialty: request?.specialty ?? null,
			ambulanceType: request?.ambulanceType ?? null,
			ambulanceId: request?.ambulanceId ?? null,
			bedNumber: request?.bedNumber ?? null,
			bedType: request?.bedType ?? null,
			bedCount: request?.bedCount ?? null,
			estimatedArrival: request?.estimatedArrival ?? null,
			status: request?.status ?? EmergencyRequestStatus.IN_PROGRESS,
			patient: request?.patient ?? null,
			shared: request?.shared ?? null,
			createdAt: request?.createdAt ?? now,
			updatedAt: now,
		};

        if (user) {
            const { error } = await supabase
                .from('emergency_requests')
                .insert({
                    id: item.id,
                    request_id: item.requestId,
                    user_id: user.id,
                    service_type: item.serviceType,
                    hospital_id: item.hospitalId,
                    hospital_name: item.hospitalName,
                    specialty: item.specialty,
                    ambulance_type: item.ambulanceType,
                    ambulance_id: item.ambulanceId,
                    bed_number: item.bedNumber,
                    bed_type: item.bedType,
                    bed_count: item.bedCount,
                    estimated_arrival: item.estimatedArrival,
                    status: item.status,
                    patient_snapshot: item.patient,
                    shared_data_snapshot: item.shared,
                    created_at: item.createdAt,
                    updated_at: item.updatedAt
                });
            
            if (error) {
                console.error("Error creating emergency request:", error);
                throw error;
            }
        } else {
            await database.createOne(StorageKeys.EMERGENCY_REQUESTS, item);
        }

		return item;
	},

	async update(id, updates) {
        // console.log(`[emergencyRequestsService] Update requested for ${id}`, updates);
        const { data: { user } } = await supabase.auth.getUser();
		const requestId = String(id);
        const nextUpdatedAt = new Date().toISOString();

        if (user) {
            // console.log(`[emergencyRequestsService] Updating in Supabase for user ${user.id}`);
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
            
            const { error, data } = await supabase
                .from('emergency_requests')
                .update(dbUpdates)
                .eq('id', requestId)
                .eq('user_id', user.id)
                .select();
            
            if (error) {
                console.error(`[emergencyRequestsService] Supabase update failed for ${requestId}:`, error);
                throw error;
            }
            if (!data || data.length === 0) {
                // console.warn(`[emergencyRequestsService] No request found with id ${requestId} in Supabase (queried with id and user_id)`);
                // Try querying with request_id instead of id if it's different
                // console.log(`[emergencyRequestsService] Retrying update using request_id column...`);
                const { error: error2, data: data2 } = await supabase
                    .from('emergency_requests')
                    .update(dbUpdates)
                    .eq('request_id', requestId)
                    .eq('user_id', user.id)
                    .select();
                
                if (error2) {
                    console.error(`[emergencyRequestsService] Supabase retry update failed for ${requestId}:`, error2);
                    throw error2;
                }
                if (!data2 || data2.length === 0) {
                    console.error(`[emergencyRequestsService] Still no request found with request_id ${requestId} in Supabase`);
                } else {
                    // console.log(`[emergencyRequestsService] Updated ${requestId} via request_id column in Supabase:`, data2[0]);
                }
            } else {
                // console.log(`[emergencyRequestsService] Updated ${requestId} in Supabase:`, data[0]);
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

	async setStatus(id, status) {
		const nextStatus =
			status === EmergencyRequestStatus.CANCELLED ||
			status === EmergencyRequestStatus.COMPLETED ||
			status === EmergencyRequestStatus.ACCEPTED ||
			status === EmergencyRequestStatus.ARRIVED
				? status
				: EmergencyRequestStatus.IN_PROGRESS;
		return await this.update(id, { status: nextStatus });
	},

	async getActive() {
		const items = await this.list();
		return (
			items.find(
				(r) =>
					r?.status === EmergencyRequestStatus.IN_PROGRESS ||
					r?.status === EmergencyRequestStatus.ACCEPTED ||
					r?.status === EmergencyRequestStatus.ARRIVED
			) ?? null
		);
	},
};

