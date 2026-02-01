import { useRef, useCallback } from "react";
import { Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useEmergency } from "../../contexts/EmergencyContext";
import { useToast } from "../../contexts/ToastContext";

export const useHospitalSelection = ({
	selectHospital,
	clearSelectedHospital,
	mapRef,
	sheetSnapIndex,
	getLastScrollY,
	timing,
}) => {
	const lastListStateRef = useRef({ snapIndex: 1, scrollY: 0 });
	const { mode } = useEmergency();
	const { showToast } = useToast();

	const handleHospitalSelect = useCallback(
		(hospital) => {
			if (!hospital?.id) return;

			// Check if this is a Google-imported hospital (not verified)
			if (hospital.imported_from_google && hospital.import_status !== 'verified') {
				// 🔴 REVERT POINT: Allow unverified hospitals to show selected view
				// PREVIOUS: Returned early with toast, preventing selection
				// NEW: Allow selection to continue so user sees "Call Hospital" CTA
				// REVERT TO: Add the early return back
				console.log('[useHospitalSelection] Allowing unverified hospital selection for 911 fallback');
				// Don't return early - let selection continue to show the detail view
			}

			// Check availability based on mode
			if (mode === 'emergency') {
				if (hospital.status !== 'available') {
					showToast('This hospital is currently not available', 'error');
					return;
				}
			} else {
				// Booking mode
				if (hospital.status !== 'available') {
					showToast('This hospital is currently not available', 'error');
					return;
				}
			}

			// 🔴 REVERT POINT: Relaxed resource validation
			// PREVIOUS: Blocked selection if count <= 0
			// NEW: Allow selection, let the UI handle the "Call Hospital" fallback
			// REVERT TO: The block below
			/*
			if (mode === "emergency" && hospital.ambulances !== undefined && hospital.ambulances <= 0) {
				showToast("No ambulances available at this hospital", "error");
				return;
			}
			if (mode === "booking" && hospital.availableBeds !== undefined && hospital.availableBeds <= 0) {
				showToast("No beds available at this hospital", "error");
				return;
			}
			*/

			if (mode === "emergency" && hospital.ambulances <= 0) {
				console.log("[useHospitalSelection] Selecting hospital with no ambulances, will fallback to Call/911");
			}
			if (mode === "booking" && hospital.availableBeds <= 0) {
				console.log("[useHospitalSelection] Selecting hospital with no beds, will fallback to Call");
			}

			timing?.startTiming?.("hospital_select");

			lastListStateRef.current = {
				snapIndex: Number.isFinite(sheetSnapIndex) ? sheetSnapIndex : 1,
				scrollY: Number.isFinite(getLastScrollY?.()) ? getLastScrollY() : 0,
			};

			selectHospital(hospital.id);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

			if (mapRef.current) {
				mapRef.current.animateToHospital(hospital, {
					bottomPadding: Dimensions.get("window").height * 0.5,
					includeUser: true,
				});
			}

			timing?.endTiming?.("hospital_select");
		},
		[getLastScrollY, selectHospital, sheetSnapIndex, timing, mode, showToast]
	);

	const handleCloseFocus = useCallback(
		(onRestoreListState) => {
			const state = lastListStateRef.current ?? { snapIndex: 1, scrollY: 0 };
			const nextState = {
				...state,
				snapIndex: Number.isFinite(state.snapIndex) ? state.snapIndex : 1,
			};
			clearSelectedHospital();
			onRestoreListState?.(nextState);
			return nextState;
		},
		[clearSelectedHospital]
	);

	const getLastListState = useCallback(
		() => lastListStateRef.current,
		[]
	);

	return {
		handleHospitalSelect,
		handleCloseFocus,
		getLastListState,
		lastListStateRef,
	};
};
