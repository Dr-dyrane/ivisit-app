import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";

export default function useMapAndroidExpandedCollapse({
	snapState,
	onSnapStateChange,
	bodyScrollRef,
	onScroll,
	onScrollBeginDrag,
	onExpandedToHalf,
	topOffset = 4,
}) {
	const [isBodyAtTop, setIsBodyAtTop] = useState(true);
	const previousSnapStateRef = useRef(snapState);

	const updateAtTop = useCallback(
		(offsetY = 0) => {
			const nextIsBodyAtTop = offsetY <= topOffset;
			setIsBodyAtTop((current) => (current === nextIsBodyAtTop ? current : nextIsBodyAtTop));
		},
		[topOffset],
	);

	const handleAndroidCollapseScroll = useCallback(
		(event) => {
			onScroll?.(event);
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			updateAtTop(offsetY);
		},
		[onScroll, updateAtTop],
	);

	const handleAndroidCollapseScrollBeginDrag = useCallback(
		(event) => {
			onScrollBeginDrag?.(event);
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			updateAtTop(offsetY);
		},
		[onScrollBeginDrag, updateAtTop],
	);

	useEffect(() => {
		if (snapState !== MAP_SHEET_SNAP_STATES.EXPANDED && !isBodyAtTop) {
			setIsBodyAtTop(true);
		}
	}, [isBodyAtTop, snapState]);

	useEffect(() => {
		const previousSnapState = previousSnapStateRef.current;
		previousSnapStateRef.current = snapState;

		if (
			previousSnapState === MAP_SHEET_SNAP_STATES.EXPANDED &&
			snapState === MAP_SHEET_SNAP_STATES.HALF
		) {
			setIsBodyAtTop(true);
			requestAnimationFrame(() => {
				bodyScrollRef.current?.scrollTo?.({ y: 0, animated: false });
				onExpandedToHalf?.();
			});
		}
	}, [bodyScrollRef, onExpandedToHalf, snapState]);

	const androidExpandedBodyGesture = useMemo(() => {
		if (
			Platform.OS !== "android" ||
			snapState !== MAP_SHEET_SNAP_STATES.EXPANDED ||
			typeof onSnapStateChange !== "function"
		) {
			return null;
		}

		return Gesture.Pan()
			.runOnJS(true)
			.activeOffsetY(32)
			.failOffsetX([-16, 16])
			.shouldCancelWhenOutside(false)
			.onEnd((event) => {
				if (!isBodyAtTop) return;
				const absDx = Math.abs(event.translationX ?? 0);
				const absDy = Math.abs(event.translationY ?? 0);
				const velocityY = Number(event.velocityY ?? 0);
				const isVerticalIntent = absDy > 56 && absDy > absDx * 1.6;
				const passedDistance = event.translationY > 104;
				const passedVelocity = event.translationY > 56 && velocityY > 1450;

				if (isVerticalIntent && (passedDistance || passedVelocity)) {
					onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
				}
			});
	}, [isBodyAtTop, onSnapStateChange, snapState]);

	return {
		androidExpandedBodyGesture,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
		isBodyAtTop,
	};
}
