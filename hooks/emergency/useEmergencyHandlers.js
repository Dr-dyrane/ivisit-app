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
			if (!id) return Promise.resolve();
			if (typeof updateVisit !== "function") return Promise.resolve();
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
				try {
					await Promise.all(actions.requests);
					actions.onSuccess?.();
					console.log(`[EmergencyHandlers] ${type} completed successfully`);
				} catch (err) {
					console.error(`[EmergencyHandlers] ${type} failed:`, err);
				} finally {
					actions.cleanup?.();
					if (onSheetSnap) {
						setTimeout(() => {
							onSheetSnap(1);
						}, 0);
					}
				}
			};
		},
		[onSheetSnap]
	);

	const onCancelAmbulanceTrip = useCallback(
		async () => {
			if (!activeAmbulanceTrip?.requestId) return;

			await createBaseHandler("CancelAmbulanceTrip", {
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

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		},
		[activeAmbulanceTrip, createBaseHandler, setRequestStatus, cancelVisit, stopAmbulanceTrip]
	);

	const onCompleteAmbulanceTrip = useCallback(
		async () => {
			if (!activeAmbulanceTrip?.requestId) return;

			await createBaseHandler("CompleteAmbulanceTrip", {
				requests: [
					setRequestStatus(
						activeAmbulanceTrip.requestId,
						EmergencyRequestStatus.COMPLETED
					),
					completeVisit(activeAmbulanceTrip.requestId),
					setVisitLifecycle(activeAmbulanceTrip.requestId, EMERGENCY_VISIT_LIFECYCLE.COMPLETED),
					setVisitLifecycle(
						activeAmbulanceTrip.requestId,
						EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING
					),
				],
				cleanup: stopAmbulanceTrip,
			})();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		},
		[activeAmbulanceTrip, createBaseHandler, setRequestStatus, completeVisit, stopAmbulanceTrip]
	);

	const onCancelBedBooking = useCallback(
		async () => {
			if (!activeBedBooking?.requestId) return;

			await createBaseHandler("CancelBedBooking", {
				requests: [
					setRequestStatus(
						activeBedBooking.requestId,
						EmergencyRequestStatus.CANCELLED
					),
					cancelVisit(activeBedBooking.requestId),
					setVisitLifecycle(activeBedBooking.requestId, EMERGENCY_VISIT_LIFECYCLE.CANCELLED),
					addNotification({
						id: `bed_cancel_${activeBedBooking.requestId}_${Date.now()}`,
						type: NOTIFICATION_TYPES.APPOINTMENT,
						title: "Bed reservation cancelled",
						message: "You cancelled the active bed reservation.",
						timestamp: new Date().toISOString(),
						read: false,
						priority: NOTIFICATION_PRIORITY.NORMAL,
						actionType: null,
						actionData: { visitId: activeBedBooking.requestId },
					}),
				],
				cleanup: stopBedBooking,
			})();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		},
		[activeBedBooking, createBaseHandler, setRequestStatus, cancelVisit, addNotification, stopBedBooking]
	);

	const onCompleteBedBooking = useCallback(
		async () => {
			if (!activeBedBooking?.requestId) return;

			await createBaseHandler("CompleteBedBooking", {
				requests: [
					setRequestStatus(
						activeBedBooking.requestId,
						EmergencyRequestStatus.COMPLETED
					),
					completeVisit(activeBedBooking.requestId),
					setVisitLifecycle(activeBedBooking.requestId, EMERGENCY_VISIT_LIFECYCLE.COMPLETED),
					setVisitLifecycle(
						activeBedBooking.requestId,
						EMERGENCY_VISIT_LIFECYCLE.RATING_PENDING
					),
					addNotification({
						id: `bed_complete_${activeBedBooking.requestId}_${Date.now()}`,
						type: NOTIFICATION_TYPES.APPOINTMENT,
						title: "Bed booking completed",
						message: "Your bed booking has been marked complete.",
						timestamp: new Date().toISOString(),
						read: false,
						priority: NOTIFICATION_PRIORITY.NORMAL,
						actionType: "view_summary",
						actionData: { visitId: activeBedBooking.requestId },
					}),
				],
				cleanup: stopBedBooking,
			})();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		},
		[activeBedBooking, createBaseHandler, setRequestStatus, completeVisit, addNotification, stopBedBooking]
	);

	const onMarkAmbulanceArrived = useCallback(async () => {
		if (!activeAmbulanceTrip?.requestId) return;
		await createBaseHandler("MarkAmbulanceArrived", {
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
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
	}, [activeAmbulanceTrip, createBaseHandler, setRequestStatus, setVisitLifecycle, setAmbulanceTripStatus]);

	const onMarkBedOccupied = useCallback(async () => {
		if (!activeBedBooking?.requestId) return;
		await createBaseHandler("MarkBedOccupied", {
			requests: [
				setRequestStatus(activeBedBooking.requestId, EmergencyRequestStatus.ARRIVED),
				setVisitLifecycle(activeBedBooking.requestId, EMERGENCY_VISIT_LIFECYCLE.OCCUPIED),
			],
			onSuccess: () => {
				if (typeof setBedBookingStatus === "function") {
					setBedBookingStatus(EmergencyRequestStatus.ARRIVED);
				}
			},
		})();
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
