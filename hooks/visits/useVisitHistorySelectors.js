import {
	EMERGENCY_VISIT_LIFECYCLE,
	VISIT_STATUS,
	VISIT_TYPES,
} from "../../constants/visits";
import { resolveHistoryServiceLabel } from "../../components/map/history/history.presentation";
import { formatMoney, resolveMoneyCurrency } from "../../utils/formatMoney";
import {
	classifyVisitSource,
	formatScheduledVisitParts,
	getScheduledCareModeLabel,
	isScheduledVisitRow,
	SCHEDULED_CARE_MODES,
} from "../../utils/scheduledVisitProjection";
import { resolveVisitActorIdentity } from "../../utils/visitHistoryIdentity";

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

const toCurrencyLabel = (value, currency = "USD") =>
	formatMoney(value, {
		currency: resolveMoneyCurrency(currency),
		fallback: null,
	});

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
	if (isScheduledVisitRow(visit)) {
		return toDate(visit?.scheduledStartAt || visit?.scheduled_start_at);
	}
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

const inferSourceKind = (visit) => classifyVisitSource(visit);

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

const mapScheduledStatus = (visit) => {
	const status = toLower(visit?.status);
	const lifecycleState = toLower(visit?.lifecycleState);
	if (status === "in_progress" || lifecycleState === "in_progress") return "active";
	if (status === "completed" || lifecycleState === "completed") return "completed";
	if (status === "cancelled" || lifecycleState === "cancelled") return "cancelled";
	if (lifecycleState === "no_show") return "cancelled";
	if (status === "upcoming" || lifecycleState === "rescheduled") return "confirmed";
	return "pending";
};

const inferHistoryStatus = (visit, sourceKind) =>
	sourceKind === "scheduled_visit"
		? mapScheduledStatus(visit)
		: sourceKind === "emergency"
			? mapLifecycleStatus(visit) || mapLegacyStatus(visit)
			: mapLegacyStatus(visit);

const canHistoryItemBookAgain = ({ sourceKind, status }) =>
	(sourceKind === "scheduled_visit" &&
		(status === "completed" || status === "cancelled")) ||
	(sourceKind === "emergency" &&
		(status === "completed" ||
			status === "rating_pending" ||
			status === "cancelled"));

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

const getScheduledStatusLabel = ({ lifecycleState, status }) => {
	if (lifecycleState === "no_show") return "Missed";
	if (lifecycleState === "rescheduled") return "Rescheduled";
	if (status === "confirmed" || status === "pending") return "Scheduled";
	if (status === "active") return "In progress";
	return getStatusLabel(status);
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
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
	
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const dayAfterTomorrow = new Date(today);
	dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

	// Bounded above: an unbounded lower bound labelled every future date "Today".
	const isToday = date >= today && date < tomorrow;
	const isYesterday = date >= yesterday && date < today;
	const isTomorrow = date >= tomorrow && date < dayAfterTomorrow;

	let datePrefix = "";
	if (isToday) {
		datePrefix = "Today";
	} else if (isYesterday) {
		datePrefix = "Yesterday";
	} else if (isTomorrow) {
		datePrefix = "Tomorrow";
	} else {
		datePrefix = new Intl.DateTimeFormat(undefined, {
			month: "short",
			day: "numeric",
		}).format(date);
	}
	
	try {
		const timeStr = new Intl.DateTimeFormat(undefined, {
			hour: "numeric",
			minute: "2-digit",
		}).format(date);
		return `${datePrefix}, ${timeStr}`;
	} catch (_error) {
		return `${datePrefix}, ${date.toLocaleTimeString()}`;
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

const buildSubtitleParts = (typeLabel, dateLabel) => [typeLabel, dateLabel].filter(Boolean);

const buildInitials = (value) => {
	const parts = toText(value)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2);
	if (parts.length === 0) return null;
	return parts.map((part) => part[0]?.toUpperCase() || "").join("") || null;
};

const resolveVisitTypeLabel = (visit, requestType, requestTypeLabel) => {
	if (isScheduledVisitRow(visit)) {
		return getScheduledCareModeLabel(visit?.careMode || visit?.care_mode) || requestTypeLabel;
	}
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

const resolveNextVisitLabel = (visit) => {
	const nextVisit = toText(visit?.nextVisit);
	if (nextVisit) return nextVisit;
	return null;
};

export const toHistoryItem = (visit, now = new Date()) => {
	if (!visit || typeof visit !== "object") return null;

	const requestType = inferRequestType(visit);
	const sourceKind = inferSourceKind(visit);
	const status = inferHistoryStatus(visit, sourceKind);
	const lifecycleState = toLower(
		visit?.lifecycleState || visit?.lifecycle_state,
	);
	const requestTypeLabel = getRequestTypeLabel(requestType);
	const visitTypeLabel = resolveVisitTypeLabel(visit, requestType, requestTypeLabel);
	const specialtyLabel = toText(visit?.specialty);
	const statusLabel =
		sourceKind === "scheduled_visit"
			? getScheduledStatusLabel({ lifecycleState, status })
			: getStatusLabel(status);
	const statusTone = getStatusTone(status);
	const sortDate = resolveSortDate(visit, status);
	const patientScheduleChangesOpen =
		sourceKind === "scheduled_visit" &&
		status === "confirmed" &&
		sortDate.getTime() > now.getTime() + 2 * 60 * 60 * 1000;
	const groupKey = resolveGroupKey(status, sortDate, now);
	const scheduledParts =
		sourceKind === "scheduled_visit"
			? formatScheduledVisitParts({
					scheduledStartAt: visit?.scheduledStartAt || visit?.scheduled_start_at,
					scheduledTimezone: visit?.scheduledTimezone || visit?.scheduled_timezone,
				})
			: null;
	const dateLabel = scheduledParts?.dateLabel || formatDateLabel(sortDate);
	const timeLabel = scheduledParts
		? [scheduledParts.timeLabel, scheduledParts.timezoneLabel].filter(Boolean).join(" ")
		: formatTimeLabel(sortDate, visit);
	const facilityName = toText(visit?.hospital || visit?.hospitalName) || "Care request";
	const facilityAddress = toText(
		visit?.address ||
			visit?.hospitalAddress ||
			visit?._hospital_address_resolved
	);
	const doctorName = toText(visit?.doctor || visit?.doctorName);
	const responderName = toText(visit?.responderName || visit?.responder_name);
	const actorIdentity = resolveVisitActorIdentity({
		sourceKind,
		requestType,
		doctorName,
		responderName,
	});
	const { actorName, actorRole } = actorIdentity;
	const existingRating = Number(visit?.rating);
	const paymentSummary =
		toCurrencyLabel(
			visit?.user_amount ??
				visit?.total_amount ??
				visit?.totalCost ??
				visit?.total_cost ??
				visit?.amount,
			resolveMoneyCurrency(
				visit?.currency,
				visit?.paymentCurrency,
				visit?.payment_currency,
			),
		) ||
		toCurrencyLabel(
			visit?.cost,
			resolveMoneyCurrency(
				visit?.currency,
				visit?.paymentCurrency,
				visit?.payment_currency,
			),
		);

	return {
		id: String(visit.id),
		patientId: toText(visit?.patientId || visit?.userId || visit?.user_id) || null,
		doctorId: toText(visit?.doctorId || visit?.doctor_id) || null,
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
		subtitle: buildSubtitleParts(visitTypeLabel, dateLabel).join(" - "),
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
		doctorName: actorIdentity.doctorName,
		doctorInitials: buildInitials(actorIdentity.doctorName),
		responderName: actorIdentity.responderName,
		specialty: specialtyLabel || null,
		visitTypeLabel,
		careMode: toText(visit?.careMode || visit?.care_mode) || null,
		careModeLabel:
			getScheduledCareModeLabel(visit?.careMode || visit?.care_mode) || null,
		roomNumber: toText(visit?.roomNumber) || null,
		nextVisitLabel: resolveNextVisitLabel(visit),
		createdAt: toText(visit?.createdAt) || null,
		scheduledFor: buildVisitDateTime(visit)?.toISOString() || null,
		scheduledStartAt:
			toText(visit?.scheduledStartAt || visit?.scheduled_start_at) || null,
		scheduledEndAt:
			toText(visit?.scheduledEndAt || visit?.scheduled_end_at) || null,
		scheduledTimezone:
			toText(visit?.scheduledTimezone || visit?.scheduled_timezone) || null,
		lifecycleState: lifecycleState || null,
		lifecycleUpdatedAt:
			toText(visit?.lifecycleUpdatedAt || visit?.lifecycle_updated_at) || null,
		startedAt: toText(visit?.startedAt) || null,
		completedAt: toText(visit?.completedAt || visit?.ratedAt || visit?.tippedAt) || null,
		terminalAt: toText(visit?.ratedAt || visit?.tippedAt || visit?.updatedAt) || null,
		paymentSummary,
		canResume:
			sourceKind === "emergency" &&
			(status === "active" || status === "pending"),
		canViewDetails: status !== "active" || requestType !== "ambulance",
		canRate: status === "rating_pending",
		canCancel: patientScheduleChangesOpen,
		canReschedule: patientScheduleChangesOpen,
		canBookAgain: canHistoryItemBookAgain({ sourceKind, status }),
		canOpenConsult:
			sourceKind === "scheduled_visit" &&
			toText(visit?.careMode || visit?.care_mode) ===
				SCHEDULED_CARE_MODES.ASYNC_CONSULT,
		canJoinVideo: false,
		canCallClinic: Boolean(toText(visit?.phone)),
		notes: toText(visit?.notes) || null,
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
