import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencySheetController } from "./useEmergencySheetController";

export const useBottomSheetSnap = ({
	isDetailMode,
	isTripMode,
	isBedBookingMode,
	onSnapChange,
}) => {
	const { hideTabBar, resetTabBar } = useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();
	const { updateScrollPosition } = useEmergencyUI();
	const lastHapticIndexRef = useRef(null);

	const { snapPoints, animationConfigs, currentSnapIndex } =
		useEmergencySheetController({
			isDetailMode,
			isTripMode,
			isBedBookingMode,
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
			// Get max index dynamically for haptic feedback
			const maxIndex = Math.max(0, snapPoints.length - 1);
			const isExpanded = index >= maxIndex;
			
			if (index >= 0 && lastHapticIndexRef.current !== index) {
				lastHapticIndexRef.current = index;
				Haptics.impactAsync(
					isExpanded
						? Haptics.ImpactFeedbackStyle.Medium
						: Haptics.ImpactFeedbackStyle.Light
				);
			}

			if (onSnapChange) {
				onSnapChange(index);
			}

			if (isDetailMode) {
				hideTabBar();
				return;
			}

			if (isTripMode) {
				hideTabBar();
				resetHeader();
				return;
			}

			if (isBedBookingMode) {
				hideTabBar();
				resetHeader();
				return;
			}

			if (index === 0) {
				resetTabBar();
				resetHeader();
				updateScrollPosition(0);
				Keyboard.dismiss();
			}

			if (index >= maxIndex) {
				hideTabBar();
			}
		},
		[
			hideTabBar,
			isDetailMode,
			isTripMode,
			isBedBookingMode,
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
