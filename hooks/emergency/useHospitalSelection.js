import { useRef, useCallback } from "react";
import { Dimensions } from "react-native";
import * as Haptics from "expo-haptics";

export const useHospitalSelection = ({
	selectHospital,
	clearSelectedHospital,
	mapRef,
	sheetSnapIndex,
	getLastScrollY,
	timing,
}) => {
	const lastListStateRef = useRef({ snapIndex: 1, scrollY: 0 });

	const handleHospitalSelect = useCallback(
		(hospital) => {
			if (!hospital?.id) return;

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
		[getLastScrollY, selectHospital, sheetSnapIndex, timing]
	);

	const handleCloseFocus = useCallback(
		(onRestoreListState) => {
			const state = lastListStateRef.current ?? { snapIndex: 1, scrollY: 0 };
			clearSelectedHospital();
			onRestoreListState?.(state);
			return state;
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
