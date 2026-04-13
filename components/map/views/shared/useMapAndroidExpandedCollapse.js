import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform } from "react-native";
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

	const androidCollapseResponder = useMemo(() => {
		if (
			Platform.OS !== "android" ||
			snapState !== MAP_SHEET_SNAP_STATES.EXPANDED ||
			typeof onSnapStateChange !== "function"
		) {
			return null;
		}

		return PanResponder.create({
			onMoveShouldSetPanResponder: (_event, gestureState) =>
				isBodyAtTop &&
				gestureState.dy > 10 &&
				Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.15,
			onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
				isBodyAtTop &&
				gestureState.dy > 10 &&
				Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.15,
			onPanResponderRelease: (_event, gestureState) => {
				if (gestureState.dy > 48 || gestureState.vy > 0.24) {
					onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
				}
			},
			onPanResponderTerminationRequest: () => true,
		});
	}, [isBodyAtTop, onSnapStateChange, snapState]);

	return {
		androidCollapseHandlers: androidCollapseResponder?.panHandlers ?? {},
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
		isBodyAtTop,
	};
}
