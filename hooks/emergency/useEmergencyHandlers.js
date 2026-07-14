import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import {
	emergencyRequestsService,
	EmergencyRequestStatus,
} from "../../services/emergencyRequestsService";
import { EMERGENCY_VISIT_LIFECYCLE } from "../../constants/visits";

const ARRIVAL_ACKNOWLEDGEMENT_STATUSES = new Set([
	EmergencyRequestStatus.ARRIVED,
]);

export const useEmergencyHandlers = ({
	activeAmbulanceTrip,
	activeBedBooking,
	setRequestStatus,
	cancelVisit,
	updateVisit,
	stopAmbulanceTrip,
	stopBedBooking,
	onSheetSnap,
}) => {
	const setVisitLifecycle = useCallback(
		(id, lifecycleState) => {
			if (!id) {
				console.warn("[EmergencyHandlers] setVisitLifecycle called without id");
				return Promise.resolve();
			}
			if (typeof updateVisit !== "function") {
				console.warn("[EmergencyHandlers] setVisitLifecycle called but updateVisit is not a function");
				return Promise.resolve();
			}
			return updateVisit(id, {
				lifecycleState,
				lifecycleUpdatedAt: new Date().toISOString(),
			});
		},
		[updateVisit]
	);

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
					cancelVisit(activeAmbulanceTrip.requestId),
					setVisitLifecycle(activeAmbulanceTrip.requestId, EMERGENCY_VISIT_LIFECYCLE.CANCELLED),
				],
				cleanup: stopAmbulanceTrip,
			})();

			if (result?.ok) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			}
			return result;
		},
		[activeAmbulanceTrip, createBaseHandler, setRequestStatus, cancelVisit, stopAmbulanceTrip]
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
					cancelVisit(activeBedBooking.requestId),
					setVisitLifecycle(activeBedBooking.requestId, EMERGENCY_VISIT_LIFECYCLE.CANCELLED),
				],
				cleanup: stopBedBooking,
			})();

			if (result?.ok) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			}
			return result;
		},
		[activeBedBooking, createBaseHandler, setRequestStatus, cancelVisit, stopBedBooking]
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
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			return { ok: true, acknowledgement };
		} catch (error) {
			console.error("[EmergencyHandlers] arrival acknowledgement failed:", error);
			return { ok: false, error };
		}
	}, [activeAmbulanceTrip]);

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
