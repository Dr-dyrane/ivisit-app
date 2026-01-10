import { useCallback } from "react";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";

export const useBottomSheetScroll = ({ currentSnapIndex = 0 } = {}) => {
	const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
	const { handleScroll: handleHeaderScroll } = useScrollAwareHeader();
	const { getLastScrollY, updateScrollPosition } = useEmergencyUI();

	const handleScroll = useCallback(
		(event) => {
			const currentY = event.nativeEvent?.contentOffset?.y || 0;
			const lastY = getLastScrollY();
			const diff = currentY - lastY;

			if (currentSnapIndex >= 1) {
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
		]
	);

	return {
		handleScroll,
	};
};
