import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { SPECIALTIES } from "../constants/hospitals";
import { emergencyRequestsService } from "../services/emergencyRequestsService";
import { normalizeEmergencyState } from "../utils/domainNormalize";
// import { simulationService } from "../services/simulationService"; // REMOVED: Mock service
import * as Location from "expo-location";

import { notificationDispatcher } from "../services/notificationDispatcher";
import { useNotifications } from "./NotificationsContext";
import { useHospitals } from "../hooks/emergency/useHospitals";
import { useAmbulances } from "../hooks/emergency/useAmbulances";
import { ambulanceService } from "../services/ambulanceService";

// Create the emergency context
const EmergencyContext = createContext();

// Emergency modes
export const EmergencyMode = {
	EMERGENCY: "emergency",
	BOOKING: "booking",
};

const AMBULANCE_LIVE_TRACK_STATUSES = new Set(["accepted", "in_progress", "arrived"]);
const TELEMETRY_STALE_THRESHOLD_MS = 30000;
const TELEMETRY_LOST_THRESHOLD_MS = 120000;

const parseTimestampMs = (value) => {
	if (!value) return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim()) {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const formatTelemetryAge = (ageSeconds) => {
	if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return null;
	if (ageSeconds < 60) return `${Math.round(ageSeconds)}s`;
	const mins = Math.floor(ageSeconds / 60);
	const secs = ageSeconds % 60;
	if (secs <= 0) return `${mins}m`;
	return `${mins}m ${secs}s`;
};

const deriveAmbulanceTelemetryHealth = (trip, nowMs = Date.now()) => {
	const tripKey = trip?.requestId ?? trip?.id ?? null;
	if (!tripKey) {
		return {
			state: "inactive",
			ageMs: null,
			ageSeconds: null,
			ageLabel: null,
			lastUpdateAt: null,
			hasResponderLocation: false,
			staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
			lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
			isFresh: false,
			isStale: false,
			isLost: false,
			summary: null,
		};
	}

	const status = String(trip?.status ?? "").toLowerCase();
	const isTrackedStatus = AMBULANCE_LIVE_TRACK_STATUSES.has(status);
	const hasResponderLocation = !!(
		trip?.currentResponderLocation ||
		trip?.assignedAmbulance?.location
	);
	const rawTelemetryTs = trip?.responderTelemetryAt ?? trip?.updatedAt ?? null;
	const telemetryTsMs = parseTimestampMs(rawTelemetryTs);

	if (!isTrackedStatus || !hasResponderLocation || !telemetryTsMs) {
		return {
			state: "inactive",
			ageMs: null,
			ageSeconds: null,
			ageLabel: null,
			lastUpdateAt: rawTelemetryTs,
			hasResponderLocation,
			staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
			lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
			isFresh: false,
			isStale: false,
			isLost: false,
			summary: null,
		};
	}

	const ageMs = Math.max(0, nowMs - telemetryTsMs);
	const ageSeconds = Math.floor(ageMs / 1000);
	const ageLabel = formatTelemetryAge(ageSeconds);

	let state = "live";
	if (ageMs > TELEMETRY_LOST_THRESHOLD_MS) {
		state = "lost";
	} else if (ageMs > TELEMETRY_STALE_THRESHOLD_MS) {
		state = "stale";
	}

	return {
		state,
		ageMs,
		ageSeconds,
		ageLabel,
		lastUpdateAt: rawTelemetryTs,
		hasResponderLocation,
		staleAfterMs: TELEMETRY_STALE_THRESHOLD_MS,
		lostAfterMs: TELEMETRY_LOST_THRESHOLD_MS,
		isFresh: state === "live",
		isStale: state === "stale",
		isLost: state === "lost",
		summary:
			state === "lost"
				? `Signal lost ${ageLabel ? `${ageLabel} ago` : ""}`.trim()
				: state === "stale"
					? `Signal delayed ${ageLabel ? `${ageLabel} ago` : ""}`.trim()
					: "Live tracking",
	};
};

/**
 * Helper to enrich hospitals with service types.
 * Used by both the initial sync effect and the updateHospitals callback.
 * @param {Array} hospitalList - Array of hospital objects
 * @returns {Array} - Hospitals with serviceTypes array populated
 */
const enrichHospitalsWithServiceTypes = (hospitalList) => {
	if (!Array.isArray(hospitalList)) return [];
	return hospitalList.map((hospital, index) => {
		// If already has serviceTypes from DB, rely on them
		if (hospital.serviceTypes && Array.isArray(hospital.serviceTypes) && hospital.serviceTypes.length > 0) {
			return hospital;
		}

		// Determine service types - allow some hospitals to offer both
		let serviceTypes = [];
		if (hospital.type === "premium") {
			serviceTypes = ["premium"];
			// Some premium hospitals also offer standard service (30% of premium)
			if (index % 3 === 0) {
				serviceTypes.push("standard");
			}
		} else {
			serviceTypes = ["standard"];
			// Some standard hospitals also offer premium service (20% of standard)
			if (index % 5 === 0) {
				serviceTypes.push("premium");
			}
		}

		return { ...hospital, serviceTypes };
	});
};

// Emergency provider component
export function EmergencyProvider({ children }) {
	const { addNotification } = useNotifications();
	// Fetch real hospitals from Supabase
	const { hospitals: dbHospitals, isLoading: isLoadingHospitals } = useHospitals();
	// Fetch real ambulances
	const { ambulances: activeAmbulances } = useAmbulances();

	// User location (for map centering and distance calculations)
	const [userLocation, setUserLocation] = useState(null);

	// Computed state for hospitals (mock location for now + DB data)
	const [hospitals, setHospitals] = useState([]);

	// Sync DB hospitals when loaded, but still randomize location for demo purposes
	// In a real app, you'd use PostGIS to query nearby hospitals
	useEffect(() => {
		// If loading or no hospitals, do nothing
		if (isLoadingHospitals || dbHospitals.length === 0) return;

		// If we don't have user location yet, preserve database distance data
		if (!userLocation) {
			const normalized = dbHospitals.map(h => ({
				...h,
				coordinates: h.coordinates || {
					latitude: h.latitude,
					longitude: h.longitude
				},
				// Preserve database distance and eta values
				distance: h.distance || '--',
				distanceKm: h.distanceKm || 0,
				eta: h.eta || '8-12 mins',
				specialties: h.specialties || [],
				serviceTypes: h.serviceTypes || [],
				features: h.features || [],
			}));
			// Enrich with service types before setting
			setHospitals(enrichHospitalsWithServiceTypes(normalized));
			return;
		}

		// If we DO have user location, use the distance data from database
		// PRODUCTION READY: Use PostGIS calculated distances
		const localized = dbHospitals.map((h) => {
			// Use database distance if available, otherwise calculate fallback
			const dbDistance = h.distance || h.distanceKm;
			const distanceKm = dbDistance ?
				(typeof dbDistance === 'string' ? parseFloat(dbDistance.replace(' km', '')) : dbDistance) :
				(userLocation ?
					Math.sqrt(
						Math.pow(((h.coordinates?.latitude || h.latitude) - userLocation.latitude) * 111, 2) +
						Math.pow(((h.coordinates?.longitude || h.longitude) - userLocation.longitude) * 111, 2)
					) : 0);

			const etaMins = Math.max(2, Math.ceil(distanceKm * 3));

			return {
				...h,
				coordinates: h.coordinates || {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				distance: h.distance || (distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '--'),
				distanceKm: h.distanceKm || distanceKm, // Preserve database value
				eta: h.eta || (distanceKm > 0 ? `${etaMins} mins` : '8-12 mins'),
				specialties: h.specialties || [],
				serviceTypes: h.serviceTypes || [],
				features: h.features || [],
			};
		});

		// Enrich with service types before setting
		setHospitals(enrichHospitalsWithServiceTypes(localized));

	}, [dbHospitals, isLoadingHospitals, userLocation]);

	// Fetch User Location on Mount (for context-aware data)
	useEffect(() => {
		(async () => {
			try {
				// Try last known first for speed
				const lastKnown = await Location.getLastKnownPositionAsync({});
				if (lastKnown) {
					setUserLocation({
						latitude: lastKnown.coords.latitude,
						longitude: lastKnown.coords.longitude,
						latitudeDelta: 0.04,
						longitudeDelta: 0.04,
					});
				}

				// Then try to get permission and fresh location if needed
				// We don't want to block the app or show alerts here, just silently try
				const { status } = await Location.getForegroundPermissionsAsync();
				if (status === 'granted') {
					const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
					setUserLocation({
						latitude: location.coords.latitude,
						longitude: location.coords.longitude,
						latitudeDelta: 0.04,
						longitudeDelta: 0.04,
					});
				}
			} catch (e) {
				// Ignore errors here, Map component will handle explicit permission requests
				console.log("Context location fetch failed (using fallback):", e);
				// Standard fallback location
				setUserLocation({
					latitude: 33.7475,
					longitude: -116.9730,
					latitudeDelta: 0.04,
					longitudeDelta: 0.04,
				});
			}
		})();
	}, []);

	const parseEtaToSeconds = useCallback((eta) => {
		if (eta === null || eta === undefined) return null;

		// If it's already a number, just return it
		if (typeof eta === "number") return eta;

		if (typeof eta !== "string") return null;

		const lower = eta.toLowerCase();
		if (lower === "unknown" || lower === "8-12 mins") return 600; // Fallback to 10 mins

		const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
		if (minutesMatch) return Number(minutesMatch[1]) * 60;
		const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
		if (secondsMatch) return Number(secondsMatch[1]);

		// If it's a numeric string like "407", parse it as seconds
		if (/^\d+$/.test(eta)) return Number(eta);

		return 600; // Final fallback for other non-parseable strings
	}, []);

	const [selectedHospitalId, setSelectedHospitalId] = useState(null);
	const [mode, setMode] = useState(EmergencyMode.EMERGENCY);
	const [activeAmbulanceTrip, setActiveAmbulanceTrip] = useState(null);
	const [activeBedBooking, setActiveBedBooking] = useState(null);
	const [pendingApproval, setPendingApproval] = useState(null);
	const lastHydratedAmbulanceIdRef = useRef(null);
	const isHydratingAmbulanceRef = useRef(false);
	const activeAmbulanceEventRef = useRef({ requestKey: null, versionMs: 0 });
	const [telemetryNowMs, setTelemetryNowMs] = useState(Date.now());

	// Emergency mode state
	const [serviceType, setServiceType] = useState(null); // null = show all, "premium" or "standard"

	// Booking mode state
	const [selectedSpecialty, setSelectedSpecialty] = useState(null); // null = show all

	// View state
	const [viewMode, setViewMode] = useState("map"); // "map" or "list"

	// Helper to parse PostGIS Point — handles both WKT and WKB hex formats
	const parsePoint = (input) => {
		if (!input) return null;
		try {
			// Format 0: GeoJSON object ? { type: 'Point', coordinates: [lon, lat] }
			if (typeof input === 'object' && Array.isArray(input.coordinates) && input.coordinates.length >= 2) {
				const longitude = Number(input.coordinates[0]);
				const latitude = Number(input.coordinates[1]);
				if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
					return { longitude, latitude };
				}
				return null;
			}

			if (typeof input !== 'string') return null;

			// Format 1: WKT — POINT(longitude latitude)
			if (input.startsWith('POINT')) {
				const matches = input.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
				if (matches && matches.length === 3) {
					return { longitude: parseFloat(matches[1]), latitude: parseFloat(matches[2]) };
				}
			}


			// Format 2: WKB Hex — e.g. "0101000020E610000079BB4DC0B23F5DC08A0A14EB67E04040"
			// Structure: byte_order(2) + type(8) + SRID(8) + X_double(16) + Y_double(16) = 50 chars min
			if (/^[0-9a-fA-F]{40,}$/.test(input)) {
				// Parse as little-endian WKB with SRID (byte order = 01)
				const hexToDouble = (hex) => {
					const bytes = new Uint8Array(8);
					for (let i = 0; i < 8; i++) {
						bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
					}
					return new Float64Array(bytes.buffer)[0];
				};

				// Skip: byte_order(2) + type(8) + SRID(8) = 18 hex chars
				// Then: X(16 hex) + Y(16 hex)
				const offset = input.length >= 50 ? 18 : 2 + 8; // With or without SRID
				const xHex = input.substring(offset, offset + 16);
				const yHex = input.substring(offset + 16, offset + 32);

				const longitude = hexToDouble(xHex);
				const latitude = hexToDouble(yHex);

				if (Number.isFinite(longitude) && Number.isFinite(latitude) &&
					Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
					return { longitude, latitude };
				}
			}
		} catch (e) { return null; }
		return null;
	};

	const toEventTimestampMs = (record, fallbackMs = Date.now()) => {
		const rawTs = record?.updated_at ?? record?.created_at ?? null;
		if (typeof rawTs === "string" && rawTs.trim()) {
			const parsed = Date.parse(rawTs);
			if (Number.isFinite(parsed)) return parsed;
		}
		return fallbackMs;
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
		if (tripKeys.length === 0) return false;
		const recordKeys = getRecordKeys(record);
		if (recordKeys.length === 0) return false;
		return recordKeys.some((key) => tripKeys.includes(key));
	};

	const resetAmbulanceEventVersion = () => {
		activeAmbulanceEventRef.current = { requestKey: null, versionMs: 0 };
	};

	const shouldApplyAmbulanceEvent = (trip, record) => {
		if (!matchesTripRecord(trip, record)) return false;
		const requestKey = String(trip?.id ?? trip?.requestId ?? "");
		if (!requestKey) return false;

		const nextVersionMs = toEventTimestampMs(record);
		const current = activeAmbulanceEventRef.current;

		if (current.requestKey && current.requestKey !== requestKey) {
			activeAmbulanceEventRef.current = { requestKey, versionMs: nextVersionMs };
			return true;
		}

		if (nextVersionMs < (current.versionMs ?? 0)) {
			return false;
		}

		activeAmbulanceEventRef.current = { requestKey, versionMs: nextVersionMs };
		return true;
	};

	useEffect(() => {
		const shouldTrack =
			!!activeAmbulanceTrip?.requestId &&
			AMBULANCE_LIVE_TRACK_STATUSES.has(String(activeAmbulanceTrip?.status ?? "").toLowerCase());
		if (!shouldTrack) return;

		setTelemetryNowMs(Date.now());
		const intervalId = setInterval(() => {
			setTelemetryNowMs(Date.now());
		}, 5000);
		return () => clearInterval(intervalId);
	}, [activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.status]);

	const ambulanceTelemetryHealth = useMemo(
		() => deriveAmbulanceTelemetryHealth(activeAmbulanceTrip, telemetryNowMs),
		[activeAmbulanceTrip, telemetryNowMs]
	);

	// Real-time Subscription to Emergency Requests
	useEffect(() => {
		let subscription;

		const setupSubscription = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			subscription = supabase
				.channel('emergency_updates')
				.on(
					'postgres_changes',
					{
						event: 'UPDATE',
						schema: 'public',
						table: 'emergency_requests',
						filter: `user_id=eq.${user.id}`,
					},
						(payload) => {
							const newRecord = payload.new;
							const isTerminalStatus =
								newRecord?.status === "completed" ||
								newRecord?.status === "cancelled" ||
								newRecord?.status === "payment_declined";

							setActiveBedBooking((prev) => {
								if (!prev) return prev;
								if (!matchesTripRecord(prev, newRecord)) {
									return prev;
								}
								if (isTerminalStatus) {
									return null;
								}

								return {
									...prev,
								status: newRecord.status,
								hospitalId: newRecord.hospital_id ?? prev.hospitalId,
								hospitalName: newRecord.hospital_name ?? prev.hospitalName,
								specialty: newRecord.specialty ?? prev.specialty,
								bedNumber: newRecord.bed_number ?? prev.bedNumber,
								bedType: newRecord.bed_type ?? prev.bedType,
								bedCount: newRecord.bed_count ?? prev.bedCount,
								estimatedWait: newRecord.estimated_arrival ?? prev.estimatedWait,
							};
						});

							setActiveAmbulanceTrip((prev) => {
								if (!prev) return prev;
								if (!shouldApplyAmbulanceEvent(prev, newRecord)) {
									return prev;
								}

								if (isTerminalStatus) {
									resetAmbulanceEventVersion();
									return null;
								}

								const loc = parsePoint(newRecord.responder_location);
								const prevAssigned = prev?.assignedAmbulance ?? null;
								const hasResponderIdentity = !!(
									newRecord.responder_name ||
									newRecord.responder_phone ||
									newRecord.responder_vehicle_type ||
									newRecord.responder_vehicle_plate ||
									newRecord.responder_id ||
									newRecord.ambulance_id ||
									loc
								);
									const mergedAssigned = hasResponderIdentity
									? {
										...(prevAssigned && typeof prevAssigned === "object" ? prevAssigned : {}),
										id: newRecord.ambulance_id || prevAssigned?.id || "ems_001",
									type:
										newRecord.responder_vehicle_type || prevAssigned?.type || "Ambulance",
									plate: newRecord.responder_vehicle_plate || prevAssigned?.plate,
									name: newRecord.responder_name || prevAssigned?.name,
									phone: newRecord.responder_phone || prevAssigned?.phone,
									location: loc || prevAssigned?.location,
									heading:
											Number.isFinite(newRecord.responder_heading)
												? newRecord.responder_heading
												: prevAssigned?.heading || 0,
									}
									: prevAssigned;

								return {
									...prev,
									id: newRecord.id ?? prev.id,
									requestId: newRecord.display_id ?? prev.requestId,
									status: newRecord.status,
									assignedAmbulance: mergedAssigned,
									currentResponderLocation: loc || prev.currentResponderLocation,
									currentResponderHeading:
										Number.isFinite(newRecord.responder_heading)
											? newRecord.responder_heading
											: prev.currentResponderHeading,
									responderTelemetryAt: newRecord.updated_at ?? prev.responderTelemetryAt ?? null,
									updatedAt: newRecord.updated_at ?? prev.updatedAt ?? null,
								};
							});
						}
					)
				.subscribe();
		};

		setupSubscription();

		return () => {
			if (subscription) supabase.removeChannel(subscription);
			// REMOVED: simulationService.stopSimulation();
			// Real-time tracking handled by subscriptions
		};
	}, []); // Removed dependency on activeAmbulanceTrip to avoid re-subscribing

	useEffect(() => {
		const requestKey = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		if (!requestKey) {
			resetAmbulanceEventVersion();
			return;
		}

		const persistedVersion = toEventTimestampMs(
			{
				updated_at:
					activeAmbulanceTrip?.responderTelemetryAt ??
					activeAmbulanceTrip?.updatedAt ??
					null,
			},
			0
		);
		const currentVersion = activeAmbulanceEventRef.current?.versionMs ?? 0;
		activeAmbulanceEventRef.current = {
			requestKey: String(requestKey),
			versionMs: Math.max(currentVersion, persistedVersion),
		};
	}, [
		activeAmbulanceTrip?.id,
		activeAmbulanceTrip?.requestId,
		activeAmbulanceTrip?.responderTelemetryAt,
		activeAmbulanceTrip?.updatedAt,
	]);

	// Sync User Location to Server during Active Trip
	useEffect(() => {
		if (!activeAmbulanceTrip || !activeAmbulanceTrip.requestId) return;
		if (activeAmbulanceTrip.status === 'completed' || activeAmbulanceTrip.status === 'cancelled') return;

		let locationSubscription = null;

		(async () => {
			try {
				const { status } = await Location.getForegroundPermissionsAsync();
				if (status !== 'granted') return;

				locationSubscription = await Location.watchPositionAsync(
					{
						accuracy: Location.Accuracy.High,
						distanceInterval: 10, // Update every 10 meters
						timeInterval: 10000,   // Or every 10 seconds
					},
					(location) => {
						const { latitude, longitude, heading } = location.coords;

						// Update local state for UI if needed (though map usually handles its own or uses this context)
						setUserLocation(prev => ({
							...prev,
							latitude,
							longitude,
						}));

						// Sync to Supabase
						// PostGIS expects: 'POINT(lon lat)'
						emergencyRequestsService.updateLocation(
							activeAmbulanceTrip.requestId,
							`POINT(${longitude} ${latitude})`,
							heading || 0
						);
					}
				);
			} catch (e) {
				console.warn("Location tracking failed:", e);
			}
		})();

		return () => {
			if (locationSubscription) locationSubscription.remove();
		};
	}, [activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.status]);


	useEffect(() => {
		let isActive = true;
		(async () => {
			let attempt = 0;
			let activeRequests = [];
			while (isActive && attempt < 10) {
				const { data: { user } } = await supabase.auth.getUser();
				if (user) break;
				attempt += 1;
				// if (__DEV__) {
				// 	console.log("[EmergencyContext] Hydrate requests: waiting for user session", {
				// 		attempt,
				// 	});
				// }
				await new Promise((resolve) => setTimeout(resolve, 400));
			}

			activeRequests = await emergencyRequestsService.list();
			const isActiveStatus = (status) =>
				status === "pending_approval" || status === "in_progress" || status === "accepted" || status === "arrived";
			const activeAmbulance = activeRequests.find(
				(r) => r?.serviceType === "ambulance" && isActiveStatus(r?.status)
			);
			const activeBed = activeRequests.find(
				(r) => r?.serviceType === "bed" && isActiveStatus(r?.status)
			);

			if (!isActive) return;
			// if (__DEV__) {
			// 	console.log("[EmergencyContext] Hydrate requests result:", {
			// 		count: Array.isArray(activeRequests) ? activeRequests.length : 0,
			// 		activeAmbulanceId: activeAmbulance?.requestId ?? null,
			// 		activeAmbulanceStatus: activeAmbulance?.status ?? null,
			// 		activeBedId: activeBed?.requestId ?? null,
			// 		activeBedStatus: activeBed?.status ?? null,
			// 	});
			// }

			if (activeAmbulance) {
				let loc = null;
				if (activeAmbulance.responderLocation) {
					if (
						typeof activeAmbulance.responderLocation === "object" &&
						activeAmbulance.responderLocation.coordinates
					) {
						loc = {
							latitude: activeAmbulance.responderLocation.coordinates[1],
							longitude: activeAmbulance.responderLocation.coordinates[0],
						};
					} else if (typeof activeAmbulance.responderLocation === "string") {
						loc = parsePoint(activeAmbulance.responderLocation);
					}
				}

				let fullAmbulance = null;
				if (activeAmbulance.ambulanceId) {
					try {
						fullAmbulance = await ambulanceService.getById(activeAmbulance.ambulanceId);
					} catch (e) {
					}
				}

				const startedAt = activeAmbulance.createdAt
					? Date.parse(activeAmbulance.createdAt)
					: Date.now();
					const etaSeconds = parseEtaToSeconds(activeAmbulance.estimatedArrival);
					const hasResponderIdentity = !!(
						activeAmbulance.responderName ||
						activeAmbulance.responderPhone ||
						activeAmbulance.responderVehicleType ||
						activeAmbulance.responderVehiclePlate ||
						activeAmbulance.ambulanceId ||
						loc
					);
					const hydratedTrip = {
						id: activeAmbulance.id ?? null,
						hospitalId: activeAmbulance.hospitalId,
						requestId: activeAmbulance.requestId,
						status: activeAmbulance.status,
					estimatedArrival: activeAmbulance.estimatedArrival ?? null,
					etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
					startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
						assignedAmbulance: hasResponderIdentity
							? {
								...fullAmbulance,
								id: activeAmbulance.ambulanceId || "ems_001",
							type:
								activeAmbulance.responderVehicleType ||
								fullAmbulance?.type ||
								"Ambulance",
							plate:
								activeAmbulance.responderVehiclePlate ||
								fullAmbulance?.vehicleNumber,
							name: activeAmbulance.responderName,
							phone: activeAmbulance.responderPhone,
							location: loc || fullAmbulance?.location,
							heading: activeAmbulance.responderHeading || 0,
							}
							: null,
						currentResponderLocation: loc,
						currentResponderHeading: activeAmbulance.responderHeading,
						responderTelemetryAt: activeAmbulance.updatedAt ?? null,
						updatedAt: activeAmbulance.updatedAt ?? null,
					};

				setActiveAmbulanceTrip(hydratedTrip);
			}

			if (activeBed) {
				const startedAt = activeBed.createdAt ? Date.parse(activeBed.createdAt) : Date.now();
				const etaSeconds = parseEtaToSeconds(activeBed.estimatedArrival);
				const hydratedBedBooking = {
					id: activeBed.id ?? null,
					hospitalId: activeBed.hospitalId,
					requestId: activeBed.requestId,
					status: activeBed.status,
					hospitalName: activeBed.hospitalName ?? null,
					specialty: activeBed.specialty ?? null,
					bedNumber: activeBed.bedNumber ?? null,
					bedType: activeBed.bedType ?? null,
					bedCount: activeBed.bedCount ?? null,
					estimatedWait: activeBed.estimatedArrival ?? null,
					etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
					startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
				};

				setActiveBedBooking(hydratedBedBooking);
			}

			// HYDRATE PENDING APPROVALS
			// If a request exists in 'pending_approval' status, it's a cash job waiting for hospital review
			const pendingMatch = activeRequests.find(r => r?.status === 'pending_approval');
			if (pendingMatch) {
				const pendingEtaSeconds = parseEtaToSeconds(pendingMatch.estimatedArrival);
				setPendingApproval({
					id: pendingMatch.id ?? null,
					requestId: pendingMatch.requestId,
					displayId: pendingMatch.displayId ?? pendingMatch.requestId ?? null,
					hospitalId: pendingMatch.hospitalId,
					hospitalName: pendingMatch.hospitalName,
					serviceType: pendingMatch.serviceType,
					ambulanceType: pendingMatch.responderVehicleType, // Capture if ambulance
					specialty: pendingMatch.specialty ?? null,
					bedNumber: pendingMatch.bedNumber ?? null,
					bedType: pendingMatch.bedType,
					bedCount: pendingMatch.bedCount ?? null,
					totalAmount: pendingMatch.totalCost ?? null,
					paymentStatus: pendingMatch.paymentStatus ?? null,
					estimatedArrival: pendingMatch.estimatedArrival ?? null,
					etaSeconds: Number.isFinite(pendingEtaSeconds) ? pendingEtaSeconds : null,
				});
			}
		})();
		return () => {
			isActive = false;
		};
	}, []);

	useEffect(() => {
		const assigned = activeAmbulanceTrip?.assignedAmbulance;
		const ambulanceId = assigned?.id ?? null;
		if (!ambulanceId) return;
		if (lastHydratedAmbulanceIdRef.current === ambulanceId) return;
		if (isHydratingAmbulanceRef.current) return;

		const needsHydrate =
			!Number.isFinite(assigned?.rating) ||
			!Array.isArray(assigned?.crew) ||
			(!assigned?.vehicleNumber && !assigned?.callSign);
		if (!needsHydrate) {
			lastHydratedAmbulanceIdRef.current = ambulanceId;
			return;
		}

		isHydratingAmbulanceRef.current = true;
		(async () => {
			try {
				const full = await ambulanceService.getById(ambulanceId);
				if (!full || typeof full !== "object") return;
				lastHydratedAmbulanceIdRef.current = ambulanceId;

				setActiveAmbulanceTrip((prev) => {
					if (!prev) return prev;
					const prevAssigned = prev?.assignedAmbulance;
					if (!prevAssigned || prevAssigned.id !== ambulanceId) return prev;

					const merged = { ...full };
					if (prevAssigned && typeof prevAssigned === "object") {
						Object.keys(prevAssigned).forEach((key) => {
							const value = prevAssigned[key];
							if (value !== undefined && value !== null) {
								merged[key] = value;
							}
						});
					}

					return {
						...prev,
						assignedAmbulance: merged,
					};
				});
			} catch (e) {
			} finally {
				isHydratingAmbulanceRef.current = false;
			}
		})();
	}, [activeAmbulanceTrip?.assignedAmbulance?.id]);

	// We don't need to manually save state anymore, Supabase handles it.
	// useEffect(() => {
	// 	emergencyStateService.set({ mode, activeAmbulanceTrip, activeBedBooking }).catch(() => {});
	// }, [activeAmbulanceTrip, activeBedBooking, mode]);

	// Get selected hospital object
	const selectedHospital = useMemo(() => {
		const hospital = hospitals.find(h => h.id === selectedHospitalId) || null;
		return hospital;
	}, [hospitals, selectedHospitalId]);

	// Filter hospitals based on current mode and criteria
	const filteredHospitals = useMemo(() => {
		if (!hospitals || hospitals.length === 0) {
			return [];
		}

		return hospitals.filter((hospital) => {
			if (!hospital) return false;

			// Emergency Mode Logic
			if (mode === EmergencyMode.EMERGENCY) {
				// 🔴 FAILSAFE: If no service type is selected, we MUST return true.
				if (!serviceType || serviceType === "null" || serviceType === null) {
					return true;
				}

				const type = typeof serviceType === 'string' ? serviceType.toLowerCase() : "";
				const hasServiceType = (hospital.serviceTypes || []).some(t => t.toLowerCase() === type);
				const matchesTypeProp = (hospital.type || "").toLowerCase() === type;

				return hasServiceType || matchesTypeProp;
			} else {
				// Booking Mode: Filter by Specialty
				if (!selectedSpecialty) return true; // Show all if no specialty selected

				const hospitalSpecialties = hospital.specialties || [];
				return hospitalSpecialties.some(specialty =>
					specialty &&
					typeof specialty === 'string' &&
					specialty.toLowerCase() === selectedSpecialty.toLowerCase()
				);
			}
		});
	}, [hospitals, mode, serviceType, selectedSpecialty]);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		if (mode === EmergencyMode.EMERGENCY) {
			return serviceType !== null;
		} else {
			return selectedSpecialty !== null;
		}
	}, [mode, serviceType, selectedSpecialty]);

	// Reset all filters
	const resetFilters = useCallback(() => {
		setServiceType(null);
		setSelectedSpecialty(null);
		setSelectedHospitalId(null);
	}, []);

	// Actions
	const selectHospital = useCallback((hospitalId) => {
		setSelectedHospitalId(hospitalId);
	}, []);

	const clearSelectedHospital = useCallback(() => {
		setSelectedHospitalId(null);
	}, []);

	const startAmbulanceTrip = useCallback(
		(trip) => {
			if (!trip?.hospitalId) return;
			const etaSeconds =
				Number.isFinite(trip?.etaSeconds) ? trip.etaSeconds : parseEtaToSeconds(trip?.estimatedArrival);
			const explicitAssigned =
				trip?.assignedAmbulance && typeof trip.assignedAmbulance === "object"
					? trip.assignedAmbulance
					: null;

			const byId =
				trip?.ambulanceId
					? activeAmbulances.find((a) => a?.id === trip.ambulanceId) ?? null
					: null;
			const byHospital =
				trip?.hospitalName
					? activeAmbulances.find((a) => a?.hospital === trip.hospitalName) ?? null
					: null;
			const fallback =
				activeAmbulances.find((a) => a?.status === "available") ??
				activeAmbulances[0] ??
				null;

			const discoveredAssigned = byId ?? byHospital ?? fallback;
			const assignedAmbulance = explicitAssigned
				? { ...(discoveredAssigned || {}), ...explicitAssigned }
				: discoveredAssigned;

				setActiveAmbulanceTrip({
					id: trip.id ?? null,
					hospitalId: trip.hospitalId,
					requestId: trip.requestId ?? null,
					status: trip.status ?? null,
				ambulanceId: assignedAmbulance?.id ?? trip.ambulanceId ?? null,
				ambulanceType: trip.ambulanceType ?? assignedAmbulance?.type ?? null,
				estimatedArrival: trip.estimatedArrival ?? null,
				etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
				assignedAmbulance,
				startedAt: Number.isFinite(trip?.startedAt) ? trip.startedAt : Date.now(),
				currentResponderLocation:
					trip?.currentResponderLocation ??
					assignedAmbulance?.location ??
					null,
					currentResponderHeading:
						Number.isFinite(trip?.currentResponderHeading)
							? trip.currentResponderHeading
							: (Number.isFinite(assignedAmbulance?.heading) ? assignedAmbulance.heading : null),
					responderTelemetryAt: trip?.responderTelemetryAt ?? trip?.updatedAt ?? null,
					updatedAt: trip?.updatedAt ?? null,
				});
			// REMOVED: simulationService.startSimulation(trip.requestId, trip.route);
			// Real-time ambulance tracking handled by subscriptions
		},
		[parseEtaToSeconds]
	);

	const stopAmbulanceTrip = useCallback(() => {
		resetAmbulanceEventVersion();
		setActiveAmbulanceTrip(null);
	}, []);

	const setAmbulanceTripStatus = useCallback((status) => {
		if (status === "completed" || status === "cancelled" || status === "payment_declined") {
			resetAmbulanceEventVersion();
		}
		setActiveAmbulanceTrip((prev) => {
			if (!prev) return prev;
			return { ...prev, status };
		});
	}, []);

	const patchActiveAmbulanceTrip = useCallback((updates) => {
		if (!updates || typeof updates !== "object") return;
		setActiveAmbulanceTrip((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				...updates,
				assignedAmbulance:
					updates.assignedAmbulance && typeof updates.assignedAmbulance === "object"
						? {
							...(prev.assignedAmbulance || {}),
							...updates.assignedAmbulance,
						}
						: prev.assignedAmbulance,
			};
		});
	}, []);

	const startBedBooking = useCallback(
		(booking) => {
			if (!booking?.hospitalId) return;

			const rawEta = booking?.estimatedWait ?? booking?.estimatedArrival;

			const etaSeconds =
				Number.isFinite(booking?.etaSeconds)
					? booking.etaSeconds
					: parseEtaToSeconds(booking?.estimatedWait ?? booking?.estimatedArrival);

			setActiveBedBooking({
				id: booking.id ?? null,
				hospitalId: booking.hospitalId,
				bookingId: booking.bookingId ?? booking.requestId ?? null,
				requestId: booking.requestId ?? booking.bookingId ?? null,
				status: booking.status ?? null,
				bedNumber: booking.bedNumber ?? null,
				bedType: booking.bedType ?? null,
				bedCount: booking.bedCount ?? null,
				specialty: booking.specialty ?? null,
				hospitalName: booking.hospitalName ?? null,
				estimatedWait: booking.estimatedWait ?? booking.estimatedArrival ?? null,
				etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
				startedAt: Number.isFinite(booking?.startedAt) ? booking.startedAt : Date.now(),
			});
		},
		[parseEtaToSeconds]
	);

	const stopBedBooking = useCallback(() => {
		setActiveBedBooking(null);
	}, []);

	const setBedBookingStatus = useCallback((status) => {
		setActiveBedBooking((prev) => {
			if (!prev) return prev;
			return { ...prev, status };
		});
	}, []);

	const toggleMode = useCallback(() => {
		setMode(prevMode =>
			prevMode === EmergencyMode.EMERGENCY
				? EmergencyMode.BOOKING
				: EmergencyMode.EMERGENCY
		);
		setSelectedHospitalId(null); // Clear selection on mode change
	}, []);

	const selectSpecialty = useCallback((specialty) => {
		setSelectedSpecialty(specialty);
		setSelectedHospitalId(null); // Clear selection on specialty change
	}, []);

	const selectServiceType = useCallback((type) => {
		setServiceType(type ? type.toLowerCase() : null);
		setSelectedHospitalId(null); // Clear selection on type change
	}, []);

	const toggleViewMode = useCallback(() => {
		setViewMode(prevMode => prevMode === "map" ? "list" : "map");
	}, []);

	const normalizeHospitals = useCallback((input) => {
		if (!Array.isArray(input)) return [];
		const isValidCoordinate = (coordinate) =>
			Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

		return input
			.filter(Boolean)
			.map((h) => {
				if (!h || !h.id) return null;
				const specialties = Array.isArray(h.specialties)
					? h.specialties.filter((s) => typeof s === "string")
					: [];
				const availableBeds = Number.isFinite(h.availableBeds)
					? h.availableBeds
					: typeof h.availableBeds === "string"
						? Number(h.availableBeds)
						: 0;
				const coordinates = isValidCoordinate(h.coordinates) ? h.coordinates : null;

				return {
					...h,
					specialties,
					availableBeds: Number.isFinite(availableBeds) ? availableBeds : 0,
					coordinates,
				};
			})
			.filter(Boolean);
	}, []);

	// Update hospitals (for when we integrate with API)
	const updateHospitals = useCallback((newHospitals) => {
		const normalized = normalizeHospitals(newHospitals);
		const enriched = enrichHospitalsWithServiceTypes(normalized);
		setHospitals(enriched);
	}, [normalizeHospitals]);

	// REAL-TIME SUBSCRIPTIONS
	useEffect(() => {
		const emergencyRequestSubscriptionKey =
			activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		if (!emergencyRequestSubscriptionKey) return;

		let unsubscribeEmergency = null;
		let unsubscribeAmbulance = null;

		const setupSubscriptions = async () => {
			try {
				unsubscribeEmergency = await emergencyRequestsService.subscribeToEmergencyUpdates(
					emergencyRequestSubscriptionKey,
					(payload) => {
						if (!payload.new) return;
						setActiveAmbulanceTrip((prev) => {
							if (!prev) return prev;
							if (!shouldApplyAmbulanceEvent(prev, payload.new)) return prev;

							const isTerminalStatus =
								payload.new.status === "completed" ||
								payload.new.status === "cancelled" ||
								payload.new.status === "payment_declined";
							if (isTerminalStatus) {
								resetAmbulanceEventVersion();
								return null;
							}

							const loc = parsePoint(payload.new.responder_location);
							return {
								...prev,
								status: payload.new.status ?? prev.status,
								currentResponderLocation: loc || prev.currentResponderLocation,
								currentResponderHeading:
									Number.isFinite(payload.new.responder_heading)
										? payload.new.responder_heading
										: prev.currentResponderHeading,
								responderTelemetryAt: payload.new.updated_at ?? prev.responderTelemetryAt ?? null,
								updatedAt: payload.new.updated_at ?? prev.updatedAt ?? null,
							};
						});
					}
				);

				unsubscribeAmbulance = await emergencyRequestsService.subscribeToAmbulanceLocation(
					emergencyRequestSubscriptionKey,
					(payload) => {
						if (!payload.new?.location) return;
						const coords = parsePoint(payload.new.location);
						if (!coords) return;

						setActiveAmbulanceTrip((prev) => {
							if (!prev) return prev;
							if (!shouldApplyAmbulanceEvent(prev, payload.new)) return prev;
							return {
								...prev,
								currentResponderLocation: coords,
								responderTelemetryAt: payload.new.updated_at ?? prev.responderTelemetryAt ?? null,
								updatedAt: payload.new.updated_at ?? prev.updatedAt ?? null,
								assignedAmbulance: {
									...(prev.assignedAmbulance || {}),
									location: coords,
								},
							};
						});
					}
				);
			} catch (error) {
				console.warn('[EmergencyContext] Failed to setup subscriptions:', error);
			}
		};

		setupSubscriptions();

		return () => {
			if (unsubscribeEmergency && typeof unsubscribeEmergency === 'function') {
				unsubscribeEmergency();
			}
			if (unsubscribeAmbulance && typeof unsubscribeAmbulance === 'function') {
				unsubscribeAmbulance();
			}
		};
	}, [activeAmbulanceTrip?.id, activeAmbulanceTrip?.requestId]);

	useEffect(() => {
		if (!activeBedBooking?.hospitalId) return;

		let unsubscribeBeds = null;

		const setupBedSubscription = async () => {
			try {
				unsubscribeBeds = await emergencyRequestsService.subscribeToHospitalBeds(
					activeBedBooking.hospitalId,
					(payload) => {
						if (payload.new) {
							// Update hospital bed count in real-time
							updateHospitals(hospitals.map(h =>
								h.id === payload.new.id
									? { ...h, availableBeds: payload.new.available_beds }
									: h
							));
						}
					}
				);
			} catch (error) {
				console.warn('[EmergencyContext] Failed to setup bed subscription:', error);
			}
		};

		setupBedSubscription();

		return () => {
			if (unsubscribeBeds && typeof unsubscribeBeds === 'function') {
				unsubscribeBeds();
			}
		};
	}, [activeBedBooking?.hospitalId, hospitals, updateHospitals]);

	const value = useMemo(
		() => ({
			// State
			hospitals: filteredHospitals,
			allHospitals: hospitals,
			filteredHospitals,
			selectedHospitalId,
			selectedHospital,
			mode,
			userLocation,
			activeAmbulanceTrip,
			ambulanceTelemetryHealth,
			activeBedBooking,
			serviceType,
			selectedSpecialty,
			viewMode,
			pendingApproval,

			// Actions
			selectHospital,
			clearSelectedHospital,
			toggleMode,
			setMode,
			toggleViewMode,
			selectSpecialty,
			selectServiceType,
			resetFilters,
			startAmbulanceTrip,
			stopAmbulanceTrip,
			setAmbulanceTripStatus,
			patchActiveAmbulanceTrip,
			startBedBooking,
			stopBedBooking,
			setBedBookingStatus,
			updateHospitals,
			setUserLocation,
			setPendingApproval,
		}),
		[
			filteredHospitals,
			hospitals,
			selectedHospitalId,
			selectedHospital,
			mode,
			userLocation,
			activeAmbulanceTrip,
			ambulanceTelemetryHealth,
			activeBedBooking,
			serviceType,
			selectedSpecialty,
			viewMode,
			pendingApproval,
			selectHospital,
			clearSelectedHospital,
			toggleMode,
			toggleViewMode,
			selectSpecialty,
			selectServiceType,
			resetFilters,
			startAmbulanceTrip,
			stopAmbulanceTrip,
			setAmbulanceTripStatus,
			patchActiveAmbulanceTrip,
			startBedBooking,
			stopBedBooking,
			setBedBookingStatus,
			updateHospitals,
			setUserLocation,
			setPendingApproval,
		]
	);

	return (
		<EmergencyContext.Provider value={value}>
			{children}
		</EmergencyContext.Provider>
	);
}

// Custom hook to use the emergency context
export function useEmergency() {
	const context = useContext(EmergencyContext);
	if (context === undefined) {
		throw new Error("useEmergency must be used within an EmergencyProvider");
	}
	return context;
}
