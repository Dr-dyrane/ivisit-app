const TRIAGE_VERSION = "triage_v1";

const CARE_TYPES = Object.freeze({
	emergencyDepartment: "emergency_department",
	urgentCare: "urgent_care",
	observation: "observation",
});

const SEVERITY_BANDS = Object.freeze({
	critical: "critical",
	urgent: "urgent",
	moderate: "moderate",
	low: "low",
});

const CRITICAL_SPECIALTY_HINTS = ["trauma", "cardio", "stroke", "neuro", "icu"];
const URGENT_SPECIALTY_HINTS = ["emergency", "pulmo", "respira", "ortho", "surgery"];

const toFiniteNumber = (value, fallback = 0) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
};

const parseWaitTimeMinutes = (value) => {
	if (value == null) return null;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const text = String(value).trim().toLowerCase();
	const minMatch = text.match(/(\d+)\s*(min|mins|minute|minutes)/);
	if (minMatch) return Number(minMatch[1]);
	if (/^\d+$/.test(text)) return Number(text);
	return null;
};

const inferSeverity = ({ serviceType, specialty, medicalProfile, userCheckin }) => {
	let score = 1;
	const reasons = [];

	if (serviceType === "ambulance") {
		score += 2;
		reasons.push("ambulance_request");
	}

	const specialtyText = String(specialty || "").toLowerCase();
	if (CRITICAL_SPECIALTY_HINTS.some((hint) => specialtyText.includes(hint))) {
		score += 3;
		reasons.push("critical_specialty_hint");
	} else if (URGENT_SPECIALTY_HINTS.some((hint) => specialtyText.includes(hint))) {
		score += 2;
		reasons.push("urgent_specialty_hint");
	}

	const conditionCount = Array.isArray(medicalProfile?.conditions)
		? medicalProfile.conditions.length
		: 0;
	if (conditionCount >= 3) {
		score += 2;
		reasons.push("multiple_conditions");
	} else if (conditionCount > 0) {
		score += 1;
		reasons.push("known_conditions");
	}

	const allergyCount = Array.isArray(medicalProfile?.allergies)
		? medicalProfile.allergies.length
		: 0;
	if (allergyCount > 0) {
		score += 1;
		reasons.push("allergy_risk");
	}

	if (userCheckin?.breathingDifficulty === true) {
		score += 2;
		reasons.push("breathing_difficulty");
	}
	if (userCheckin?.heavyBleeding === true) {
		score += 3;
		reasons.push("heavy_bleeding");
	}
	if (userCheckin?.chestPain === true) {
		score += 3;
		reasons.push("chest_pain");
	}

	let band = SEVERITY_BANDS.low;
	if (score >= 8) band = SEVERITY_BANDS.critical;
	else if (score >= 5) band = SEVERITY_BANDS.urgent;
	else if (score >= 3) band = SEVERITY_BANDS.moderate;

	return {
		score,
		band,
		reasons,
	};
};

const inferCareType = ({ severityBand, serviceType }) => {
	if (severityBand === SEVERITY_BANDS.critical) {
		return {
			type: CARE_TYPES.emergencyDepartment,
			reason: "critical_severity",
		};
	}
	if (severityBand === SEVERITY_BANDS.urgent || serviceType === "ambulance") {
		return {
			type: CARE_TYPES.emergencyDepartment,
			reason: "urgent_or_ambulance",
		};
	}
	if (severityBand === SEVERITY_BANDS.moderate) {
		return {
			type: CARE_TYPES.urgentCare,
			reason: "moderate_severity",
		};
	}
	return {
		type: CARE_TYPES.observation,
		reason: "low_severity",
	};
};

const inferHospitalCapability = ({ hospital, careType, specialty }) => {
	const specialtyText = String(specialty || "").toLowerCase();
	const emergencyLevelText = String(
		hospital?.emergencyLevel || hospital?.emergency_level || ""
	).toLowerCase();
	const specialties = Array.isArray(hospital?.specialties) ? hospital.specialties : [];
	const specialtiesText = specialties.map((item) => String(item).toLowerCase());

	let score = 0;
	const reasons = [];

	if (careType === CARE_TYPES.emergencyDepartment) {
		if (
			emergencyLevelText.includes("level 1") ||
			emergencyLevelText.includes("trauma")
		) {
			score += 30;
			reasons.push("advanced_emergency_level");
		} else if (
			emergencyLevelText.includes("level 2") ||
			emergencyLevelText.includes("emergency")
		) {
			score += 20;
			reasons.push("emergency_level_present");
		}
	}

	if (specialtyText && specialtiesText.some((item) => item.includes(specialtyText))) {
		score += 20;
		reasons.push("specialty_match");
	}

	const availableBeds = toFiniteNumber(hospital?.availableBeds, 0);
	if (availableBeds > 0) {
		score += Math.min(20, availableBeds);
		reasons.push("bed_capacity_available");
	}

	const ambulances = toFiniteNumber(
		hospital?.ambulancesCount ?? hospital?.ambulances,
		0
	);
	if (ambulances > 0) {
		score += Math.min(15, ambulances * 3);
		reasons.push("ambulance_capacity_available");
	}

	const waitMins = parseWaitTimeMinutes(hospital?.waitTime);
	if (Number.isFinite(waitMins)) {
		score += Math.max(0, 20 - waitMins);
		reasons.push("wait_time_adjusted");
	}

	const distanceKm = toFiniteNumber(hospital?.distanceKm, 0);
	if (distanceKm > 0) {
		score += Math.max(0, 25 - distanceKm * 2.5);
		reasons.push("distance_adjusted");
	}

	return {
		score: Math.round(Math.max(0, score)),
		reasons,
	};
};

const rankHospitalsBySuitability = ({ hospitals, careType, specialty }) => {
	if (!Array.isArray(hospitals)) return [];

	return hospitals
		.filter((hospital) => hospital && typeof hospital === "object")
		.map((hospital) => {
			const capability = inferHospitalCapability({ hospital, careType, specialty });
			return {
				id: hospital.id,
				name: hospital.name,
				score: capability.score,
				reasons: capability.reasons,
			};
		})
		.sort((a, b) => b.score - a.score);
};

const buildTriageSnapshot = ({
	stage = "post_request",
	request,
	hospitals,
	selectedHospitalId,
	medicalProfile,
	emergencyContacts,
	userCheckin,
	currentRoute,
}) => {
	const serviceType = String(request?.serviceType || "ambulance").toLowerCase();
	const specialty = request?.specialty || null;
	const severity = inferSeverity({
		serviceType,
		specialty,
		medicalProfile,
		userCheckin,
	});
	const careType = inferCareType({
		severityBand: severity.band,
		serviceType,
	});

	const rankedHospitals = rankHospitalsBySuitability({
		hospitals,
		careType: careType.type,
		specialty,
	});
	const topHospitals = rankedHospitals.slice(0, 3);
	const selectedHospital =
		rankedHospitals.find((item) => item.id === selectedHospitalId) || null;
	const recommendedHospital = topHospitals[0] || null;

	return {
		version: TRIAGE_VERSION,
		stage,
		collectedAt: new Date().toISOString(),
		severity,
		careType,
		signals: {
			serviceType,
			specialty,
			hasEmergencyContacts:
				Array.isArray(emergencyContacts) && emergencyContacts.length > 0,
			hasMedicalProfile: !!medicalProfile,
			routeEtaSeconds: Number.isFinite(currentRoute?.durationSec)
				? currentRoute.durationSec
				: Number.isFinite(currentRoute?.duration)
					? currentRoute.duration
					: null,
			userCheckin: userCheckin || null,
		},
		suitability: {
			selectedHospitalId: selectedHospitalId || null,
			selectedHospitalScore: selectedHospital?.score ?? null,
			recommendedHospitalId: recommendedHospital?.id ?? null,
			recommendedHospitalName: recommendedHospital?.name ?? null,
			recommendedDifferent:
				!!recommendedHospital?.id &&
				!!selectedHospitalId &&
				recommendedHospital.id !== selectedHospitalId,
			topHospitals,
		},
	};
};

const collectAndPersist = async ({
	requestId,
	stage,
	request,
	hospitals,
	selectedHospitalId,
	medicalProfile,
	emergencyContacts,
	userCheckin,
	currentRoute,
	persist,
}) => {
	const snapshot = buildTriageSnapshot({
		stage,
		request,
		hospitals,
		selectedHospitalId,
		medicalProfile,
		emergencyContacts,
		userCheckin,
		currentRoute,
	});

	if (typeof persist === "function" && requestId) {
		await persist(requestId, snapshot, {
			reason: `triage_${String(stage || "capture")}`,
		});
	}

	return snapshot;
};

export const triageService = {
	TRIAGE_VERSION,
	CARE_TYPES,
	SEVERITY_BANDS,
	buildTriageSnapshot,
	collectAndPersist,
};

export default triageService;
