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

			console.log('[useHospitalSelection] Hospital selected:', { 
				hospitalId: hospital.id, 
				hospitalName: hospital.name,
				currentSnapIndex: sheetSnapIndex,
				timestamp: Date.now()
			});

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
			const nextState = {
				...state,
				snapIndex: Math.max(1, Number.isFinite(state.snapIndex) ? state.snapIndex : 1),
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
