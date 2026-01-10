import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES } from "../../constants/notifications";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";

export const useEmergencyHandlers = ({
	activeAmbulanceTrip,
	activeBedBooking,
	setRequestStatus,
	cancelVisit,
	completeVisit,
	stopAmbulanceTrip,
	stopBedBooking,
	addNotification,
	onSheetSnap,
}) => {
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
					addNotification({
						id: `bed_cancel_${activeBedBooking.requestId}`,
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
					addNotification({
						id: `bed_complete_${activeBedBooking.requestId}`,
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

	return {
		onCancelAmbulanceTrip,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onCompleteBedBooking,
	};
};
