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
		});

	useEffect(() => {
		if (isDetailMode || isTripMode || isBedBookingMode) {
			hideTabBar();
		} else {
			resetTabBar();
		}
	}, [hideTabBar, isBedBookingMode, isDetailMode, isTripMode, resetTabBar]);

	const handleSheetChange = useCallback(
		(index) => {
			// Get max index dynamically for handling
			const maxIndex = Math.max(0, snapPoints.length - 1);
			
			// Clamp index to valid range to prevent errors
			const clampedIndex = Math.max(0, Math.min(index, maxIndex));

			if (onSnapChange) {
				onSnapChange(clampedIndex);
			}

			if (isDetailMode) {
				hideTabBar();
				return;
			}

			// During active trips, always hide tab bar regardless of snap index
			if (isTripMode || isBedBookingMode) {
				hideTabBar();
				resetHeader();
				return;
			}

			// Standard mode behavior
			if (clampedIndex === 0) {
				resetTabBar();
				resetHeader();
				updateScrollPosition(0);
				Keyboard.dismiss();
			}

			if (clampedIndex >= maxIndex) {
				hideTabBar();
			}
		},
		[
			hideTabBar,
			isDetailMode,
			isTripMode,
			isBedBookingMode,
			hasAnyVisitActive, // Add hasAnyVisitActive to dependencies
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
