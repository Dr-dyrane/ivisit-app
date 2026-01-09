import { useMemo, useCallback } from "react";
import { Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;
const SEARCH_BAR_AREA = 120;
const MARGIN_ABOVE_TAB_BAR = 16;

export function useEmergencySheetController({ isDetailMode, onSnapChange }) {
	const insets = useSafeAreaInsets();
	const { snapIndex: currentSnapIndex, handleSnapChange: updateSnapIndex } =
		useEmergencyUI();

	const screenHeight = Dimensions.get("window").height;
	const collapsedHeight =
		TAB_BAR_HEIGHT + insets.bottom + SEARCH_BAR_AREA + MARGIN_ABOVE_TAB_BAR;
	const collapsedPercent = Math.round((collapsedHeight / screenHeight) * 100);

	const snapPoints = useMemo(() => {
		if (isDetailMode) {
			return ["50%"];
		}
		return [`${Math.max(15, collapsedPercent)}%`, "50%", "92%"];
	}, [collapsedPercent, isDetailMode]);

	const animationConfigs = useBottomSheetSpringConfigs({
		damping: 80,
		stiffness: 200,
		mass: 1,
		overshootClamping: false,
		restDisplacementThreshold: 0.1,
		restSpeedThreshold: 0.1,
	});

	const handleSheetChange = useCallback(
		(index) => {
			updateSnapIndex(index, "sheet");
			if (onSnapChange) {
				onSnapChange(index);
			}
		},
		[onSnapChange, updateSnapIndex]
	);

	return {
		snapPoints,
		animationConfigs,
		handleSheetChange,
		currentSnapIndex,
	};
}

