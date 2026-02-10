import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencySheetController } from "./useEmergencySheetController";

export const useBottomSheetSnap = ({
	isDetailMode,
	isTripMode,
	isBedBookingMode,
	hasAnyVisitActive,
	onSnapChange,
	mode,
	activeAmbulanceTrip,
	activeBedBooking,
}) => {
	const { hideTabBar, resetTabBar } = useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();
	const { updateScrollPosition } = useEmergencyUI();

	const { snapPoints, animationConfigs, currentSnapIndex } =
		useEmergencySheetController({
			isDetailMode,
			isTripMode,
			isBedBookingMode,
			hasAnyVisitActive,
			onSnapChange,
			mode,
			activeAmbulanceTrip,
			activeBedBooking,
		});

	const handleSheetChange = useCallback(
		(index) => {
			// Get max index dynamically for handling
			const maxIndex = Math.max(0, snapPoints.length - 1);

			// Clamp index to valid range to prevent errors
			const clampedIndex = Math.max(0, Math.min(index, maxIndex));

			if (onSnapChange) {
				onSnapChange(clampedIndex);
			}

			// Derive if the current point is actually 'full screen' (e.g. > 70%)
			const currentPoint = snapPoints[clampedIndex];
			const isExpandedFullScreen = typeof currentPoint === 'string' && parseInt(currentPoint) > 70;

			// ONLY hide tab bar if we are truly covering the screen (> 70%)
			// This prevents 'locked out' feeling during waiting phases or detail views
			if (isExpandedFullScreen) {
				hideTabBar();
			} else {
				resetTabBar();
				// Also reset header if we are collapsing
				if (clampedIndex === 0) {
					resetHeader();
					updateScrollPosition(0);
					Keyboard.dismiss();
				}
			}
		},
		[
			hideTabBar,
			isDetailMode,
			resetTabBar,
			resetHeader,
			onSnapChange,
			updateScrollPosition,
			snapPoints,
		]
	);

	return {
		snapPoints,
		animationConfigs,
		currentSnapIndex,
		handleSheetChange,
	};
};
