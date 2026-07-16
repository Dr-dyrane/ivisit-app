const TERMINAL_EMERGENCY_STATUSES = new Set(["completed", "cancelled", "payment_declined"]);
const REMOVED_EMERGENCY_STATUSES = new Set(["cancelled", "payment_declined"]);
const RESPONDER_ACCEPTED_STATUSES = new Set(["accepted", "arrived", "completed"]);

const parseTimestampMs = (value, fallbackMs = 0) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim()) {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallbackMs;
};

const parseRecordTimestampMs = (record, fallbackMs = 0) => {
	if (!record || typeof record !== "object") return fallbackMs;
	return parseTimestampMs(record.updated_at ?? record.created_at ?? null, fallbackMs);
};

const parsePointGeometry = (input) => {
	if (!input) return null;

	try {
		if (typeof input === "object") {
			if (Array.isArray(input.coordinates) && input.coordinates.length >= 2) {
				const longitude = Number(input.coordinates[0]);
				const latitude = Number(input.coordinates[1]);
				if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
					return { longitude, latitude };
				}
				return null;
			}

			if (Number.isFinite(input.lng) && Number.isFinite(input.lat)) {
				return { longitude: Number(input.lng), latitude: Number(input.lat) };
			}

			if (Number.isFinite(input.longitude) && Number.isFinite(input.latitude)) {
				return { longitude: Number(input.longitude), latitude: Number(input.latitude) };
			}
		}

		if (typeof input !== "string") return null;

		const wkt = input.trim().match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
		if (wkt) {
			return { longitude: Number(wkt[1]), latitude: Number(wkt[2]) };
		}

		// WKB hex encoded point with optional SRID.
		if (/^[0-9a-fA-F]{40,}$/.test(input)) {
			const hexToDouble = (hex) => {
				const bytes = new Uint8Array(8);
				for (let i = 0; i < 8; i += 1) {
					bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
				}
				return new Float64Array(bytes.buffer)[0];
			};

			const offset = input.length >= 50 ? 18 : 10;
			const xHex = input.substring(offset, offset + 16);
			const yHex = input.substring(offset + 16, offset + 32);
			const longitude = hexToDouble(xHex);
			const latitude = hexToDouble(yHex);

			if (
				Number.isFinite(longitude) &&
				Number.isFinite(latitude) &&
				Math.abs(longitude) <= 180 &&
				Math.abs(latitude) <= 90
			) {
				return { longitude, latitude };
			}
		}
	} catch (_error) {
		return null;
	}

	return null;
};

const getTripKeys = (trip) => {
	const keys = [];
	if (trip?.id) keys.push(String(trip.id));
	if (trip?.requestId) keys.push(String(trip.requestId));
	return keys;
};

const getRecordKeys = (record) => {
	const keys = [];
	if (record?.id) keys.push(String(record.id));
	if (record?.display_id) keys.push(String(record.display_id));
	if (record?.request_id) keys.push(String(record.request_id));
	if (record?.current_call) keys.push(String(record.current_call));
	return keys;
};

const matchesTripRecord = (trip, record) => {
	if (!trip || !record) return false;
	const tripKeys = getTripKeys(trip);
	if (!tripKeys.length) return false;
	const recordKeys = getRecordKeys(record);
	if (!recordKeys.length) return false;
	return recordKeys.some((key) => tripKeys.includes(key));
};

const shouldApplyTripEvent = (gateState, trip, record, fallbackMs = Date.now()) => {
	if (!matchesTripRecord(trip, record)) {
		return {
			apply: false,
			nextGateState: gateState || { requestKey: null, versionMs: 0 },
			reason: "record_mismatch",
		};
	}

	const requestKey = String(trip?.id ?? trip?.requestId ?? "");
	if (!requestKey) {
		return {
			apply: false,
			nextGateState: gateState || { requestKey: null, versionMs: 0 },
			reason: "missing_request_key",
		};
	}

	const nextVersionMs = parseRecordTimestampMs(record, fallbackMs);
	const current = gateState || { requestKey: null, versionMs: 0 };

	if (current.requestKey && current.requestKey !== requestKey) {
		return {
			apply: true,
			nextGateState: { requestKey, versionMs: nextVersionMs },
			reason: "request_changed",
		};
	}

	if (nextVersionMs < (current.versionMs ?? 0)) {
		return {
			apply: false,
			nextGateState: current,
			reason: "stale_event",
		};
	}

	return {
		apply: true,
		nextGateState: { requestKey, versionMs: nextVersionMs },
		reason: "fresh_event",
	};
};

const mergeEmergencyRealtimeTrip = (prevTrip, record) => {
	if (!prevTrip || !record) return prevTrip;

	const status = String(record.status ?? "").toLowerCase();
	if (REMOVED_EMERGENCY_STATUSES.has(status)) {
		return null;
	}

	const loc = parsePointGeometry(record.responder_location);
	const prevAssigned =
		prevTrip?.assignedAmbulance && typeof prevTrip.assignedAmbulance === "object"
			? prevTrip.assignedAmbulance
			: null;

	const hasAcceptedResponder = RESPONDER_ACCEPTED_STATUSES.has(status);
	const previousHadAcceptedResponder = RESPONDER_ACCEPTED_STATUSES.has(
		String(prevTrip?.status ?? "").toLowerCase(),
	);
	const hasResponderIdentity = hasAcceptedResponder && !!(
		record.responder_name ||
		record.responder_phone ||
		record.responder_vehicle_type ||
		record.responder_vehicle_plate ||
		record.responder_id ||
		record.ambulance_id ||
		loc
	);

	const mergedAssigned = hasResponderIdentity
		? {
				...(prevAssigned || {}),
				id: record.ambulance_id || prevAssigned?.id || null,
				type: record.responder_vehicle_type || prevAssigned?.type || "Ambulance",
				plate: record.responder_vehicle_plate || prevAssigned?.plate || null,
				name: record.responder_name || prevAssigned?.name || null,
				phone: record.responder_phone || prevAssigned?.phone || null,
				location: loc || prevAssigned?.location || null,
				heading: Number.isFinite(record.responder_heading)
					? record.responder_heading
					: (prevAssigned?.heading ?? null),
		  }
		: null;

	// Parse estimated_arrival string from DB (e.g. "8 min", "12 min") → etaSeconds
	// Falls back to prevTrip values if the record doesn't carry a fresh ETA.
	let nextEstimatedArrival = prevTrip.estimatedArrival ?? null;
	let nextEtaSeconds = prevTrip.etaSeconds ?? null;
	if (record.estimated_arrival != null) {
		nextEstimatedArrival = record.estimated_arrival;
		const parsedMinutes = parseInt(String(record.estimated_arrival), 10);
		if (Number.isFinite(parsedMinutes) && parsedMinutes > 0) {
			nextEtaSeconds = parsedMinutes * 60;
		}
	}

	return {
		...prevTrip,
		id: record.id ?? prevTrip.id,
		requestId: record.id ?? prevTrip.id ?? prevTrip.requestId,
		displayId: record.display_id ?? prevTrip.displayId ?? null,
		status: record.status ?? prevTrip.status,
		ambulanceId: record.ambulance_id ?? prevTrip.ambulanceId ?? null,
		responderId: record.responder_id ?? prevTrip.responderId ?? null,
		currentResponderAssignmentId:
			record.current_responder_assignment_id ??
			prevTrip.currentResponderAssignmentId ??
			null,
		dispatchOrganizationId:
			record.dispatch_organization_id ??
			prevTrip.dispatchOrganizationId ??
			null,
		startedAt:
			hasAcceptedResponder && !previousHadAcceptedResponder
				? parseRecordTimestampMs(record, Date.now())
				: hasAcceptedResponder
					? prevTrip.startedAt ?? parseRecordTimestampMs(record, Date.now())
					: null,
		dispatchAcceptedAt:
			hasAcceptedResponder && !previousHadAcceptedResponder
				? record.updated_at ?? new Date().toISOString()
				: prevTrip.dispatchAcceptedAt ?? null,
		responderArrivedAt:
			status === "arrived" && String(prevTrip?.status ?? "").toLowerCase() !== "arrived"
				? record.updated_at ?? new Date().toISOString()
				: prevTrip.responderArrivedAt ?? null,
		hospitalId: record.hospital_id ?? prevTrip.hospitalId ?? null,
		hospitalName: record.hospital_name ?? prevTrip.hospitalName ?? null,
		specialty: record.specialty ?? prevTrip.specialty ?? null,
		assignedAmbulance: mergedAssigned,
		currentResponderLocation: hasAcceptedResponder
			? loc || prevTrip.currentResponderLocation || null
			: null,
		currentResponderHeading: Number.isFinite(record.responder_heading)
			? hasAcceptedResponder
				? record.responder_heading
				: null
			: hasAcceptedResponder
				? prevTrip.currentResponderHeading ?? null
				: null,
		estimatedArrival: nextEstimatedArrival,
		etaSeconds: nextEtaSeconds,
		responderTelemetryAt:
			record.responder_location_received_at ??
			prevTrip.responderTelemetryAt ??
			null,
		responderLocationObservedAt:
			record.responder_location_observed_at ??
			prevTrip.responderLocationObservedAt ??
			null,
		responderLocationAccuracyMeters:
			record.responder_location_accuracy_meters ??
			prevTrip.responderLocationAccuracyMeters ??
			null,
		responderTelemetrySequence:
			record.responder_telemetry_sequence ??
			prevTrip.responderTelemetrySequence ??
			null,
		responderTelemetryLeaseExpiresAt:
			record.responder_telemetry_lease_expires_at ??
			prevTrip.responderTelemetryLeaseExpiresAt ??
			null,
		patientAcknowledgedArrivalAt:
			record.patient_acknowledged_arrival_at ??
			prevTrip.patientAcknowledgedArrivalAt ??
			null,
		updatedAt: record.updated_at ?? prevTrip.updatedAt ?? null,
	};
};

const mergeAmbulanceRealtimeTrip = (prevTrip, ambulanceRecord) => {
	if (!prevTrip || !ambulanceRecord) return prevTrip;
	if (
		!RESPONDER_ACCEPTED_STATUSES.has(
			String(prevTrip?.status ?? "").toLowerCase(),
		)
	) {
		return prevTrip;
	}
	const location = parsePointGeometry(ambulanceRecord.location);
	const telemetryReceivedAt = ambulanceRecord.location_received_at ?? null;
	if (!location && !telemetryReceivedAt) return prevTrip;

	return {
		...prevTrip,
		currentResponderLocation: location || prevTrip.currentResponderLocation || null,
		currentResponderHeading: Number.isFinite(ambulanceRecord.heading)
			? ambulanceRecord.heading
			: (prevTrip.currentResponderHeading ?? null),
		responderTelemetryAt:
			telemetryReceivedAt ?? prevTrip.responderTelemetryAt ?? null,
		responderLocationObservedAt:
			ambulanceRecord.location_observed_at ??
			prevTrip.responderLocationObservedAt ??
			null,
		responderLocationAccuracyMeters:
			ambulanceRecord.location_accuracy_meters ??
			prevTrip.responderLocationAccuracyMeters ??
			null,
		responderTelemetrySequence:
			ambulanceRecord.telemetry_sequence ??
			prevTrip.responderTelemetrySequence ??
			null,
		responderTelemetryLeaseExpiresAt:
			ambulanceRecord.telemetry_lease_expires_at ??
			prevTrip.responderTelemetryLeaseExpiresAt ??
			null,
		updatedAt: ambulanceRecord.updated_at ?? prevTrip.updatedAt ?? null,
		assignedAmbulance: {
			...(prevTrip.assignedAmbulance || {}),
			id: ambulanceRecord.id ?? prevTrip?.assignedAmbulance?.id ?? null,
			location: location || prevTrip?.assignedAmbulance?.location || null,
			heading: Number.isFinite(ambulanceRecord.heading)
				? ambulanceRecord.heading
				: (prevTrip?.assignedAmbulance?.heading ?? null),
		},
	};
};

const projectTripFromCanonicalRows = (prevTrip, requestRecord, ambulanceRecord) => {
	let projected = mergeEmergencyRealtimeTrip(prevTrip, requestRecord);
	if (!projected) return null;
	if (ambulanceRecord) {
		projected = mergeAmbulanceRealtimeTrip(projected, ambulanceRecord);
	}
	return projected;
};

const parseBedCount = (value) => {
	const parsed = typeof value === "number" ? value : (typeof value === "string" ? Number(value) : NaN);
	if (!Number.isFinite(parsed) || parsed < 0) return null;
	return Math.floor(parsed);
};

// Patches one entry of the ["hospitals", ...] query cache from a hospitals
// realtime record. Two hooks share that key prefix with different shapes:
// useHospitalsQuery caches a bare array, useEmergencyHospitalsQuery caches
// { allHospitals, displayHospitals, categories }. Unrecognised shapes and
// records without a usable available_beds are returned untouched rather than
// defaulted, so a partial payload never fabricates a bed count.
const applyBedAvailabilityToHospitalsCache = (entry, record) => {
	const hospitalId = record?.id ?? null;
	const availableBeds = parseBedCount(record?.available_beds);
	if (!hospitalId || availableBeds === null) return entry;

	const patchList = (list) => {
		if (!Array.isArray(list)) return list;
		let changed = false;
		const next = list.map((hospital) => {
			if (!hospital || hospital.id !== hospitalId) return hospital;
			if (hospital.availableBeds === availableBeds) return hospital;
			changed = true;
			return { ...hospital, availableBeds };
		});
		return changed ? next : list;
	};

	if (Array.isArray(entry)) return patchList(entry);
	if (!entry || typeof entry !== "object") return entry;

	const allHospitals = patchList(entry.allHospitals);
	const displayHospitals = patchList(entry.displayHospitals);

	let categories = entry.categories;
	if (categories && typeof categories === "object" && !Array.isArray(categories)) {
		let categoriesChanged = false;
		const nextCategories = {};
		for (const [key, value] of Object.entries(categories)) {
			const patched = patchList(value);
			if (patched !== value) categoriesChanged = true;
			nextCategories[key] = patched;
		}
		if (categoriesChanged) categories = nextCategories;
	}

	if (
		allHospitals === entry.allHospitals &&
		displayHospitals === entry.displayHospitals &&
		categories === entry.categories
	) {
		return entry;
	}

	return { ...entry, allHospitals, displayHospitals, categories };
};

module.exports = {
	TERMINAL_EMERGENCY_STATUSES,
	REMOVED_EMERGENCY_STATUSES,
	parseTimestampMs,
	parseRecordTimestampMs,
	parsePointGeometry,
	getTripKeys,
	getRecordKeys,
	matchesTripRecord,
	shouldApplyTripEvent,
	mergeEmergencyRealtimeTrip,
	mergeAmbulanceRealtimeTrip,
	projectTripFromCanonicalRows,
	applyBedAvailabilityToHospitalsCache,
};
