import {
	EMERGENCY_VISIT_LIFECYCLE,
	VISIT_STATUS,
	VISIT_TYPES,
} from "../../constants/visits";
import { resolveHistoryServiceLabel } from "../../components/map/history/history.presentation";

export const REQUEST_HISTORY_GROUP_ORDER = [
	"active_now",
	"upcoming",
	"today",
	"yesterday",
	"this_week",
	"last_week",
	"this_month",
	"last_month",
	"older",
];

export const REQUEST_HISTORY_GROUP_LABELS = {
	active_now: "Active now",
	upcoming: "Upcoming",
	today: "Today",
	yesterday: "Yesterday",
	this_week: "This week",
	last_week: "Last week",
	this_month: "This month",
	last_month: "Last month",
	older: "Older",
};

const ACTIVE_HISTORY_STATUSES = new Set(["active", "rating_pending"]);
const UPCOMING_HISTORY_STATUSES = new Set(["pending", "confirmed"]);

const toText = (value) => (typeof value === "string" ? value.trim() : "");

const toLower = (value) => toText(value).toLowerCase();

const toFiniteNumber = (value) => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const normalized = value.replace(/[^0-9.-]/g, "");
		if (!normalized) return null;
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const toCurrencyLabel = (value) => {
	const numeric = toFiniteNumber(value);
	if (numeric != null) return `$${numeric.toFixed(2)}`;
	const text = toText(value);
	return text || null;
};

const toDate = (value) => {
	if (!value) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}
	if (typeof value === "string") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}
	return null;
};

const parseTimeParts = (timeValue) => {
	const normalized = toText(timeValue).toUpperCase();
	if (!normalized) return { hours: 12, minutes: 0 };

	const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
	if (!match) return { hours: 12, minutes: 0 };

	let hours = Number(match[1]);
	const minutes = Number(match[2] || 0);
	const meridiem = match[3] || null;

	if (meridiem === "AM" && hours === 12) hours = 0;
	if (meridiem === "PM" && hours < 12) hours += 12;

	return {
		hours: Number.isFinite(hours) ? hours : 12,
		minutes: Number.isFinite(minutes) ? minutes : 0,
	};
};

const buildVisitDateTime = (visit) => {
	const dateValue = toText(visit?.date);
	const timeValue = toText(visit?.time);
	if (!dateValue && !timeValue) return null;

	const directDate = toDate(dateValue);
	if (directDate) {
		if (!timeValue) return directDate;
		const { hours, minutes } = parseTimeParts(timeValue);
		return new Date(
			directDate.getFullYear(),
			directDate.getMonth(),
			directDate.getDate(),
			hours,
			minutes,
			0,
			0,
		);
	}

	const combined = [dateValue, timeValue].filter(Boolean).join(" ");
	return toDate(combined);
};

const startOfDay = (date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

const startOfWeek = (date) => {
	const next = startOfDay(date);
	const day = next.getDay();
	next.setDate(next.getDate() - day);
	return next;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const inferRequestType = (visit) => {
	const lifecycleState = toLower(visit?.lifecycleState);
	const type = toLower(visit?.type);
	if (
		type.includes("bed") ||
		type.includes("room") ||
		lifecycleState === EMERGENCY_VISIT_LIFECYCLE.OCCUPIED
	) {
		return "bed";
	}
	if (
		type.includes("ambulance") ||
		type.includes("emergency") ||
		type === toLower(VISIT_TYPES.AMBULANCE_RIDE)
	) {
		return "ambulance";
	}
	return "visit";
};

const inferSourceKind = (visit) => {
	if (toText(visit?.requestId) || toText(visit?.lifecycleState)) {
		return "emergency";
	}
	return "scheduled_visit";
};

const mapLifecycleStatus = (visit) => {
	const lifecycleState = toLower(visit?.lifecycleState);
	switch (lifecycleState) {
		case EMERGENCY_VISIT_LIFECYCLE.INITIATED:
			return "pending";
		case EMERGENCY_VISIT_LIFECYCLE.CONFIRMED:
			return "confirmed";
		case EMERGENCY_VISIT_LIFECYCLE.MONITORING:
		case EMERGENCY_VISIT_LIFECYCLE.ARRIVED:
		case EMERGENCY_VISIT_LIFECYCLE.OCCUPIED:
			return "active";
		case EMERGENCY_VISIT_LIFECYCLE.POST_COMPLETION:
		case EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING:
			return "rating_pending";
		case EMERGENCY_VISIT_LIFECYCLE.COMPLETED:
		case EMERGENCY_VISIT_LIFECYCLE.RATED:
		case EMERGENCY_VISIT_LIFECYCLE.CLEARED:
			return "completed";
		case EMERGENCY_VISIT_LIFECYCLE.CANCELLED:
			return "cancelled";
		default:
			return null;
	}
};

const mapLegacyStatus = (visit) => {
	const status = toLower(visit?.status);
	switch (status) {
		case VISIT_STATUS.IN_PROGRESS:
			return "active";
		case VISIT_STATUS.COMPLETED:
			return "completed";
		case VISIT_STATUS.CANCELLED:
			return "cancelled";
		case VISIT_STATUS.UPCOMING:
			return "confirmed";
		default:
			return "confirmed";
	}
};

const inferHistoryStatus = (visit) => mapLifecycleStatus(visit) || mapLegacyStatus(visit);

const getRequestTypeLabel = (requestType) => {
	switch (requestType) {
		case "ambulance":
			return "Ambulance";
		case "bed":
			return "Bed space";
		default:
			return "Visit";
	}
};

const getStatusLabel = (status) => {
	switch (status) {
		case "pending":
			return "Pending";
		case "confirmed":
			return "Upcoming";
		case "active":
			return "Active";
		case "rating_pending":
			return "Rate visit";
		case "completed":
			return "Completed";
		case "cancelled":
			return "Cancelled";
		case "failed":
			return "Failed";
		case "expired":
			return "Expired";
		default:
			return "Visit";
	}
};

const getStatusTone = (status) => {
	switch (status) {
		case "active":
			return "accent";
		case "rating_pending":
			return "warning";
		case "completed":
			return "success";
		case "cancelled":
		case "failed":
		case "expired":
			return "critical";
		case "pending":
			return "muted";
		default:
			return "neutral";
	}
};

const formatDateLabel = (date) => {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
	try {
		return new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
			year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
		}).format(date);
	} catch (_error) {
		return date.toLocaleDateString();
	}
};

const formatTimeLabel = (date, visit) => {
	if (toText(visit?.time)) return toText(visit.time);
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
	try {
		return new Intl.DateTimeFormat(undefined, {
			hour: "numeric",
			minute: "2-digit",
		}).format(date);
	} catch (_error) {
		return date.toLocaleTimeString();
	}
};

const resolvePrimaryAction = ({ requestType, status, sourceKind }) => {
	if (status === "rating_pending") return "rate_visit";
	if (status === "active") {
		if (sourceKind !== "emergency") return "view_details";
		return requestType === "ambulance" ? "resume_tracking" : "resume_request";
	}
	if (status === "pending") return sourceKind === "emergency" ? "resume_request" : "view_details";
	if (status === "confirmed") return "view_details";
	if (status === "completed" || status === "cancelled" || status === "failed" || status === "expired") {
		return "view_details";
	}
	return null;
};

const resolveSortDate = (visit, status) => {
	const lifecycleDate =
		toDate(visit?.lifecycleUpdatedAt) ||
		toDate(visit?.ratedAt) ||
		toDate(visit?.tippedAt) ||
		toDate(visit?.updatedAt);
	const completedDate = toDate(visit?.completedAt || visit?.ratedAt || visit?.tippedAt);
	const scheduledDate = buildVisitDateTime(visit);
	const createdDate = toDate(visit?.createdAt);

	if (ACTIVE_HISTORY_STATUSES.has(status)) {
		return lifecycleDate || scheduledDate || createdDate || new Date();
	}
	if (UPCOMING_HISTORY_STATUSES.has(status)) {
		return scheduledDate || lifecycleDate || createdDate || new Date();
	}
	if (status === "completed" || status === "cancelled" || status === "failed" || status === "expired") {
		return completedDate || lifecycleDate || scheduledDate || createdDate || new Date();
	}
	return scheduledDate || lifecycleDate || createdDate || new Date();
};

const resolveGroupKey = (status, sortDate, now = new Date()) => {
	if (!(sortDate instanceof Date) || Number.isNaN(sortDate.getTime())) {
		return "older";
	}

	if (ACTIVE_HISTORY_STATUSES.has(status)) return "active_now";
	if (UPCOMING_HISTORY_STATUSES.has(status) && sortDate.getTime() >= startOfDay(now).getTime()) {
		return "upcoming";
	}

	const today = startOfDay(now);
	const yesterday = addDays(today, -1);
	const thisWeek = startOfWeek(now);
	const lastWeek = addDays(thisWeek, -7);
	const thisMonth = startOfMonth(now);
	const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

	const ts = sortDate.getTime();
	if (ts >= today.getTime()) return "today";
	if (ts >= yesterday.getTime()) return "yesterday";
	if (ts >= thisWeek.getTime()) return "this_week";
	if (ts >= lastWeek.getTime()) return "last_week";
	if (ts >= thisMonth.getTime()) return "this_month";
	if (ts >= lastMonth.getTime()) return "last_month";
	return "older";
};

const buildSubtitleParts = (typeLabel, dateLabel, timeLabel) =>
	[typeLabel, dateLabel, timeLabel].filter(Boolean);

const buildInitials = (value) => {
	const parts = toText(value)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2);
	if (parts.length === 0) return null;
	return parts.map((part) => part[0]?.toUpperCase() || "").join("") || null;
};

const resolveVisitTypeLabel = (visit, requestType, requestTypeLabel) => {
	if (requestType === "ambulance") {
		return resolveHistoryServiceLabel({
			requestType,
			value:
				visit?.ambulanceType ||
				visit?.ambulance_type ||
				visit?.responderVehicleType ||
				visit?.type,
			fallbackLabel: requestTypeLabel,
		});
	}

	if (requestType === "bed") {
		return resolveHistoryServiceLabel({
			requestType,
			value:
				visit?.bedType ||
				visit?.bed_type ||
				visit?.roomType ||
				visit?.room_type ||
				visit?.type,
			fallbackLabel: requestTypeLabel,
		});
	}

	return resolveHistoryServiceLabel({
		requestType,
		value: visit?.type,
		fallbackLabel: requestTypeLabel,
	});
};

const resolveActorRole = ({ sourceKind, requestType, actorName }) => {
	if (actorName) {
		if (sourceKind === "scheduled_visit") return "Doctor";
		return requestType === "ambulance" ? "Responder" : "Care team";
	}
	if (sourceKind === "emergency") {
		return requestType === "ambulance" ? "Response team" : "Care team";
	}
	return "Care team";
};

const resolveNextVisitLabel = (visit) => {
	const nextVisit = toText(visit?.nextVisit);
	if (nextVisit) return nextVisit;
	return null;
};

export const toHistoryItem = (visit, now = new Date()) => {
	if (!visit || typeof visit !== "object") return null;

	const requestType = inferRequestType(visit);
	const sourceKind = inferSourceKind(visit);
	const status = inferHistoryStatus(visit);
	const requestTypeLabel = getRequestTypeLabel(requestType);
	const visitTypeLabel = resolveVisitTypeLabel(visit, requestType, requestTypeLabel);
	const specialtyLabel = toText(visit?.specialty);
	const statusLabel = getStatusLabel(status);
	const statusTone = getStatusTone(status);
	const sortDate = resolveSortDate(visit, status);
	const groupKey = resolveGroupKey(status, sortDate, now);
	const dateLabel = formatDateLabel(sortDate);
	const timeLabel = formatTimeLabel(sortDate, visit);
	const facilityName = toText(visit?.hospital || visit?.hospitalName) || "Care request";
	const facilityAddress = toText(
		visit?.address ||
			visit?.hospitalAddress ||
			visit?._hospital_address_resolved
	);
	const actorName = toText(visit?.doctor || visit?.doctorName);
	const actorRole = resolveActorRole({ sourceKind, requestType, actorName });
	const existingRating = Number(visit?.rating);
	const paymentSummary =
		toCurrencyLabel(
			visit?.user_amount ??
				visit?.total_amount ??
				visit?.totalCost ??
				visit?.total_cost ??
				visit?.amount
		) || toCurrencyLabel(visit?.cost);

	return {
		id: String(visit.id),
		requestId: toText(visit?.requestId) || null,
		displayId: toText(visit?.displayId) || null,
		paymentId: toText(visit?.paymentId || visit?.payment_id) || null,
		requestType,
		requestTypeLabel,
		sourceKind,
		status,
		statusLabel,
		statusTone,
		title: facilityName,
		subtitle: buildSubtitleParts(visitTypeLabel, dateLabel, timeLabel).join(" / "),
		facilityName,
		facilityAddress: facilityAddress || null,
		facilityCoordinate:
			Number.isFinite(Number(visit?.latitude)) && Number.isFinite(Number(visit?.longitude))
				? {
						latitude: Number(visit.latitude),
						longitude: Number(visit.longitude),
					}
				: null,
		heroImageUrl: toText(visit?.image || visit?.hospitalImage) || null,
		actorName: actorName || null,
		actorRole: actorRole || null,
		doctorName: actorName || null,
		doctorInitials: buildInitials(actorName),
		specialty: specialtyLabel || null,
		visitTypeLabel,
		roomNumber: toText(visit?.roomNumber) || null,
		nextVisitLabel: resolveNextVisitLabel(visit),
		createdAt: toText(visit?.createdAt) || null,
		scheduledFor: buildVisitDateTime(visit)?.toISOString() || null,
		startedAt: toText(visit?.startedAt) || null,
		completedAt: toText(visit?.completedAt || visit?.ratedAt || visit?.tippedAt) || null,
		terminalAt: toText(visit?.ratedAt || visit?.tippedAt || visit?.updatedAt) || null,
		paymentSummary,
		canResume: status === "active" || status === "pending",
		canViewDetails: status !== "active" || requestType !== "ambulance",
		canRate: status === "rating_pending",
		canCancel:
			sourceKind === "scheduled_visit" &&
			(status === "confirmed" || status === "pending"),
		canBookAgain: sourceKind === "scheduled_visit",
		canJoinVideo: Boolean(toText(visit?.meetingLink)),
		canCallClinic: Boolean(toText(visit?.phone)),
		notes: toText(visit?.notes) || null,
		meetingLink: toText(visit?.meetingLink) || null,
		contactPhone: toText(visit?.phone) || null,
		dateLabel,
		timeLabel,
		existingRating:
			Number.isFinite(existingRating) && existingRating > 0 ? existingRating : null,
		ratingComment: toText(visit?.ratingComment) || null,
		preparation: Array.isArray(visit?.preparation)
			? visit.preparation.filter((item) => typeof item === "string" && item.trim().length > 0)
			: [],
		hospitalId: toText(visit?.hospitalId) || null,
		visit,
		primaryAction: resolvePrimaryAction({ requestType, status, sourceKind }),
		sortTimestamp: sortDate.toISOString(),
		sortTimestampMs: sortDate.getTime(),
		groupKey,
	};
};

export const selectHistoryItems = (visits, now = new Date()) => {
	if (!Array.isArray(visits)) return [];
	return visits
		.map((visit) => toHistoryItem(visit, now))
		.filter(Boolean)
		.sort((left, right) => right.sortTimestampMs - left.sortTimestampMs);
};

export const selectHistoryCount = (visits, now = new Date()) =>
	selectHistoryItems(visits, now).length;

export const selectHistoryBadgeCount = (visits, now = new Date()) =>
	selectHistoryCount(visits, now);

export const selectRecentHistoryPreview = (visits, limit = 8, now = new Date()) =>
	selectHistoryItems(visits, now).slice(0, limit);

export const selectHistoryItemByAnyKey = (visits, key, now = new Date()) => {
	if (!key) return null;
	const lookup = String(key);
	return (
		selectHistoryItems(visits, now).find(
			(item) =>
				item.id === lookup ||
				item.requestId === lookup ||
				item.displayId === lookup,
		) || null
	);
};

export const selectGroupedHistoryBuckets = (visits, now = new Date()) => {
	const items = selectHistoryItems(visits, now);
	const groups = new Map(REQUEST_HISTORY_GROUP_ORDER.map((key) => [key, []]));

	for (const item of items) {
		const groupItems = groups.get(item.groupKey);
		if (groupItems) {
			groupItems.push(item);
		}
	}

	return REQUEST_HISTORY_GROUP_ORDER.map((key) => ({
		key,
		label: REQUEST_HISTORY_GROUP_LABELS[key],
		items: groups.get(key) || [],
	})).filter((group) => group.items.length > 0);
};
