import { useMemo, useCallback } from "react";
import { Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;
const SEARCH_BAR_AREA = 120;
const MARGIN_ABOVE_TAB_BAR = 16;
const MIN_COLLAPSED_PERCENT = 15;
const MAX_COLLAPSED_PERCENT = 45;
const DEFAULT_COLLAPSED_PERCENT = 22;

export function useEmergencySheetController({
	isDetailMode,
	isTripMode,
	isBedBookingMode,
	hasAnyVisitActive,
	onSnapChange,
}) {
	const insets = useSafeAreaInsets();
	const { snapIndex: currentSnapIndex, handleSnapChange: updateSnapIndex } =
		useEmergencyUI();

	const screenHeightRaw = Dimensions.get("window").height;
	const screenHeight =
		Number.isFinite(screenHeightRaw) && screenHeightRaw > 0 ? screenHeightRaw : 800;
	const collapsedHeight =
		TAB_BAR_HEIGHT + insets.bottom + SEARCH_BAR_AREA + MARGIN_ABOVE_TAB_BAR;
	const collapsedPercent = Math.round((collapsedHeight / screenHeight) * 100);

	const snapPoints = useMemo(() => {
		const isCompactMode = !!hasAnyVisitActive && !isDetailMode;
		// console.log("[useEmergencySheetController] Calculating snapPoints:", {
		// 	isDetailMode,
		// 	isTripMode,
		// 	isBedBookingMode,
		// 	hasAnyVisitActive,
		// 	isCompactMode,
		// 	screenHeight
		// });

		let points;
		if (isDetailMode) {
			// Hospital selected mode: lock at 55%
			points = ["55%"];
		} else {
			if (isCompactMode) {
				// Active trip/bed reservation: lock at 40% and 50%
				points = ["40%", "50%"];
			} else {
				// Calculate collapsed height based on actual screen dimensions
				const collapsedHeight = TAB_BAR_HEIGHT + insets.bottom + SEARCH_BAR_AREA + MARGIN_ABOVE_TAB_BAR;
				const collapsedPercent = Math.round((collapsedHeight / screenHeight) * 100);
				
				
				// Ensure collapsed position is within safe bounds and accounts for different screen sizes
				const safeCollapsed = Number.isFinite(collapsedPercent)
					? Math.min(MAX_COLLAPSED_PERCENT, Math.max(MIN_COLLAPSED_PERCENT, collapsedPercent))
					: DEFAULT_COLLAPSED_PERCENT;
				
				// Ensure proper spacing between snap points
				const halfExpanded = Math.max(safeCollapsed + 10, 50);
				const expanded = Math.min(92, Math.max(halfExpanded + 10, 82));
				
				points = [`${safeCollapsed}%`, `${halfExpanded}%`, `${expanded}%`];
			}
		}

		// console.log("[useEmergencySheetController] Final snapPoints:", points);
		return points;
	}, [collapsedPercent, isDetailMode, isTripMode, isBedBookingMode, screenHeight, hasAnyVisitActive, insets.bottom]);

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
		animationConfigs: null,
		handleSheetChange,
		currentSnapIndex,
	};
}
