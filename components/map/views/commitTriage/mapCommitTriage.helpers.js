import { triageService } from "../../../../services/triageService";
import {
	COMPLAINT_SIGNAL_MAP,
	EXTENDED_COMPLAINTS,
	getTriageOptionIcon,
	hasMeaningfulTriageDraftData,
	isCriticalTriageDraft,
	normalizeTriageDraft,
	PRIMARY_COMPLAINTS,
	shouldTriageOptionSpanFullWidth,
	YES_NO_OPTIONS,
} from "../../../emergency/triage/triageFlow.shared";

export {
	getTriageOptionIcon,
	hasMeaningfulTriageDraftData,
	isCriticalTriageDraft,
};

const PAIN_OPTIONS = Array.from({ length: 11 }, (_, index) => ({
	label: String(index),
	value: index,
}));

export function sanitizeCommitTriageNote(value) {
	return String(value || "").trim().slice(0, 240);
}

export function normalizeCommitTriageDraft(value) {
	const draft = normalizeTriageDraft(value);
	return {
		...draft,
		note: sanitizeCommitTriageNote(draft.note),
	};
}

export function buildMapCommitTriageSteps(showExtendedComplaints = false) {
	const complaintOptions = showExtendedComplaints
		? [...PRIMARY_COMPLAINTS, ...EXTENDED_COMPLAINTS]
		: PRIMARY_COMPLAINTS;

	return [
		{
			id: "chiefComplaint",
			field: "chiefComplaint",
			type: "single",
			headerTitle: "What feels urgent",
			prompt: "What feels most urgent?",
			aiIntent: "chief_complaint_classification",
			options: complaintOptions,
		},
		{
			id: "breathingDifficulty",
			field: "breathingDifficulty",
			type: "single",
			headerTitle: "Breathing",
			prompt: "Is breathing difficult?",
			aiIntent: "respiratory_risk",
			options: YES_NO_OPTIONS,
		},
		{
			id: "unconscious",
			field: "unconscious",
			type: "single",
			headerTitle: "Consciousness",
			prompt: "Did they pass out?",
			aiIntent: "consciousness_risk",
			options: YES_NO_OPTIONS,
		},
		{
			id: "heavyBleeding",
			field: "heavyBleeding",
			type: "single",
			headerTitle: "Bleeding",
			prompt: "Any heavy bleeding?",
			aiIntent: "bleeding_risk",
			options: YES_NO_OPTIONS,
		},
		{
			id: "painScale",
			field: "painScale",
			type: "single",
			headerTitle: "Pain",
			prompt: "Pain level now?",
			aiIntent: "pain_score",
			options: PAIN_OPTIONS,
		},
		{
			id: "note",
			field: "note",
			type: "text",
			headerTitle: "Add note",
			prompt: "Anything responders should know?",
			aiIntent: "free_text_context",
		},
	];
}

export function buildCommitTriageSelectionState(step, draft, option) {
	if (!step || !draft) return false;
	if (step.type === "multi") {
		return Array.isArray(draft?.[step.field]) && draft[step.field].includes(option?.value);
	}
	return draft?.[step.field] === option?.value;
}

export function getCommitTriageOptionWidthStyle(step, option, optionCount) {
	if (step?.field === "painScale") return "third";
	if (optionCount <= 2) return "half";
	return shouldTriageOptionSpanFullWidth(step, option, optionCount) ? "full" : "half";
}

export function applyCommitTriageSelection(step, optionValue, previousDraft) {
	const impliedSignals =
		step?.field === "chiefComplaint" ? COMPLAINT_SIGNAL_MAP?.[optionValue] || null : null;

	return normalizeCommitTriageDraft({
		...previousDraft,
		[step.field]: optionValue,
		...(impliedSignals || {}),
	});
}

export function buildCommitTriageSnapshot({
	triageDraft,
	hospitals,
	hospitalId,
	serviceType,
	specialty,
	medicalProfile,
	emergencyContacts,
}) {
	if (!hasMeaningfulTriageDraftData(triageDraft)) return null;

	return triageService.buildTriageSnapshot({
		stage: "commit_triage",
		request: {
			serviceType,
			specialty: specialty || null,
		},
		hospitals: Array.isArray(hospitals) ? hospitals : [],
		selectedHospitalId: hospitalId || null,
		medicalProfile: medicalProfile || null,
		emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
		userCheckin: triageDraft,
		currentRoute: null,
	});
}
