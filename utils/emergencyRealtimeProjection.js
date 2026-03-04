const TERMINAL_EMERGENCY_STATUSES = new Set(["completed", "cancelled", "payment_declined"]);

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
	if (TERMINAL_EMERGENCY_STATUSES.has(status)) {
		return null;
	}

	const loc = parsePointGeometry(record.responder_location);
	const prevAssigned =
		prevTrip?.assignedAmbulance && typeof prevTrip.assignedAmbulance === "object"
			? prevTrip.assignedAmbulance
			: null;

	const hasResponderIdentity = !!(
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
		: prevAssigned;

	return {
		...prevTrip,
		id: record.id ?? prevTrip.id,
		requestId: record.display_id ?? prevTrip.requestId,
		status: record.status ?? prevTrip.status,
		assignedAmbulance: mergedAssigned,
		currentResponderLocation: loc || prevTrip.currentResponderLocation || null,
		currentResponderHeading: Number.isFinite(record.responder_heading)
			? record.responder_heading
			: (prevTrip.currentResponderHeading ?? null),
		responderTelemetryAt: record.updated_at ?? prevTrip.responderTelemetryAt ?? null,
		updatedAt: record.updated_at ?? prevTrip.updatedAt ?? null,
	};
};

const mergeAmbulanceRealtimeTrip = (prevTrip, ambulanceRecord) => {
	if (!prevTrip || !ambulanceRecord) return prevTrip;
	const location = parsePointGeometry(ambulanceRecord.location);
	if (!location) return prevTrip;

	return {
		...prevTrip,
		currentResponderLocation: location,
		responderTelemetryAt: ambulanceRecord.updated_at ?? prevTrip.responderTelemetryAt ?? null,
		updatedAt: ambulanceRecord.updated_at ?? prevTrip.updatedAt ?? null,
		assignedAmbulance: {
			...(prevTrip.assignedAmbulance || {}),
			id: ambulanceRecord.id ?? prevTrip?.assignedAmbulance?.id ?? null,
			location,
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

module.exports = {
	TERMINAL_EMERGENCY_STATUSES,
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
};
