/**
 * useEmergencyRealtime.js
 *
 * Owns: all Supabase realtime subscriptions for emergency_requests,
 * ambulance location, hospital beds, and the handleRealtimeStatus
 * debounced recovery handler.
 */

import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { supabase } from "../../services/supabase";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";
import { normalizeBedBookingRuntimeState } from "./bedBookingRuntime";
import {
	matchesTripRecord,
	shouldApplyTripEvent,
	mergeEmergencyRealtimeTrip,
	mergeAmbulanceRealtimeTrip,
	parseRecordTimestampMs,
} from "../../utils/emergencyRealtimeProjection";
import { safeRemoveLocationSubscription } from "../../utils/locationSubscriptions";
import {
	REALTIME_RECOVERY_STATUSES,
	REALTIME_HEALTHY_STATUSES,
	REALTIME_TRUTH_SYNC_DEBOUNCE_MS,
	AMBULANCE_LIVE_TRACK_STATUSES,
} from "../../utils/emergencyContextHelpers";

export function useEmergencyRealtime({
	activeAmbulanceTrip,
	activeBedBooking,
	activeAmbulanceTripRef,
	userLocationRef,
	setActiveAmbulanceTrip,
	setActiveBedBooking,
	updateHospitals,
	hospitals,
	syncActiveTripsFromServer,
}) {
	const realtimeStatusRef = useRef({});
	const lastRealtimeSyncMsRef = useRef(0);
	const activeAmbulanceEventRef = useRef({ requestKey: null, versionMs: 0 });

	// ─── Event gate helpers ───────────────────────────────────────────────────

	const resetAmbulanceEventVersion = useCallback(() => {
		activeAmbulanceEventRef.current = { requestKey: null, versionMs: 0 };
	}, []);

	const shouldApplyAmbulanceEvent = useCallback((trip, record) => {
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
	}, []);

	// ─── Realtime status / recovery ───────────────────────────────────────────

	const handleRealtimeStatus = useCallback(
		(channelName, status) => {
			const previousStatus = realtimeStatusRef.current[channelName] ?? null;
			realtimeStatusRef.current[channelName] = status;
			const now = Date.now();

			if (REALTIME_RECOVERY_STATUSES.has(status)) {
				if (now - lastRealtimeSyncMsRef.current < REALTIME_TRUTH_SYNC_DEBOUNCE_MS) return;
				lastRealtimeSyncMsRef.current = now;
				syncActiveTripsFromServer(`recovery:${channelName}:${status}`);
				return;
			}

			if (REALTIME_HEALTHY_STATUSES.has(status) && previousStatus && previousStatus !== status) {
				if (now - lastRealtimeSyncMsRef.current < REALTIME_TRUTH_SYNC_DEBOUNCE_MS) return;
				lastRealtimeSyncMsRef.current = now;
				syncActiveTripsFromServer(`resubscribed:${channelName}:${previousStatus}->${status}`);
			}
		},
		[syncActiveTripsFromServer]
	);

	// ─── Event version sync from trip state ───────────────────────────────────

	useEffect(() => {
		const requestKey = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		if (!requestKey) {
			resetAmbulanceEventVersion();
			return;
		}
		const persistedVersion = parseRecordTimestampMs(
			{ updated_at: activeAmbulanceTrip?.responderTelemetryAt ?? activeAmbulanceTrip?.updatedAt ?? null },
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
		resetAmbulanceEventVersion,
	]);

	// ─── Main emergency_requests subscription ─────────────────────────────────

	useEffect(() => {
		let subscription;

		const setupSubscription = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			subscription = supabase
				.channel("emergency_updates")
				.on(
					"postgres_changes",
					{ event: "UPDATE", schema: "public", table: "emergency_requests", filter: `user_id=eq.${user.id}` },
					(payload) => {
						const newRecord = payload.new;

						setActiveBedBooking((prev) => {
							if (!prev || !matchesTripRecord(prev, newRecord)) return prev;
							const status = String(newRecord?.status ?? "").toLowerCase();
							if (status === "completed" || status === "cancelled" || status === "payment_declined") return null;
							return normalizeBedBookingRuntimeState(
								{
									...prev,
									status: newRecord.status,
									hospitalId: newRecord.hospital_id ?? prev.hospitalId,
									hospitalName: newRecord.hospital_name ?? prev.hospitalName,
									specialty: newRecord.specialty ?? prev.specialty,
									bedNumber: newRecord.bed_number ?? prev.bedNumber,
									bedType: newRecord.bed_type ?? prev.bedType,
									bedCount: newRecord.bed_count ?? prev.bedCount,
									estimatedWait: newRecord.estimated_arrival ?? prev.estimatedWait,
									estimatedArrival: newRecord.estimated_arrival ?? prev.estimatedWait,
								},
								prev,
							);
						});

						setActiveAmbulanceTrip((prev) => {
							if (!prev || !shouldApplyAmbulanceEvent(prev, newRecord)) return prev;
							const mergedTrip = mergeEmergencyRealtimeTrip(prev, newRecord);
							if (!mergedTrip) resetAmbulanceEventVersion();
							return mergedTrip;
						});
					}
				)
				.subscribe((status) => handleRealtimeStatus("emergency_updates", status));
		};

		setupSubscription();
		return () => { if (subscription) supabase.removeChannel(subscription); };
	}, [handleRealtimeStatus, setActiveBedBooking, setActiveAmbulanceTrip, shouldApplyAmbulanceEvent, resetAmbulanceEventVersion]);

	// ─── Per-trip ambulance subscriptions ────────────────────────────────────

	useEffect(() => {
		const subscriptionKey = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		if (!subscriptionKey) return;

		let unsubscribeEmergency = null;
		let unsubscribeAmbulance = null;

		const setup = async () => {
			try {
				unsubscribeEmergency = await emergencyRequestsService.subscribeToEmergencyUpdates(
					subscriptionKey,
					(payload) => {
						if (!payload.new) return;
						setActiveAmbulanceTrip((prev) => {
							if (!prev) return prev;
							if (!shouldApplyAmbulanceEvent(prev, payload.new)) return prev;
							const merged = mergeEmergencyRealtimeTrip(prev, payload.new);
							if (!merged) resetAmbulanceEventVersion();
							return merged;
						});
					},
					(status) => handleRealtimeStatus("active_emergency_request", status)
				);

				unsubscribeAmbulance = await emergencyRequestsService.subscribeToAmbulanceLocation(
					subscriptionKey,
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
				console.warn("[useEmergencyRealtime] Failed to setup subscriptions:", error);
			}
		};

		setup();
		return () => {
			if (typeof unsubscribeEmergency === "function") unsubscribeEmergency();
			if (typeof unsubscribeAmbulance === "function") unsubscribeAmbulance();
		};
	}, [activeAmbulanceTrip?.id, activeAmbulanceTrip?.requestId, handleRealtimeStatus, setActiveAmbulanceTrip, shouldApplyAmbulanceEvent, resetAmbulanceEventVersion]);

	// ─── Bed subscription ─────────────────────────────────────────────────────

	useEffect(() => {
		if (!activeBedBooking?.hospitalId) return;
		let unsubscribeBeds = null;

		const setup = async () => {
			try {
				unsubscribeBeds = await emergencyRequestsService.subscribeToHospitalBeds(
					activeBedBooking.hospitalId,
					(payload) => {
						if (payload.new) {
							updateHospitals(
								hospitals.map((h) =>
									h.id === payload.new.id ? { ...h, availableBeds: payload.new.available_beds } : h
								)
							);
						}
					},
					(status) => handleRealtimeStatus("active_hospital_beds", status)
				);
			} catch (error) {
				console.warn("[useEmergencyRealtime] Failed to setup bed subscription:", error);
			}
		};

		setup();
		return () => { if (typeof unsubscribeBeds === "function") unsubscribeBeds(); };
	}, [activeBedBooking?.hospitalId, handleRealtimeStatus, hospitals, updateHospitals]);

	// ─── Live patient location sync during active trip ─────────────────────────

	useEffect(() => {
		if (!activeAmbulanceTrip?.requestId) return;
		if (activeAmbulanceTrip.status === "completed" || activeAmbulanceTrip.status === "cancelled") return;
		if (Platform.OS === "web") return;

		let locationSubscription = null;
		let isCancelled = false;

		(async () => {
			try {
				const { status } = await Location.getForegroundPermissionsAsync();
				if (status !== "granted") return;

				const subscription = await Location.watchPositionAsync(
					{ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 10000 },
					(location) => {
						const { latitude, longitude, heading } = location.coords;
						emergencyRequestsService.updateLocation(
							activeAmbulanceTrip.requestId,
							`POINT(${longitude} ${latitude})`,
							heading || 0
						);
					}
				);

				if (isCancelled) {
					safeRemoveLocationSubscription(subscription, "active trip");
					return;
				}
				locationSubscription = subscription;
			} catch (e) {
				console.warn("[useEmergencyRealtime] Location tracking failed:", e);
			}
		})();

		return () => {
			isCancelled = true;
			safeRemoveLocationSubscription(locationSubscription, "active trip");
		};
	}, [activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.status]);

	return {
		handleRealtimeStatus,
		resetAmbulanceEventVersion,
		shouldApplyAmbulanceEvent,
	};
}
