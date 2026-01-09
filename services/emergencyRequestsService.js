import { database, StorageKeys } from "../database";

export const EmergencyRequestStatus = {
	IN_PROGRESS: "in_progress",
	COMPLETED: "completed",
	CANCELLED: "cancelled",
};

export const emergencyRequestsService = {
	async list() {
		const items = await database.read(StorageKeys.EMERGENCY_REQUESTS, []);
		if (!Array.isArray(items)) return [];
		return items
			.filter((r) => r && typeof r === "object")
			.sort((a, b) => String(b?.createdAt ?? "").localeCompare(String(a?.createdAt ?? "")));
	},

	async create(request) {
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
		await database.createOne(StorageKeys.EMERGENCY_REQUESTS, item);
		return item;
	},

	async update(id, updates) {
		const requestId = String(id);
		const item = await database.updateOne(
			StorageKeys.EMERGENCY_REQUESTS,
			(r) => String(r?.id ?? r?.requestId) === requestId,
			{ ...updates, updatedAt: new Date().toISOString() }
		);
		return item;
	},

	async setStatus(id, status) {
		const nextStatus =
			status === EmergencyRequestStatus.CANCELLED || status === EmergencyRequestStatus.COMPLETED
				? status
				: EmergencyRequestStatus.IN_PROGRESS;
		return await this.update(id, { status: nextStatus });
	},

	async getActive() {
		const items = await this.list();
		return (
			items.find((r) => r?.status === EmergencyRequestStatus.IN_PROGRESS) ?? null
		);
	},
};

