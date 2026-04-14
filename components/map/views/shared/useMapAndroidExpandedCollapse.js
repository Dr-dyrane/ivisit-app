import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import { getMapPlatformMotion } from "../../tokens/mapMotionTokens";

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
	const bodyDragY = useRef(new Animated.Value(0)).current;
	const motion = useMemo(() => getMapPlatformMotion(Platform.OS), []);
	const expandedBodyGestureTokens = motion.sheet.expandedBodyGesture;
	const bodyDragSpringConfig = useMemo(
		() => ({
			tension: 48,
			friction: 15,
			useNativeDriver: true,
		}),
		[],
	);

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
		if (snapState !== MAP_SHEET_SNAP_STATES.EXPANDED) {
			bodyDragY.setValue(0);
		}
	}, [bodyDragY, isBodyAtTop, snapState]);

	useEffect(() => {
		const previousSnapState = previousSnapStateRef.current;
		previousSnapStateRef.current = snapState;

		if (
			previousSnapState === MAP_SHEET_SNAP_STATES.EXPANDED &&
			snapState === MAP_SHEET_SNAP_STATES.HALF
		) {
			setIsBodyAtTop(true);
			requestAnimationFrame(() => {
				bodyDragY.setValue(0);
				bodyScrollRef.current?.scrollTo?.({ y: 0, animated: false });
				onExpandedToHalf?.();
			});
		}
	}, [bodyDragY, bodyScrollRef, onExpandedToHalf, snapState]);

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
			.activeOffsetY(expandedBodyGestureTokens.activeOffsetY)
			.failOffsetX(expandedBodyGestureTokens.failOffsetX)
			.shouldCancelWhenOutside(false)
			.onBegin(() => {
				bodyDragY.stopAnimation();
			})
			.onUpdate((event) => {
				if (!isBodyAtTop) return;
				const rawTranslateY = Math.max(0, Number(event.translationY ?? 0));
				const visualTranslateY = Math.min(
					expandedBodyGestureTokens.maxVisualDrag,
					rawTranslateY * expandedBodyGestureTokens.visualDragFactor,
				);
				bodyDragY.setValue(visualTranslateY);
			})
			.onEnd((event) => {
				if (!isBodyAtTop) return;
				const absDx = Math.abs(event.translationX ?? 0);
				const absDy = Math.abs(event.translationY ?? 0);
				const velocityY = Number(event.velocityY ?? 0);
				const isVerticalIntent =
					absDy > expandedBodyGestureTokens.verticalIntentDistance &&
					absDy > absDx * expandedBodyGestureTokens.axisLockRatio;
				const passedDistance = event.translationY > expandedBodyGestureTokens.collapseDistance;
				const passedVelocity =
					event.translationY > expandedBodyGestureTokens.velocityDistance &&
					velocityY > expandedBodyGestureTokens.collapseVelocity;

				if (isVerticalIntent && (passedDistance || passedVelocity)) {
					onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
				}
				Animated.spring(bodyDragY, {
					toValue: 0,
					...bodyDragSpringConfig,
				}).start();
			})
			.onFinalize(() => {
				Animated.spring(bodyDragY, {
					toValue: 0,
					...bodyDragSpringConfig,
				}).start();
			});
	}, [
		bodyDragSpringConfig,
		bodyDragY,
		expandedBodyGestureTokens,
		isBodyAtTop,
		onSnapStateChange,
		snapState,
	]);

	return {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle:
			Platform.OS === "android" && snapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? { transform: [{ translateY: bodyDragY }] }
				: null,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
		isBodyAtTop,
	};
}
