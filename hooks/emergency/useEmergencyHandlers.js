import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES } from "../../constants/notifications";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";
import { EMERGENCY_VISIT_LIFECYCLE } from "../../constants/visits";

export const useEmergencyHandlers = ({
	activeAmbulanceTrip,
	activeBedBooking,
	setRequestStatus,
	cancelVisit,
	completeVisit,
	updateVisit,
	setAmbulanceTripStatus,
	setBedBookingStatus,
	stopAmbulanceTrip,
	stopBedBooking,
	addNotification,
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
			console.log(`[EmergencyHandlers] setVisitLifecycle(${id}, ${lifecycleState})`);
			return updateVisit(id, {
				lifecycleState,
				lifecycleUpdatedAt: new Date().toISOString(),
			});
		},
		[updateVisit]
	);

	const createBaseHandler = useCallback(
		(type, actions) => {
			return async () => {
				console.log(`[EmergencyHandlers] Starting ${type}...`);
				let ok = false;
				let error = null;
				try {
					console.log(`[EmergencyHandlers] ${type}: executing requests...`);
					await Promise.all(actions.requests);
					console.log(`[EmergencyHandlers] ${type}: requests completed, running onSuccess...`);
					actions.onSuccess?.();
					console.log(`[EmergencyHandlers] ${type} completed successfully`);
					ok = true;
				} catch (err) {
					error = err;
					console.error(`[EmergencyHandlers] ${type} failed:`, err);
				} finally {
					console.log(`[EmergencyHandlers] ${type}: finalizing handler...`);
					if (ok || actions.cleanupOnFailure === true) {
						actions.cleanup?.();
					}
					if (ok && onSheetSnap) {
						console.log(`[EmergencyHandlers] ${type}: snapping sheet to index 1`);
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
		async (options = {}) => {
			if (!activeAmbulanceTrip?.requestId) return;
			const deferCleanup = options?.deferCleanup === true;

			const result = await createBaseHandler("CompleteAmbulanceTrip", {
				requests: [
					setRequestStatus(
						activeAmbulanceTrip.requestId,
						EmergencyRequestStatus.COMPLETED
					),
					completeVisit(activeAmbulanceTrip.requestId),
					setVisitLifecycle(
						activeAmbulanceTrip.requestId,
						EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING
					),
				],
				onSuccess: () => {
					if (typeof setAmbulanceTripStatus === "function") {
						setAmbulanceTripStatus(EmergencyRequestStatus.COMPLETED);
					}
				},
				cleanup: deferCleanup ? undefined : stopAmbulanceTrip,
			})();

			if (result?.ok) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}
			return result;
		},
		[
			activeAmbulanceTrip,
			createBaseHandler,
			setRequestStatus,
			completeVisit,
			setAmbulanceTripStatus,
			stopAmbulanceTrip,
		]
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
		[activeBedBooking, createBaseHandler, setRequestStatus, cancelVisit, addNotification, stopBedBooking]
	);

	const onCompleteBedBooking = useCallback(
		async (options = {}) => {
			if (!activeBedBooking?.requestId) return;
			const deferCleanup = options?.deferCleanup === true;

			const result = await createBaseHandler("CompleteBedBooking", {
				requests: [
					setRequestStatus(
						activeBedBooking.requestId,
						EmergencyRequestStatus.COMPLETED
					),
					completeVisit(activeBedBooking.requestId),
					setVisitLifecycle(
						activeBedBooking.requestId,
						EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING
					),
				],
				onSuccess: () => {
					if (typeof setBedBookingStatus === "function") {
						setBedBookingStatus(EmergencyRequestStatus.COMPLETED);
					}
				},
				cleanup: deferCleanup ? undefined : stopBedBooking,
			})();

			if (result?.ok) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			}
			return result;
		},
		[
			activeBedBooking,
			createBaseHandler,
			setRequestStatus,
			completeVisit,
			addNotification,
			setBedBookingStatus,
			stopBedBooking,
		]
	);

	const onMarkAmbulanceArrived = useCallback(async () => {
		if (!activeAmbulanceTrip?.requestId) return;
		const result = await createBaseHandler("MarkAmbulanceArrived", {
			requests: [
				setRequestStatus(activeAmbulanceTrip.requestId, EmergencyRequestStatus.ARRIVED),
				setVisitLifecycle(activeAmbulanceTrip.requestId, EMERGENCY_VISIT_LIFECYCLE.ARRIVED),
			],
			onSuccess: () => {
				if (typeof setAmbulanceTripStatus === "function") {
					setAmbulanceTripStatus(EmergencyRequestStatus.ARRIVED);
				}
			},
		})();
		if (result?.ok) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		}
		return result;
	}, [activeAmbulanceTrip, createBaseHandler, setRequestStatus, setVisitLifecycle, setAmbulanceTripStatus]);

	const onMarkBedOccupied = useCallback(async () => {
		console.log("[EmergencyHandlers] onMarkBedOccupied called", { requestId: activeBedBooking?.requestId });
		if (!activeBedBooking?.requestId) return;
		const result = await createBaseHandler("MarkBedOccupied", {
			requests: [
				setRequestStatus(activeBedBooking.requestId, EmergencyRequestStatus.ARRIVED),
				setVisitLifecycle(activeBedBooking.requestId, EMERGENCY_VISIT_LIFECYCLE.OCCUPIED),
			],
			onSuccess: () => {
				console.log("[EmergencyHandlers] MarkBedOccupied onSuccess, setting status to ARRIVED");
				if (typeof setBedBookingStatus === "function") {
					setBedBookingStatus(EmergencyRequestStatus.ARRIVED);
				}
			},
		})();
		if (result?.ok) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		}
		return result;
	}, [activeBedBooking, createBaseHandler, setRequestStatus, setVisitLifecycle, setBedBookingStatus]);

	return {
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
	};
};
