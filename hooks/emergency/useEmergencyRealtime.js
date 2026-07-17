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
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { emergencyRequestsService, EmergencyRequestStatus } from "../../services/emergencyRequestsService";
import { normalizeBedBookingRuntimeState } from "./bedBookingRuntime";
import {
	matchesTripRecord,
	shouldApplyTripEvent,
	mergeEmergencyRealtimeTrip,
	mergeAmbulanceRealtimeTrip,
	parseRecordTimestampMs,
	applyBedAvailabilityToHospitalsCache,
} from "../../utils/emergencyRealtimeProjection";
import { safeRemoveLocationSubscription } from "../../utils/locationSubscriptions";
import {
	REALTIME_RECOVERY_STATUSES,
	REALTIME_HEALTHY_STATUSES,
	REALTIME_TRUTH_SYNC_DEBOUNCE_MS,
	AMBULANCE_LIVE_TRACK_STATUSES,
} from "../../utils/emergencyContextHelpers";

export function useEmergencyRealtime({
	userId,
	activeAmbulanceTrip,
	activeBedBooking,
	activeAmbulanceTripRef,
	activeBedBookingRef,
	userLocationRef,
	setActiveAmbulanceTrip,
	setActiveBedBooking,
	syncActiveTripsFromServer,
}) {
	const queryClient = useQueryClient();
	const realtimeStatusRef = useRef({});
	const lastRealtimeSyncMsRef = useRef(0);
	// PULLBACK NOTE: Emergency realtime cross-stream ordering.
	// OLD: emergency_requests lifecycle rows and ambulances telemetry rows shared
	//      one timestamp gate, so a newer GPS update could reject a later-arriving
	//      accepted/arrived lifecycle event from the other table as "stale".
	// NEW: each canonical stream owns its own ordering gate.
	const emergencyRequestEventRef = useRef({ requestKey: null, versionMs: 0 });
	const ambulanceLocationEventRef = useRef({ requestKey: null, versionMs: 0 });

	// ─── Event gate helpers ───────────────────────────────────────────────────

	const resetAmbulanceEventVersion = useCallback(() => {
		emergencyRequestEventRef.current = { requestKey: null, versionMs: 0 };
		ambulanceLocationEventRef.current = { requestKey: null, versionMs: 0 };
	}, []);

	const shouldApplyEmergencyRequestEvent = useCallback((trip, record) => {
		const decision = shouldApplyTripEvent(
			emergencyRequestEventRef.current,
			trip,
			record,
			Date.now()
		);
		if (decision.apply) {
			emergencyRequestEventRef.current = decision.nextGateState;
		}
		return decision.apply;
	}, []);

	const shouldApplyAmbulanceLocationEvent = useCallback((trip, record) => {
		const decision = shouldApplyTripEvent(
			ambulanceLocationEventRef.current,
			trip,
			record,
			Date.now()
		);
		if (decision.apply) {
			ambulanceLocationEventRef.current = decision.nextGateState;
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
			{ updated_at: activeAmbulanceTrip?.updatedAt ?? null },
			0
		);
		const currentVersion = emergencyRequestEventRef.current?.versionMs ?? 0;
		emergencyRequestEventRef.current = {
			requestKey: String(requestKey),
			versionMs: Math.max(currentVersion, persistedVersion),
		};
	}, [
		activeAmbulanceTrip?.id,
		activeAmbulanceTrip?.requestId,
		activeAmbulanceTrip?.updatedAt,
		resetAmbulanceEventVersion,
	]);

	// ─── Main emergency_requests subscription ─────────────────────────────────

	useEffect(() => {
		if (!userId) return undefined;
		let subscription;

		try {
			subscription = supabase
				.channel("emergency_updates")
				.on(
					"postgres_changes",
					{ event: "*", schema: "public", table: "emergency_requests", filter: `user_id=eq.${userId}` },
					(payload) => {
						const newRecord = payload.new;
						if (!newRecord?.id) return;

						setActiveBedBooking((prev) => {
							if (!prev || !matchesTripRecord(prev, newRecord)) return prev;
							const status = String(newRecord?.status ?? "").toLowerCase();
							if (status === "cancelled" || status === "payment_declined") return null;
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
							if (!prev || !shouldApplyEmergencyRequestEvent(prev, newRecord)) return prev;
							const mergedTrip = mergeEmergencyRealtimeTrip(prev, newRecord);
							if (!mergedTrip) resetAmbulanceEventVersion();
							return mergedTrip;
						});

						const hasKnownTrip = [
							activeAmbulanceTripRef.current,
							activeBedBookingRef.current,
						].some((trip) => trip && matchesTripRecord(trip, newRecord));
						const status = String(newRecord?.status ?? "").toLowerCase();
						if (
							!hasKnownTrip &&
							["pending_approval", "in_progress", "accepted", "arrived"].includes(status)
						) {
							void syncActiveTripsFromServer(
								`event:emergency_requests:${payload.eventType || "change"}`,
							);
						}
					}
				)
				.subscribe((status) => handleRealtimeStatus("emergency_updates", status));
		} catch (error) {
			console.warn("[useEmergencyRealtime] Failed to setup main emergency subscription:", error);
		}

		return () => {
			if (!subscription) return;
			void supabase.removeChannel(subscription).catch((error) => {
				console.warn("[useEmergencyRealtime] Failed to remove main emergency subscription:", error);
			});
		};
	}, [
		activeAmbulanceTripRef,
		activeBedBookingRef,
		handleRealtimeStatus,
		resetAmbulanceEventVersion,
		setActiveAmbulanceTrip,
		setActiveBedBooking,
		shouldApplyEmergencyRequestEvent,
		syncActiveTripsFromServer,
		userId,
	]);

	// ─── Per-trip ambulance subscriptions ────────────────────────────────────

	useEffect(() => {
		const subscriptionKey = activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId ?? null;
		if (!subscriptionKey) return;

		let unsubscribeEmergency = null;
		let unsubscribeAmbulance = null;
		let isCancelled = false;

		const setup = async () => {
			try {
				const emergencyUnsubscribe = await emergencyRequestsService.subscribeToEmergencyUpdates(
					subscriptionKey,
					(payload) => {
						if (!payload.new) return;
						setActiveAmbulanceTrip((prev) => {
							if (!prev) return prev;
							if (!shouldApplyEmergencyRequestEvent(prev, payload.new)) return prev;
							const merged = mergeEmergencyRealtimeTrip(prev, payload.new);
							if (!merged) resetAmbulanceEventVersion();
							return merged;
						});
					},
					(status) => handleRealtimeStatus("active_emergency_request", status)
				);

				if (isCancelled) {
					if (typeof emergencyUnsubscribe === "function") emergencyUnsubscribe();
					return;
				}
				unsubscribeEmergency = emergencyUnsubscribe;

				const ambulanceUnsubscribe = await emergencyRequestsService.subscribeToAmbulanceLocation(
					subscriptionKey,
					(payload) => {
						if (!payload.new?.location) return;
						setActiveAmbulanceTrip((prev) => {
							if (!prev) return prev;
							if (!shouldApplyAmbulanceLocationEvent(prev, payload.new)) return prev;
							return mergeAmbulanceRealtimeTrip(prev, payload.new);
						});
					},
					(status) => handleRealtimeStatus("active_ambulance_location", status)
				);

				if (isCancelled) {
					if (typeof ambulanceUnsubscribe === "function") ambulanceUnsubscribe();
					return;
				}
				unsubscribeAmbulance = ambulanceUnsubscribe;
			} catch (error) {
				console.warn("[useEmergencyRealtime] Failed to setup subscriptions:", error);
			}
		};

		setup();
		return () => {
			isCancelled = true;
			if (typeof unsubscribeEmergency === "function") unsubscribeEmergency();
			if (typeof unsubscribeAmbulance === "function") unsubscribeAmbulance();
		};
	}, [activeAmbulanceTrip?.id, activeAmbulanceTrip?.requestId, handleRealtimeStatus, setActiveAmbulanceTrip, shouldApplyAmbulanceLocationEvent, shouldApplyEmergencyRequestEvent, resetAmbulanceEventVersion]);

	// ─── Bed subscription ─────────────────────────────────────────────────────

	useEffect(() => {
		if (!activeBedBooking?.hospitalId) return;
		let unsubscribeBeds = null;
		let isCancelled = false;

		const setup = async () => {
			try {
				const bedsUnsubscribe = await emergencyRequestsService.subscribeToHospitalBeds(
					activeBedBooking.hospitalId,
					(payload) => {
						if (!payload.new) return;
						// updateHospitals cannot propagate: it derives a value and drops it.
						// The query cache is the only convergence layer, so patch it directly.
						queryClient.setQueriesData({ queryKey: ["hospitals"] }, (entry) =>
							applyBedAvailabilityToHospitalsCache(entry, payload.new)
						);
					},
					(status) => handleRealtimeStatus("active_hospital_beds", status)
				);

				if (isCancelled) {
					if (typeof bedsUnsubscribe === "function") bedsUnsubscribe();
					return;
				}
				unsubscribeBeds = bedsUnsubscribe;
			} catch (error) {
				console.warn("[useEmergencyRealtime] Failed to setup bed subscription:", error);
			}
		};

		setup();
		return () => {
			isCancelled = true;
			if (typeof unsubscribeBeds === "function") unsubscribeBeds();
		};
	}, [activeBedBooking?.hospitalId, handleRealtimeStatus, queryClient]);

	// ─── Live patient location sync during active trip ─────────────────────────

	useEffect(() => {
		if (!activeAmbulanceTrip?.requestId) return;
		// PULLBACK NOTE: Pass 1 raw-status sweep — OLD: inline strings  NEW: EmergencyRequestStatus constants
		if (activeAmbulanceTrip.status === EmergencyRequestStatus.COMPLETED || activeAmbulanceTrip.status === EmergencyRequestStatus.CANCELLED) return;
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
	};
}
