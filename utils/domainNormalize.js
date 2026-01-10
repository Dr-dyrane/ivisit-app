import { VISIT_STATUS } from "../constants/visits";
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES } from "../constants/notifications";

const toIsoString = (value) => {
	if (typeof value === "string") {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) return d.toISOString();
	}
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
	return new Date().toISOString();
};

const toStringId = (value, fallbackPrefix) => {
	if (typeof value === "string" && value.trim()) return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return `${fallbackPrefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
};

const dedupeByIdKeepNewest = (items, getId, getTimestampMs) => {
	const map = new Map();
	for (const item of items) {
		const id = getId(item);
		if (!id) continue;
		const prev = map.get(id);
		if (!prev) {
			map.set(id, item);
			continue;
		}
		const prevTs = getTimestampMs(prev);
		const nextTs = getTimestampMs(item);
		if ((nextTs ?? 0) >= (prevTs ?? 0)) map.set(id, item);
	}
	return Array.from(map.values());
};

export const normalizeVisit = (raw, index = 0) => {
	if (!raw || typeof raw !== "object") return null;
	const id = toStringId(raw.id ?? raw.visitId, "visit");
	const hospital = typeof raw.hospital === "string" ? raw.hospital : null;
	const hospitalId =
		typeof raw.hospitalId === "string" && raw.hospitalId.trim()
			? raw.hospitalId
			: null;
	const statusValue = typeof raw.status === "string" ? raw.status : "";
	const status =
		Object.values(VISIT_STATUS).includes(statusValue) ? statusValue : VISIT_STATUS.UPCOMING;

	return {
		...raw,
		id,
		hospitalId: hospitalId || null,
		hospital: hospital || raw.hospital || "Hospital",
		status,
	};
};

export const normalizeVisitsList = (input) => {
	if (!Array.isArray(input)) return [];
	const normalized = input
		.map((v, idx) => normalizeVisit(v, idx))
		.filter((v) => v && typeof v === "object");
	const deduped = dedupeByIdKeepNewest(
		normalized,
		(v) => String(v?.id ?? ""),
		(v) => {
			const d = typeof v?.date === "string" ? new Date(v.date) : null;
			return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
		}
	);
	return deduped;
};

export const normalizeNotification = (raw, index = 0) => {
	if (!raw || typeof raw !== "object") return null;
	const id = toStringId(raw.id ?? raw.notificationId, "notification");
	const typeValue = typeof raw.type === "string" ? raw.type : "";
	const type = Object.values(NOTIFICATION_TYPES).includes(typeValue)
		? typeValue
		: NOTIFICATION_TYPES.SYSTEM;
	const priorityValue = typeof raw.priority === "string" ? raw.priority : "";
	const priority = Object.values(NOTIFICATION_PRIORITY).includes(priorityValue)
		? priorityValue
		: NOTIFICATION_PRIORITY.NORMAL;
	const timestamp = toIsoString(raw.timestamp ?? raw.createdAt ?? raw.updatedAt);
	const read = raw.read === true;
	const actionData = raw.actionData && typeof raw.actionData === "object" ? raw.actionData : {};

	return {
		...raw,
		id,
		type,
		priority,
		timestamp,
		read,
		actionType: typeof raw.actionType === "string" ? raw.actionType : null,
		actionData,
		title: typeof raw.title === "string" ? raw.title : "Update",
		message: typeof raw.message === "string" ? raw.message : "",
	};
};

export const normalizeNotificationsList = (input) => {
	if (!Array.isArray(input)) return [];
	const normalized = input
		.map((n, idx) => normalizeNotification(n, idx))
		.filter((n) => n && typeof n === "object");
	const deduped = dedupeByIdKeepNewest(
		normalized,
		(n) => String(n?.id ?? ""),
		(n) => {
			const d = typeof n?.timestamp === "string" ? new Date(n.timestamp) : null;
			return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
		}
	);
	return deduped.sort((a, b) => String(b?.timestamp ?? "").localeCompare(String(a?.timestamp ?? "")));
};

export const normalizeEmergencyState = (raw) => {
	const base = raw && typeof raw === "object" ? raw : {};
	const modeValue = base?.mode;
	const mode =
		modeValue === "emergency" || modeValue === "booking"
			? modeValue
			: "emergency";

	const normalizeTrip = (trip) => {
		if (!trip || typeof trip !== "object") return null;
		if (!trip?.hospitalId) return null;
		return {
			...trip,
			hospitalId: String(trip.hospitalId),
			requestId:
				typeof trip.requestId === "string"
					? trip.requestId
					: typeof trip.requestId === "number"
						? String(trip.requestId)
						: null,
			startedAt: Number.isFinite(trip.startedAt) ? trip.startedAt : Date.now(),
		};
	};

	const normalizeBooking = (booking) => {
		if (!booking || typeof booking !== "object") return null;
		if (!booking?.hospitalId) return null;
		return {
			...booking,
			hospitalId: String(booking.hospitalId),
			requestId:
				typeof booking.requestId === "string"
					? booking.requestId
					: typeof booking.requestId === "number"
						? String(booking.requestId)
						: null,
			bookingId:
				typeof booking.bookingId === "string"
					? booking.bookingId
					: typeof booking.bookingId === "number"
						? String(booking.bookingId)
						: booking.requestId
							? String(booking.requestId)
							: null,
			startedAt: Number.isFinite(booking.startedAt) ? booking.startedAt : Date.now(),
		};
	};

	return {
		...base,
		mode,
		activeAmbulanceTrip: normalizeTrip(base.activeAmbulanceTrip),
		activeBedBooking: normalizeBooking(base.activeBedBooking),
	};
};

