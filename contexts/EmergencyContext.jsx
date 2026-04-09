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
import { demoEcosystemService } from "../services/demoEcosystemService";
import { usePreferences } from "./PreferencesContext";
import { useAuth } from "./AuthContext";
import { useGlobalLocation } from "./GlobalLocationContext";
import {
	coverageModeService,
	COVERAGE_MODES,
	COVERAGE_STATUS,
	COVERAGE_POOR_THRESHOLD,
} from "../services/coverageModeService";
import { DEFAULT_APP_REGION } from "../constants/locationDefaults";
import { calculateBearing, isValidCoordinate } from "../utils/mapUtils";
import {
	parseRecordTimestampMs,
	parsePointGeometry,
	matchesTripRecord,
	shouldApplyTripEvent,
	mergeEmergencyRealtimeTrip,
	mergeAmbulanceRealtimeTrip,
} from "../utils/emergencyRealtimeProjection";

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
const REALTIME_RECOVERY_STATUSES = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);
const REALTIME_HEALTHY_STATUSES = new Set(["SUBSCRIBED"]);
const REALTIME_TRUTH_SYNC_DEBOUNCE_MS = 6000;
const DEMO_RESPONDER_HEARTBEAT_MS = 4000;

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

const normalizeCoordinate = (value) => {
	if (!value || typeof value !== "object") return null;
	if (isValidCoordinate(value)) {
		return {
			latitude: Number(value.latitude),
			longitude: Number(value.longitude),
		};
	}
	if (Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
		return {
			latitude: Number(value.lat),
			longitude: Number(value.lng),
		};
	}
	return null;
};

const normalizeRouteCoordinates = (route) => {
	if (!Array.isArray(route)) return [];
	return route
		.map((point) => normalizeCoordinate(point))
		.filter((point) => isValidCoordinate(point));
};

const interpolateRoutePosition = (routeCoordinates, progressRatio) => {
	if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
		return null;
	}

	const boundedProgress = Math.min(1, Math.max(0, progressRatio));
	const totalSegments = routeCoordinates.length - 1;
	const segmentProgress = boundedProgress * totalSegments;
	const currentSegmentIndex = Math.min(
		routeCoordinates.length - 2,
		Math.floor(segmentProgress)
	);
	const segmentRatio = segmentProgress - currentSegmentIndex;
	const currentCoord = routeCoordinates[currentSegmentIndex];
	const nextCoord = routeCoordinates[currentSegmentIndex + 1];

	const coordinate = {
		latitude:
			currentCoord.latitude +
			(nextCoord.latitude - currentCoord.latitude) * segmentRatio,
		longitude:
			currentCoord.longitude +
			(nextCoord.longitude - currentCoord.longitude) * segmentRatio,
	};

	return {
		coordinate,
		heading: calculateBearing(currentCoord, nextCoord),
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
	const { preferences, updatePreferences } = usePreferences();
	const { user } = useAuth();
	const { userLocation: globalUserLocation } = useGlobalLocation();
	const legacyDemoModeEnabled = preferences?.demoModeEnabled !== false;
	const legacyCoverageMode = coverageModeService.modeFromDemoPreference(
		legacyDemoModeEnabled
	);
	const [demoOwnerSlug, setDemoOwnerSlug] = useState("");
	const [coverageModePreference, setCoverageModePreference] = useState(null);
	const [coverageModePreferenceLoaded, setCoverageModePreferenceLoaded] = useState(false);
	const [coverageModeOperation, setCoverageModeOperation] = useState({
		isPending: false,
		targetMode: null,
	});
	const [forceDemoFetch, setForceDemoFetch] = useState(false);
	const preferredCoverageMode = coverageModePreference || legacyCoverageMode;
	const allowsPreferredDemo = coverageModeService.allowsDemo(preferredCoverageMode);

	// User location is the single source of truth for both the map and nearby hospital discovery.
	const [userLocation, setUserLocation] = useState(null);
	// Fetch real hospitals from Supabase
	const {
		hospitals: dbHospitals,
		allHospitals: discoveredDbHospitals,
		isLoading: isLoadingHospitals,
		refetch: refetchHospitals,
	} = useHospitals({
		location: userLocation,
		demoModeEnabled: allowsPreferredDemo || forceDemoFetch,
		demoBootstrapEnabled: false,
		skipInternalLocationLookup: true,
		userId: user?.id,
	});
	// Fetch real ambulances
	const { ambulances: activeAmbulances } = useAmbulances();

	// Computed state for hospitals (mock location for now + DB data)
	const [hospitals, setHospitals] = useState([]);

	useEffect(() => {
		let isMounted = true;

		const loadCoverageModePreference = async () => {
			setCoverageModePreferenceLoaded(false);
			setForceDemoFetch(false);

			const storedMode = await coverageModeService.getStoredMode(user?.id);
			if (!isMounted) return;

			setCoverageModePreference(storedMode);
			setCoverageModePreferenceLoaded(true);
		};

		loadCoverageModePreference();
		return () => {
			isMounted = false;
		};
	}, [user?.id]);

	useEffect(() => {
		let isMounted = true;

		const resolveDemoOwnerSlug = async () => {
			try {
				const nextSlug = await demoEcosystemService.getProvisioningOwnerSlug(user?.id);
				if (isMounted) {
					setDemoOwnerSlug(nextSlug);
				}
			} catch (_error) {
				if (isMounted) {
					setDemoOwnerSlug("");
				}
			}
		};

		void resolveDemoOwnerSlug();

		return () => {
			isMounted = false;
		};
	}, [user?.id]);

	// Sync DB hospitals whenever nearby discovery changes for the current map location.
	useEffect(() => {
		if (isLoadingHospitals) return;
		const sourceHospitals = Array.isArray(discoveredDbHospitals) && discoveredDbHospitals.length > 0
			? discoveredDbHospitals
			: dbHospitals;
		if (sourceHospitals.length === 0) {
			setHospitals([]);
			return;
		}

		// If we don't have user location yet, preserve database distance data
		if (!userLocation) {
			const normalized = sourceHospitals.map(h => ({
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
		const localized = sourceHospitals
			.map((h) => {
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
		})
			.sort((left, right) => {
				const leftDistance = Number(left?.distanceKm ?? Number.MAX_SAFE_INTEGER);
				const rightDistance = Number(right?.distanceKm ?? Number.MAX_SAFE_INTEGER);
				return leftDistance - rightDistance;
			});

		// Enrich with service types before setting
		setHospitals(enrichHospitalsWithServiceTypes(localized));

	}, [dbHospitals, discoveredDbHospitals, isLoadingHospitals, userLocation]);

	useEffect(() => {
		const latitude = Number(globalUserLocation?.latitude);
		const longitude = Number(globalUserLocation?.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return;
		}

		setUserLocation((current) => {
			const currentLatitude = Number(current?.latitude);
			const currentLongitude = Number(current?.longitude);
			if (Number.isFinite(currentLatitude) && Number.isFinite(currentLongitude)) {
				return current;
			}

			return {
				latitude,
				longitude,
				latitudeDelta: Number(current?.latitudeDelta) || DEFAULT_APP_REGION.latitudeDelta,
				longitudeDelta: Number(current?.longitudeDelta) || DEFAULT_APP_REGION.longitudeDelta,
			};
		});
	}, [globalUserLocation?.latitude, globalUserLocation?.longitude]);

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
	const syncActiveTripsInFlightRef = useRef(false);
	const realtimeStatusRef = useRef({});
	const lastRealtimeSyncMsRef = useRef(0);
	const [telemetryNowMs, setTelemetryNowMs] = useState(Date.now());
	const activeAmbulanceTripRef = useRef(activeAmbulanceTrip);
	const userLocationRef = useRef(userLocation);

	useEffect(() => {
		activeAmbulanceTripRef.current = activeAmbulanceTrip;
	}, [activeAmbulanceTrip]);

	useEffect(() => {
		userLocationRef.current = userLocation;
	}, [userLocation]);

	// Emergency mode state
	const [serviceType, setServiceType] = useState(null); // null = show all, "premium" or "standard"

	// Booking mode state
	const [selectedSpecialty, setSelectedSpecialty] = useState(null); // null = show all

	// View state
	const [viewMode, setViewMode] = useState("map"); // "map" or "list"

	// Helper to parse PostGIS Point — handles both WKT and WKB hex formats
	const parsePoint = parsePointGeometry;

	const resetAmbulanceEventVersion = () => {
		activeAmbulanceEventRef.current = { requestKey: null, versionMs: 0 };
	};

	const shouldApplyAmbulanceEvent = (trip, record) => {
		const decision = shouldApplyTripEvent(
			activeAmbulanceEventRef.current,
			trip,
			record,
			Date.now()
		);
		if (decision.apply) {
			activeAmbulanceEventRef.current = decision.nextGateState;
		}
		return decision.apply;
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

	const syncActiveTripsFromServer = useCallback(
		async (reason = "manual", { waitForSession = false } = {}) => {
			if (syncActiveTripsInFlightRef.current) return;
			syncActiveTripsInFlightRef.current = true;

			try {
				if (waitForSession) {
					let attempt = 0;
					while (attempt < 10) {
						const { data: { user: sessionUser } } = await supabase.auth.getUser();
						if (sessionUser) break;
						attempt += 1;
						await new Promise((resolve) => setTimeout(resolve, 400));
					}
				}

				const activeRequests = await emergencyRequestsService.list();
				const isActiveStatus = (status) =>
					status === "pending_approval" ||
					status === "in_progress" ||
					status === "accepted" ||
					status === "arrived";

				const activeAmbulance = activeRequests.find(
					(r) => r?.serviceType === "ambulance" && isActiveStatus(r?.status)
				);
				const activeBed = activeRequests.find(
					(r) => r?.serviceType === "bed" && isActiveStatus(r?.status)
				);

				if (activeAmbulance) {
					const loc = parsePoint(activeAmbulance.responderLocation);
					let fullAmbulance = null;
					if (activeAmbulance.ambulanceId) {
						try {
							fullAmbulance = await ambulanceService.getById(activeAmbulance.ambulanceId);
						} catch (_error) {
							fullAmbulance = null;
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

					setActiveAmbulanceTrip({
						id: activeAmbulance.id ?? null,
						hospitalId: activeAmbulance.hospitalId,
						requestId: activeAmbulance.requestId,
						status: activeAmbulance.status,
						triage: activeAmbulance.triage ?? null,
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
						patientLocation: parsePoint(activeAmbulance.patientLocation),
						route: null,
						updatedAt: activeAmbulance.updatedAt ?? null,
					});
				} else {
					resetAmbulanceEventVersion();
					setActiveAmbulanceTrip(null);
				}

				if (activeBed) {
					const startedAt = activeBed.createdAt ? Date.parse(activeBed.createdAt) : Date.now();
					const etaSeconds = parseEtaToSeconds(activeBed.estimatedArrival);
					setActiveBedBooking({
						id: activeBed.id ?? null,
						hospitalId: activeBed.hospitalId,
						bookingId: activeBed.bookingId ?? activeBed.requestId ?? null,
						requestId: activeBed.requestId ?? activeBed.bookingId ?? null,
						status: activeBed.status ?? null,
						triage: activeBed.triage ?? null,
						bedNumber: activeBed.bedNumber ?? null,
						bedType: activeBed.bedType ?? null,
						bedCount: activeBed.bedCount ?? null,
						specialty: activeBed.specialty ?? null,
						hospitalName: activeBed.hospitalName ?? null,
						estimatedWait: activeBed.estimatedArrival ?? null,
						etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
						startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
					});
				} else {
					setActiveBedBooking(null);
				}

				const pendingMatch = activeRequests.find((r) => r?.status === "pending_approval");
				if (pendingMatch) {
					const pendingEtaSeconds = parseEtaToSeconds(pendingMatch.estimatedArrival);
					setPendingApproval({
						id: pendingMatch.id ?? null,
						requestId: pendingMatch.requestId,
						displayId: pendingMatch.displayId ?? pendingMatch.requestId ?? null,
						hospitalId: pendingMatch.hospitalId,
						hospitalName: pendingMatch.hospitalName,
						serviceType: pendingMatch.serviceType,
						ambulanceType: pendingMatch.responderVehicleType,
						specialty: pendingMatch.specialty ?? null,
						bedNumber: pendingMatch.bedNumber ?? null,
						bedType: pendingMatch.bedType,
						bedCount: pendingMatch.bedCount ?? null,
						totalAmount: pendingMatch.totalCost ?? null,
						paymentStatus: pendingMatch.paymentStatus ?? null,
						estimatedArrival: pendingMatch.estimatedArrival ?? null,
						etaSeconds: Number.isFinite(pendingEtaSeconds) ? pendingEtaSeconds : null,
						triageSnapshot: pendingMatch.triage ?? null,
					});
				} else {
					setPendingApproval(null);
				}
			} catch (error) {
				console.warn(`[EmergencyContext] Truth sync failed (${reason}):`, error);
			} finally {
				syncActiveTripsInFlightRef.current = false;
			}
		},
		[parseEtaToSeconds]
	);

	const handleRealtimeStatus = useCallback(
		(channelName, status) => {
			const previousStatus = realtimeStatusRef.current[channelName] ?? null;
			realtimeStatusRef.current[channelName] = status;

			const now = Date.now();
			if (REALTIME_RECOVERY_STATUSES.has(status)) {
				if (now - lastRealtimeSyncMsRef.current < REALTIME_TRUTH_SYNC_DEBOUNCE_MS) {
					return;
				}
				lastRealtimeSyncMsRef.current = now;
				syncActiveTripsFromServer(`recovery:${channelName}:${status}`);
				return;
			}

			if (REALTIME_HEALTHY_STATUSES.has(status) && previousStatus && previousStatus !== status) {
				if (now - lastRealtimeSyncMsRef.current < REALTIME_TRUTH_SYNC_DEBOUNCE_MS) {
					return;
				}
				lastRealtimeSyncMsRef.current = now;
				syncActiveTripsFromServer(`resubscribed:${channelName}:${previousStatus}->${status}`);
			}
		},
		[syncActiveTripsFromServer]
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

							setActiveBedBooking((prev) => {
								if (!prev) return prev;
								if (!matchesTripRecord(prev, newRecord)) {
									return prev;
								}
								const status = String(newRecord?.status ?? "").toLowerCase();
								if (status === "completed" || status === "cancelled" || status === "payment_declined") {
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
								const mergedTrip = mergeEmergencyRealtimeTrip(prev, newRecord);
								if (!mergedTrip) {
									resetAmbulanceEventVersion();
								}
								return mergedTrip;
							});
						}
					)
				.subscribe((status) => handleRealtimeStatus("emergency_updates", status));
		};

		setupSubscription();

		return () => {
			if (subscription) supabase.removeChannel(subscription);
			// REMOVED: simulationService.stopSimulation();
			// Real-time tracking handled by subscriptions
		};
	}, [handleRealtimeStatus]); // Removed dependency on activeAmbulanceTrip to avoid re-subscribing

	useEffect(() => {
		const requestKey = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		if (!requestKey) {
			resetAmbulanceEventVersion();
			return;
		}

		const persistedVersion = parseRecordTimestampMs(
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
		syncActiveTripsFromServer("initial_hydrate", { waitForSession: true });
	}, [syncActiveTripsFromServer]);

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

	const nearbyCoverageCounts = useMemo(() => {
		if (!Array.isArray(hospitals) || hospitals.length === 0) {
			return coverageModeService.deriveNearbyCoverageCounts([]);
		}

		const coverageSource = hospitals.filter((hospital) =>
			demoEcosystemService.matchesDemoOwner(hospital, demoOwnerSlug)
		);

		return coverageModeService.deriveNearbyCoverageCounts(coverageSource);
	}, [demoOwnerSlug, hospitals]);

	const coverageStatus = useMemo(
		() =>
			coverageModeService.deriveCoverageStatus(
				nearbyCoverageCounts,
				COVERAGE_POOR_THRESHOLD
			),
		[nearbyCoverageCounts]
	);

	const effectiveCoverageMode = useMemo(
		() =>
			coverageModeService.resolveEffectiveMode({
				preferredMode: preferredCoverageMode,
				coverageStatus,
				demoModeEnabled: legacyDemoModeEnabled,
			}),
		[coverageStatus, legacyDemoModeEnabled, preferredCoverageMode]
	);

	const effectiveDemoModeEnabled = coverageModeService.allowsDemo(
		effectiveCoverageMode
	);
	const isLiveOnlyAvailable = coverageModeService.isLiveOnlyAvailable(
		coverageStatus
	);

	useEffect(() => {
		if (coverageStatus === COVERAGE_STATUS.NONE) {
			setForceDemoFetch(true);
			return;
		}

		setForceDemoFetch(allowsPreferredDemo);
	}, [allowsPreferredDemo, coverageStatus]);

	const availableHospitals = useMemo(() => {
		if (!Array.isArray(hospitals) || hospitals.length === 0) return [];
		return hospitals.filter((hospital) =>
			demoEcosystemService.matchesDemoOwner(hospital, demoOwnerSlug)
		);
	}, [demoOwnerSlug, hospitals]);

	const hasDemoHospitalsNearby = useMemo(
		() =>
			availableHospitals.some((hospital) =>
				demoEcosystemService.isDemoHospital(hospital)
			),
		[availableHospitals]
	);

	const visibleHospitals = useMemo(() => {
		if (!Array.isArray(availableHospitals) || availableHospitals.length === 0) {
			return [];
		}

		switch (effectiveCoverageMode) {
			case COVERAGE_MODES.DEMO_ONLY:
				return availableHospitals.filter((hospital) =>
					demoEcosystemService.isDemoHospital(hospital)
				);
			case COVERAGE_MODES.LIVE_ONLY:
				return availableHospitals.filter(
					(hospital) => !demoEcosystemService.isDemoHospital(hospital)
				);
			case COVERAGE_MODES.HYBRID:
			default:
				return [...availableHospitals].sort((left, right) => {
					const leftIsDemo = demoEcosystemService.isDemoHospital(left);
					const rightIsDemo = demoEcosystemService.isDemoHospital(right);
					if (leftIsDemo === rightIsDemo) return 0;
					return leftIsDemo ? 1 : -1;
				});
		}
	}, [availableHospitals, effectiveCoverageMode]);

	const specialties = useMemo(() => {
		const derived = new Set();
		availableHospitals.forEach((hospital) => {
			if (!Array.isArray(hospital?.specialties)) return;
			hospital.specialties.forEach((specialty) => {
				if (typeof specialty === "string" && specialty.trim()) {
					derived.add(specialty);
				}
			});
		});

		return derived.size > 0 ? Array.from(derived).sort() : SPECIALTIES;
	}, [availableHospitals]);

	// Get selected hospital object
	const selectedHospital = useMemo(() => {
		const hospital = visibleHospitals.find((item) => item.id === selectedHospitalId) || null;
		return hospital;
	}, [selectedHospitalId, visibleHospitals]);

	useEffect(() => {
		if (!selectedHospitalId) return;
		if (visibleHospitals.some((hospital) => hospital?.id === selectedHospitalId)) return;
		setSelectedHospitalId(null);
	}, [selectedHospitalId, visibleHospitals]);

	// Filter hospitals based on current mode and criteria
	const filteredHospitals = useMemo(() => {
		if (!visibleHospitals || visibleHospitals.length === 0) {
			return [];
		}

		return visibleHospitals.filter((hospital) => {
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
	}, [visibleHospitals, mode, serviceType, selectedSpecialty]);

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

	const resolveCoverageCoordinates = useCallback(() => {
		const latitude = Number(userLocation?.latitude ?? DEFAULT_APP_REGION.latitude);
		const longitude = Number(userLocation?.longitude ?? DEFAULT_APP_REGION.longitude);

		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			throw new Error("Unable to resolve location for coverage mode");
		}

		return { latitude, longitude };
	}, [userLocation?.latitude, userLocation?.longitude]);

	const setCoverageMode = useCallback(
		async (mode, options = {}) => {
			const requestedMode = coverageModeService.normalizeMode(mode);
			const nextMode =
				coverageStatus === COVERAGE_STATUS.NONE &&
				requestedMode === COVERAGE_MODES.LIVE_ONLY
					? COVERAGE_MODES.HYBRID
					: requestedMode;
			const shouldFetchDemo =
				coverageModeService.allowsDemo(nextMode) ||
				coverageStatus === COVERAGE_STATUS.NONE;
			const shouldBootstrapDemo =
				shouldFetchDemo &&
				user?.id &&
				(options.forceBootstrap === true || !hasDemoHospitalsNearby);

			setCoverageModeOperation({
				isPending: true,
				targetMode: nextMode,
			});
			setCoverageModePreference(nextMode);
			setForceDemoFetch(shouldFetchDemo);

			try {
				if (shouldBootstrapDemo) {
					const coords = resolveCoverageCoordinates();
					await demoEcosystemService.ensureDemoEcosystemForLocation({
						userId: user.id,
						latitude: coords.latitude,
						longitude: coords.longitude,
						radiusKm: 50,
						force: options.forceBootstrap === true,
						onProgress: options.onProgress,
					});
				}

				await coverageModeService.setStoredMode(user?.id, nextMode);

				try {
					await updatePreferences?.({
						demoModeEnabled: nextMode !== COVERAGE_MODES.LIVE_ONLY,
					});
				} catch (error) {
					console.warn("[EmergencyContext] Failed to sync demo mode preference", error);
				}

				if (typeof refetchHospitals === "function") {
					await new Promise((resolve) => setTimeout(resolve, 0));
					await refetchHospitals();
				}

				return nextMode;
			} catch (error) {
				setCoverageModePreference((prev) =>
					prev === nextMode ? preferredCoverageMode : prev
				);
				setForceDemoFetch(
					coverageModeService.allowsDemo(preferredCoverageMode)
				);
				throw error;
			} finally {
				setCoverageModeOperation({
					isPending: false,
					targetMode: null,
				});
			}
		},
		[
			coverageStatus,
			hasDemoHospitalsNearby,
			preferredCoverageMode,
			refetchHospitals,
			resolveCoverageCoordinates,
			updatePreferences,
			user?.id,
		]
	);

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
					patientLocation:
						trip?.patientLocation ??
						userLocation ??
						null,
					route: normalizeRouteCoordinates(trip?.route),
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

	const activeAmbulanceDemoHospital = useMemo(() => {
		if (!activeAmbulanceTrip?.hospitalId) return null;
		const hospital =
			availableHospitals.find((item) => item?.id === activeAmbulanceTrip.hospitalId) ??
			null;
		return demoEcosystemService.isDemoFlowActive({
			hospital,
			demoModeEnabled: effectiveDemoModeEnabled,
		})
			? hospital
			: null;
	}, [
		activeAmbulanceTrip?.hospitalId,
		availableHospitals,
		effectiveDemoModeEnabled,
	]);

	useEffect(() => {
		const requestId = activeAmbulanceTrip?.requestId ?? null;
		if (!requestId || !activeAmbulanceDemoHospital) return;

		const status = String(activeAmbulanceTrip?.status ?? "").toLowerCase();
		if (!AMBULANCE_LIVE_TRACK_STATUSES.has(status)) return;

		const hospitalCoordinate =
			normalizeCoordinate(activeAmbulanceDemoHospital?.coordinates) ||
			(Number.isFinite(activeAmbulanceDemoHospital?.latitude) &&
			Number.isFinite(activeAmbulanceDemoHospital?.longitude)
				? {
						latitude: Number(activeAmbulanceDemoHospital.latitude),
						longitude: Number(activeAmbulanceDemoHospital.longitude),
				  }
				: null);

		const tickHeartbeat = () => {
			const trip = activeAmbulanceTripRef.current;
			if (!trip || trip?.requestId !== requestId) return;

			const tripStatus = String(trip?.status ?? "").toLowerCase();
			if (!AMBULANCE_LIVE_TRACK_STATUSES.has(tripStatus)) return;

			const now = Date.now();
			const nowIso = new Date(now).toISOString();
			const explicitRoute = normalizeRouteCoordinates(trip?.route);
			const reversedRoute = explicitRoute.length >= 2 ? [...explicitRoute].reverse() : [];
			const destinationCoordinate =
				normalizeCoordinate(trip?.patientLocation) ||
				normalizeCoordinate(userLocationRef.current);
			const syntheticRoute =
				reversedRoute.length >= 2
					? reversedRoute
					: isValidCoordinate(hospitalCoordinate) && isValidCoordinate(destinationCoordinate)
						? [hospitalCoordinate, destinationCoordinate]
						: [];

			if (syntheticRoute.length < 2) {
				patchActiveAmbulanceTrip({
					responderTelemetryAt: nowIso,
					updatedAt: nowIso,
				});
				return;
			}

			const etaSeconds =
				Number.isFinite(trip?.etaSeconds) && trip.etaSeconds > 0
					? trip.etaSeconds
					: 600;
			const startedAt = Number.isFinite(trip?.startedAt)
				? trip.startedAt
				: now;
			const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
			const progressRatio = Math.min(0.985, elapsedSeconds / etaSeconds);
			const projected = interpolateRoutePosition(syntheticRoute, progressRatio);

			if (!projected?.coordinate) {
				patchActiveAmbulanceTrip({
					responderTelemetryAt: nowIso,
					updatedAt: nowIso,
				});
				return;
			}

			const previousCoordinate = normalizeCoordinate(trip?.currentResponderLocation);
			const previousHeading = Number.isFinite(trip?.currentResponderHeading)
				? Number(trip.currentResponderHeading)
				: null;
			const locationChanged =
				!previousCoordinate ||
				Math.abs(previousCoordinate.latitude - projected.coordinate.latitude) > 0.000001 ||
				Math.abs(previousCoordinate.longitude - projected.coordinate.longitude) > 0.000001;
			const headingChanged =
				previousHeading === null ||
				Math.abs(previousHeading - projected.heading) > 0.1;

			const telemetryUpdates = {
				responderTelemetryAt: nowIso,
				updatedAt: nowIso,
			};

			if (locationChanged) {
				telemetryUpdates.currentResponderLocation = projected.coordinate;
			}
			if (headingChanged) {
				telemetryUpdates.currentResponderHeading = projected.heading;
			}

			patchActiveAmbulanceTrip(telemetryUpdates);
		};

		tickHeartbeat();
		const intervalId = setInterval(tickHeartbeat, DEMO_RESPONDER_HEARTBEAT_MS);
		return () => clearInterval(intervalId);
	}, [
		activeAmbulanceDemoHospital,
		activeAmbulanceTrip?.requestId,
		activeAmbulanceTrip?.status,
		patchActiveAmbulanceTrip,
	]);

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

	const refreshHospitals = useCallback(async () => {
		await refetchHospitals?.();
	}, [refetchHospitals]);

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
							const mergedTrip = mergeEmergencyRealtimeTrip(prev, payload.new);
							if (!mergedTrip) {
								resetAmbulanceEventVersion();
								return null;
							}
							return mergedTrip;
						});
					},
					(status) => handleRealtimeStatus("active_emergency_request", status)
				);

				unsubscribeAmbulance = await emergencyRequestsService.subscribeToAmbulanceLocation(
					emergencyRequestSubscriptionKey,
					(payload) => {
						if (!payload.new?.location) return;

						setActiveAmbulanceTrip((prev) => {
							if (!prev) return prev;
							if (!shouldApplyAmbulanceEvent(prev, payload.new)) return prev;
							return mergeAmbulanceRealtimeTrip(prev, payload.new);
						});
					},
					(status) => handleRealtimeStatus("active_ambulance_location", status)
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
	}, [activeAmbulanceTrip?.id, activeAmbulanceTrip?.requestId, handleRealtimeStatus]);

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
					},
					(status) => handleRealtimeStatus("active_hospital_beds", status)
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
	}, [activeBedBooking?.hospitalId, handleRealtimeStatus, hospitals, updateHospitals]);

	const value = useMemo(
		() => ({
			// State
			hospitals: filteredHospitals,
			allHospitals: visibleHospitals,
			filteredHospitals,
			specialties,
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
			isLoadingHospitals,
			hasActiveFilters,
			coverageMode: effectiveCoverageMode,
			coverageModePreference,
			coverageModePreferenceLoaded,
			coverageStatus,
			nearbyCoverageCounts,
			effectiveDemoModeEnabled,
			isLiveOnlyAvailable,
			hasDemoHospitalsNearby,
			coverageModeOperation,

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
			refreshHospitals,
			setUserLocation,
			setPendingApproval,
			setCoverageMode,
		}),
		[
			filteredHospitals,
			visibleHospitals,
			specialties,
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
			isLoadingHospitals,
			hasActiveFilters,
			effectiveCoverageMode,
			coverageModePreference,
			coverageModePreferenceLoaded,
			coverageStatus,
			nearbyCoverageCounts,
			effectiveDemoModeEnabled,
			isLiveOnlyAvailable,
			hasDemoHospitalsNearby,
			coverageModeOperation,
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
			refreshHospitals,
			setUserLocation,
			setPendingApproval,
			setCoverageMode,
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
