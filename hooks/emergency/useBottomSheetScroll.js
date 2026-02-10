import { useCallback } from "react";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";

export const useBottomSheetScroll = ({ currentSnapIndex = 0, snapPoints = [] } = {}) => {
	const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll } = useScrollAwareHeader();
	const { getLastScrollY, updateScrollPosition } = useEmergencyUI();

	const handleScroll = useCallback(
		(event) => {
			const currentY = event.nativeEvent?.contentOffset?.y || 0;
			const lastY = getLastScrollY();
			const diff = currentY - lastY;

			// Check if we are at a full-screen snap point
			const currentPoint = snapPoints[currentSnapIndex];
			const isExpandedFullScreen = typeof currentPoint === 'string' && parseInt(currentPoint) > 70;

			// ONLY forward scroll to navigation if we are covering the screen
			// This prevents the list scroll from hiding tabs while at 50% height
			if (currentSnapIndex >= 1 && isExpandedFullScreen) {
				const amplifiedY = lastY + diff * 2;
				const syntheticEvent = {
					nativeEvent: { contentOffset: { y: Math.max(0, amplifiedY) } },
				};
				handleTabBarScroll(syntheticEvent);
				handleHeaderScroll(syntheticEvent);
			}

			updateScrollPosition(currentY);
		},
		[
			handleTabBarScroll,
			handleHeaderScroll,
			currentSnapIndex,
			getLastScrollY,
			updateScrollPosition,
			snapPoints,
		]
	);

	return {
		handleScroll,
	};
};
