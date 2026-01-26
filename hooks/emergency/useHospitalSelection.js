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
				showToast('This hospital is not verified. Please call 911 for emergencies.', 'warning');
				return;
			}

			// Check availability based on mode
			if (mode === 'emergency') {
				if (hospital.status !== 'available') {
					showToast('This hospital is currently not available', 'error');
					return;
				}
				if (!hospital.ambulances || hospital.ambulances <= 0) {
					showToast('No ambulances available at this hospital', 'error');
					return;
				}
			} else {
				// Booking mode
				if (hospital.status !== 'available') {
					showToast('This hospital is currently not available', 'error');
					return;
				}
				if (!hospital.availableBeds || hospital.availableBeds <= 0) {
					showToast('No beds available at this hospital', 'error');
					return;
				}
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
