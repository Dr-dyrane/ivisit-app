export const PRIMARY_COMPLAINTS = [
	{ label: "Chest pain", value: "chest_pain" },
	{ label: "Breathing trouble", value: "breathing_difficulty" },
	{ label: "Severe bleeding", value: "heavy_bleeding" },
	{ label: "Stroke signs", value: "stroke_signs" },
	{ label: "Injury or fall", value: "injury_fall" },
	{ label: "High fever", value: "high_fever" },
];

export const EXTENDED_COMPLAINTS = [
	{ label: "Severe headache", value: "severe_headache" },
	{ label: "Abdominal pain", value: "abdominal_pain" },
	{ label: "Allergic reaction", value: "allergic_reaction" },
	{ label: "Pregnancy concern", value: "pregnancy_concern" },
	{ label: "Mental health crisis", value: "mental_health_crisis" },
	{ label: "Other symptoms", value: "other_symptoms" },
];

export const START_TIME_OPTIONS = [
	{ label: "Just now", value: "just_now" },
	{ label: "Under 30 min", value: "under_30m" },
	{ label: "1-3 hours", value: "1_3h" },
	{ label: "Today", value: "today" },
	{ label: "Over 1 day", value: "over_1d" },
];

export const YES_NO_OPTIONS = [
	{ label: "Yes", value: true },
	{ label: "No", value: false },
];

export const ACCESS_OPTIONS = [
	{ label: "Gate code needed", value: "gate_code" },
	{ label: "Stairs only", value: "stairs_only" },
	{ label: "Elevator available", value: "elevator" },
	{ label: "Hard to find entrance", value: "complex_entry" },
	{ label: "Pets on site", value: "pets_on_site" },
];

export const TREND_OPTIONS = [
	{ label: "Getting worse", value: "worsening" },
	{ label: "No change", value: "unchanged" },
	{ label: "Improving", value: "improving" },
	{ label: "Comes and goes", value: "intermittent" },
];

export const SIMPLE_STATUS_OPTIONS = [
	{ label: "None", value: "none" },
	{ label: "Known", value: "known" },
	{ label: "Not sure", value: "unknown" },
];

export const CAREGIVER_OPTIONS = [
	{ label: "With me now", value: "with_patient" },
	{ label: "On the way", value: "en_route" },
	{ label: "No caregiver", value: "none" },
];

export const FACILITY_OPTIONS = [
	{ label: "Closest first", value: "closest" },
	{ label: "Specialist first", value: "specialist" },
	{ label: "Insurance network", value: "insurance_network" },
	{ label: "No preference", value: "none" },
];

export const COMPLAINT_SIGNAL_MAP = {
	chest_pain: { chestPain: true },
	breathing_difficulty: { breathingDifficulty: true },
	heavy_bleeding: { heavyBleeding: true },
};

export function normalizeTriageDraft(value) {
	if (!value || typeof value !== "object") {
		return {
			accessNotes: [],
		};
	}

	return {
		...value,
		accessNotes: Array.isArray(value.accessNotes) ? value.accessNotes : [],
	};
}

export function triageStepAnswered(step, draft) {
	const value = draft?.[step.field];
	if (step.type === "multi") return Array.isArray(value) && value.length > 0;
	return value !== undefined && value !== null && String(value).length > 0;
}

export function isCriticalTriageDraft(draft) {
	if (!draft || typeof draft !== "object") return false;
	if (draft.unconscious === true) return true;
	if (draft.heavyBleeding === true) return true;
	if (draft.breathingDifficulty === true) return true;
	if (draft.chestPain === true) return true;
	const pain = Number(draft.painScale);
	return Number.isFinite(pain) && pain >= 9;
}

export function hasMeaningfulTriageDraftData(draft) {
	if (!draft || typeof draft !== "object") return false;
	return Object.entries(draft).some(([key, value]) => {
		if (key === "accessNotes") return Array.isArray(value) && value.length > 0;
		if (value === null || value === undefined) return false;
		if (typeof value === "string") return value.trim().length > 0;
		return true;
	});
}

export function getTriageOptionIcon(step, option) {
	const field = String(step?.field || "");
	const label = String(option?.label || "").toLowerCase();
	const value = option?.value;

	if (field === "chiefComplaint") {
		if (String(value) === "chest_pain") return "heart-half-outline";
		if (String(value) === "breathing_difficulty") return "fitness-outline";
		if (String(value) === "heavy_bleeding") return "water-outline";
		return "medkit-outline";
	}
	if (field === "symptomStartTime") return "time-outline";
	if (field === "painScale") return Number(value) >= 7 ? "flame-outline" : "pulse-outline";
	if (
		field === "breathingDifficulty" ||
		field === "unconscious" ||
		field === "heavyBleeding"
	) {
		if (value === true || label === "yes") return "checkmark-circle-outline";
		return "close-circle-outline";
	}
	if (field === "symptomTrend") return "trending-up-outline";
	if (field === "facilityPreference") return "business-outline";
	return "ellipse-outline";
}

export function shouldTriageOptionSpanFullWidth(step, option, optionCount) {
	if (step?.field === "painScale") return false;
	if (step?.field === "chiefComplaint") {
		return ["chest_pain", "breathing_difficulty"].includes(String(option?.value || ""));
	}
	if (step?.field === "accessNotes") return true;
	if (optionCount <= 2) return true;
	return String(option?.label || "").length > 16;
}

export function buildLegacyTriageSteps(
	phase,
	draft,
	showExtendedComplaints,
) {
	const complaintOptions = showExtendedComplaints
		? [...PRIMARY_COMPLAINTS, ...EXTENDED_COMPLAINTS]
		: PRIMARY_COMPLAINTS;

	const prebooking = [
		{
			id: "chiefComplaint",
			field: "chiefComplaint",
			type: "single",
			prompt: "What is your most urgent concern right now?",
			options: complaintOptions,
		},
		{
			id: "symptomStartTime",
			field: "symptomStartTime",
			type: "single",
			prompt: "When did this start?",
			options: START_TIME_OPTIONS,
		},
		{
			id: "breathingDifficulty",
			field: "breathingDifficulty",
			type: "single",
			prompt: "Any breathing difficulty?",
			options: YES_NO_OPTIONS,
		},
		{
			id: "unconscious",
			field: "unconscious",
			type: "single",
			prompt: "Any loss of consciousness?",
			options: YES_NO_OPTIONS,
		},
		{
			id: "heavyBleeding",
			field: "heavyBleeding",
			type: "single",
			prompt: "Is there heavy bleeding?",
			options: YES_NO_OPTIONS,
		},
		{
			id: "accessNotes",
			field: "accessNotes",
			type: "single",
			prompt: "Anything responders should know to get in fast?",
			options: ACCESS_OPTIONS,
		},
	];

	const waiting = [
		{
			id: "painScale",
			field: "painScale",
			type: "single",
			prompt: "Pain level right now?",
			options: Array.from({ length: 11 }, (_, n) => ({
				label: String(n),
				value: n,
			})),
		},
		{
			id: "symptomTrend",
			field: "symptomTrend",
			type: "single",
			prompt: "How is it changing?",
			options: TREND_OPTIONS,
		},
		{
			id: "allergyStatus",
			field: "allergyStatus",
			type: "single",
			prompt: "Allergies?",
			options: SIMPLE_STATUS_OPTIONS,
		},
		{
			id: "medicationStatus",
			field: "medicationStatus",
			type: "single",
			prompt: "Current meds?",
			options: SIMPLE_STATUS_OPTIONS,
		},
		{
			id: "historyStatus",
			field: "historyStatus",
			type: "single",
			prompt: "Relevant history?",
			options: SIMPLE_STATUS_OPTIONS,
		},
		{
			id: "caregiverSupport",
			field: "caregiverSupport",
			type: "single",
			prompt: "Caregiver support?",
			options: CAREGIVER_OPTIONS,
		},
		{
			id: "facilityPreference",
			field: "facilityPreference",
			type: "single",
			prompt: "Facility preference?",
			options: FACILITY_OPTIONS,
		},
	];

	if (phase === "prebooking") return prebooking;
	return draft?.chiefComplaint ? waiting : [prebooking[0], ...waiting];
}
