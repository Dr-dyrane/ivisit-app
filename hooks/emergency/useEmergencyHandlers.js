import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
	emergencyRequestsService,
	EmergencyRequestStatus,
} from "../../services/emergencyRequestsService";
import { useEmergencyTripStore } from "../../stores/emergencyTripStore";
import { ACTIVE_TRIP_QUERY_KEY } from "./useActiveTripQuery";

const ARRIVAL_ACKNOWLEDGEMENT_STATUSES = new Set([
	EmergencyRequestStatus.ARRIVED,
]);

function hasMatchingRequestIdentity(trip, requestId) {
	if (!trip || requestId == null || requestId === "") return false;
	const requestKey = String(requestId);
	return [trip.id, trip.requestId, trip.displayId]
		.filter((value) => value != null && value !== "")
		.some((value) => String(value) === requestKey);
}

export const useEmergencyHandlers = ({
	activeAmbulanceTrip,
	activeBedBooking,
	setRequestStatus,
	stopAmbulanceTrip,
	stopBedBooking,
	onSheetSnap,
}) => {
	const queryClient = useQueryClient();

	const createBaseHandler = useCallback(
		(_type, actions) => {
			return async () => {
				let ok = false;
				let error = null;
				try {
					await Promise.all(actions.requests);
					actions.onSuccess?.();
					ok = true;
				} catch (err) {
					error = err;
					console.error("[EmergencyHandlers] request lifecycle action failed:", err);
				} finally {
					if (ok || actions.cleanupOnFailure === true) {
						actions.cleanup?.();
					}
					if (ok && onSheetSnap) {
						setTimeout(() => {
							onSheetSnap(1);
						}, 0);
					}
				}
				return { ok, error };
			};
		},
		[onSheetSnap]
	);

	const onCancelAmbulanceTrip = useCallback(
		async () => {
			if (!activeAmbulanceTrip?.requestId) return;

			const result = await createBaseHandler("CancelAmbulanceTrip", {
				requests: [
					setRequestStatus(
						activeAmbulanceTrip.requestId,
						EmergencyRequestStatus.CANCELLED
					),
				],
				cleanup: stopAmbulanceTrip,
			})();

			if (result?.ok) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			}
			return result;
		},
		[activeAmbulanceTrip, createBaseHandler, setRequestStatus, stopAmbulanceTrip]
	);

	const onCompleteAmbulanceTrip = useCallback(
		async () => {
			if (!activeAmbulanceTrip?.requestId) return;
			if (
				String(activeAmbulanceTrip.status ?? "").toLowerCase() !==
				EmergencyRequestStatus.COMPLETED
			) {
				return {
					ok: false,
					pending: true,
					error: new Error("Waiting for responder completion."),
				};
			}
			return { ok: true, backendCompleted: true };
		},
		[activeAmbulanceTrip]
	);

	const onCancelBedBooking = useCallback(
		async () => {
			if (!activeBedBooking?.requestId) return;

			const result = await createBaseHandler("CancelBedBooking", {
				requests: [
					setRequestStatus(
						activeBedBooking.requestId,
						EmergencyRequestStatus.CANCELLED
					),
				],
				cleanup: stopBedBooking,
			})();

			if (result?.ok) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			}
			return result;
		},
		[activeBedBooking, createBaseHandler, setRequestStatus, stopBedBooking]
	);

	const onCompleteBedBooking = useCallback(
		async () => {
			if (!activeBedBooking?.requestId) return;
			if (
				String(activeBedBooking.status ?? "").toLowerCase() !==
				EmergencyRequestStatus.COMPLETED
			) {
				return {
					ok: false,
					pending: true,
					error: new Error("Waiting for hospital completion."),
				};
			}
			return { ok: true, backendCompleted: true };
		},
		[activeBedBooking]
	);

	const onMarkAmbulanceArrived = useCallback(async () => {
		if (!activeAmbulanceTrip?.requestId) return;
		const currentStatus = String(activeAmbulanceTrip?.status ?? "").toLowerCase();
		if (!ARRIVAL_ACKNOWLEDGEMENT_STATUSES.has(currentStatus)) {
			console.warn(
				"[EmergencyHandlers] blocked arrival acknowledgement for status:",
				currentStatus || "unknown",
			);
			return { ok: false, error: new Error("Arrival is not available yet.") };
		}
		try {
			const acknowledgement =
				await emergencyRequestsService.acknowledgeResponderArrival(
					activeAmbulanceTrip.requestId,
				);
			const acknowledgedAt = acknowledgement?.patientAcknowledgedArrivalAt;
			if (acknowledgedAt) {
				useEmergencyTripStore.getState().setActiveAmbulanceTrip((current) =>
					hasMatchingRequestIdentity(
						current,
						acknowledgement?.requestId || activeAmbulanceTrip.requestId,
					)
						? {
								...current,
								patientAcknowledgedArrivalAt: acknowledgedAt,
							}
						: current,
				);
			}
			void queryClient
				.invalidateQueries({ queryKey: ACTIVE_TRIP_QUERY_KEY })
				.catch((error) => {
					console.warn(
						"[EmergencyHandlers] arrival acknowledgement refresh failed:",
						error,
					);
				});
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			return { ok: true, acknowledgement };
		} catch (error) {
			console.error("[EmergencyHandlers] arrival acknowledgement failed:", error);
			return { ok: false, error };
		}
	}, [activeAmbulanceTrip, queryClient]);

	const onMarkBedOccupied = useCallback(async () => {
		if (!activeBedBooking?.requestId) return;
		return {
			ok: false,
			pending: true,
			error: new Error("Waiting for hospital check-in confirmation."),
		};
	}, [activeBedBooking]);

	return {
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
	};
};
