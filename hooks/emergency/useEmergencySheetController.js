import { useMemo, useCallback, useRef } from "react";
import { Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
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
	isRequestMode,
	onSnapChange,
}) {
	const insets = useSafeAreaInsets();
	const { snapIndex: currentSnapIndex, handleSnapChange: updateSnapIndex } =
		useEmergencyUI();

	// Lock snap points on first computation
	const snapPointsRef = useRef(null);
	const hasComputedSnapPointsRef = useRef(false);
	const startupPhaseRef = useRef('initial');

	const screenHeightRaw = Dimensions.get("window").height;
	const screenHeight =
		Number.isFinite(screenHeightRaw) && screenHeightRaw > 0 ? screenHeightRaw : 800;
	const collapsedHeight =
		TAB_BAR_HEIGHT + insets.bottom + SEARCH_BAR_AREA + MARGIN_ABOVE_TAB_BAR;
	const collapsedPercent = Math.round((collapsedHeight / screenHeight) * 100);

	const snapPoints = useMemo(() => {
		// Return locked snap points if already computed, but allow updates for request mode
		if (snapPointsRef.current && hasComputedSnapPointsRef.current && !isRequestMode) {
			console.log('[useEmergencySheetController] Returning locked snap points:', snapPointsRef.current);
			return snapPointsRef.current;
		}

		console.log('[useEmergencySheetController] Computing new snap points:', {
			isDetailMode,
			isTripMode,
			isBedBookingMode,
			isRequestMode,
			screenHeight,
			collapsedPercent,
			timestamp: Date.now()
		});

		let points;
		if (isDetailMode) {
			points = ["50%"];
		} else {
			const isCompactMode = !!isTripMode || !!isBedBookingMode || !!isRequestMode;
			if (isCompactMode) {
				// For dispatched state (trip mode + request mode), use fixed snap points
				if (isTripMode && isRequestMode) {
					points = ["50%", "75%"]; // Dispatched state at 75%
				} else if (isRequestMode) {
					points = ["45%", "75%", "85%"]; // Semi-full modal for request mode
				} else {
					points = ["18%", "45%", "92%"];
				}
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
				
				console.log('[useEmergencySheetController] Calculated snap points:', {
					screenHeight,
					collapsedHeight,
					collapsedPercent,
					safeCollapsed,
					points
				});
			}
		}

		// Lock snap points on first computation, but not for request mode
		if (!hasComputedSnapPointsRef.current && !isRequestMode) {
			console.log('[useEmergencySheetController] Locking snap points for first time:', {
				points,
				timestamp: Date.now()
			});
			snapPointsRef.current = points;
			hasComputedSnapPointsRef.current = true;
			startupPhaseRef.current = 'snap_points_locked';
			console.log('[useEmergencySheetController] Startup phase: snap_points_locked');
		}

		return points;
	}, [collapsedPercent, isDetailMode, isTripMode, isBedBookingMode, isRequestMode, screenHeight]);

	const animationConfigs = useBottomSheetSpringConfigs({
		damping: 34,
		stiffness: 420,
		mass: 0.9,
		overshootClamping: false,
		restDisplacementThreshold: 0.5,
		restSpeedThreshold: 0.5,
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

