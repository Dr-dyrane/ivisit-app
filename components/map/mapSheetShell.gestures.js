import { Animated, PanResponder } from "react-native";
import {
	getNextAllowedMapSheetSnapStateDown,
	getNextAllowedMapSheetSnapStateUp,
	MAP_SHEET_SNAP_STATE_ORDER,
	MAP_SHEET_SNAP_STATES,
} from "./core/mapSheet.constants";

function shouldCaptureVerticalPan(gestureState, activationOffset, axisLockRatio = 1.1) {
	const absDx = Math.abs(gestureState?.dx || 0);
	const absDy = Math.abs(gestureState?.dy || 0);

	return absDy > activationOffset && absDy > absDx * axisLockRatio;
}

function springSheetHeightToDetent({
	getHeightForSnapState,
	sheetHeightValue,
	sheetHeightValueRef,
	snapSpringConfig,
	targetSnapState,
}) {
	const targetHeight = getHeightForSnapState(targetSnapState);
	sheetHeightValueRef.current = targetHeight;
	Animated.spring(sheetHeightValue, {
		toValue: targetHeight,
		useNativeDriver: false,
		...snapSpringConfig,
	}).start();
}

export function createMapSheetPanResponder({
	allowedSnapStates,
	isSidebar,
	getHeightForSnapState,
	platformMotion,
	resolvedSnapState,
	onHandlePress,
	sheetHeightValue,
	sheetHeightValueRef,
	snapSpringConfig,
}) {
	const gestureStartHeightRef = { current: getHeightForSnapState(resolvedSnapState) };
	const orderedAllowedSnapStates =
		Array.isArray(allowedSnapStates) && allowedSnapStates.length > 0
			? allowedSnapStates
			: MAP_SHEET_SNAP_STATE_ORDER;
	const allowedHeights = orderedAllowedSnapStates
		.map((state) => getHeightForSnapState(state))
		.filter((value) => Number.isFinite(value));
	const minAllowedHeight = allowedHeights.length > 0 ? Math.min(...allowedHeights) : 0;
	const maxAllowedHeight = allowedHeights.length > 0 ? Math.max(...allowedHeights) : Infinity;

	return PanResponder.create({
		onMoveShouldSetPanResponder: (_, gestureState) => {
			if (isSidebar) return false;
			return shouldCaptureVerticalPan(
				gestureState,
				platformMotion.sheet.gestureActivationOffset,
				platformMotion.sheet.axisLockRatio,
			);
		},
		onMoveShouldSetPanResponderCapture: (_, gestureState) => {
			if (isSidebar) return false;
			return shouldCaptureVerticalPan(
				gestureState,
				platformMotion.sheet.gestureActivationOffset,
				platformMotion.sheet.axisLockRatio,
			);
		},
		onPanResponderGrant: () => {
			sheetHeightValue.stopAnimation((value) => {
				const resolvedValue = Number.isFinite(value)
					? value
					: getHeightForSnapState(resolvedSnapState);
				gestureStartHeightRef.current = resolvedValue;
				sheetHeightValueRef.current = resolvedValue;
			});
		},
		onPanResponderMove: (_, gestureState) => {
			if (isSidebar) return;
			const nextHeight = Math.max(
				minAllowedHeight,
				Math.min(maxAllowedHeight, gestureStartHeightRef.current - gestureState.dy),
			);
			sheetHeightValueRef.current = nextHeight;
			sheetHeightValue.setValue(nextHeight);
		},
		onPanResponderRelease: (_, gestureState) => {
			if (isSidebar) return;
			const { dy, vy } = gestureState;
			const absDx = Math.abs(gestureState?.dx || 0);
			const absDy = Math.abs(dy || 0);
			const activationOffset = platformMotion.sheet.gestureActivationOffset;
			const releaseDistance = platformMotion.sheet.release.distance;
			const releaseVelocity = platformMotion.sheet.release.velocity;
			const isVerticalIntent =
				absDy > activationOffset * 1.5 &&
				absDy > absDx * platformMotion.sheet.axisLockRatio;
			const hasUpDistance = dy <= -releaseDistance;
			const hasDownDistance = dy >= releaseDistance;
			const hasUpVelocity = dy <= -activationOffset * 2 && vy <= -releaseVelocity;
			const hasDownVelocity = dy >= activationOffset * 2 && vy >= releaseVelocity;
			let nextState = resolvedSnapState;

			if (isVerticalIntent && (hasUpDistance || hasUpVelocity)) {
				nextState = getNextAllowedMapSheetSnapStateUp(
					resolvedSnapState,
					allowedSnapStates,
				);
			} else if (isVerticalIntent && (hasDownDistance || hasDownVelocity)) {
				nextState = getNextAllowedMapSheetSnapStateDown(
					resolvedSnapState,
					allowedSnapStates,
				);
			}

			if (nextState !== resolvedSnapState) {
				onHandlePress?.(nextState);
				return;
			}

			springSheetHeightToDetent({
				getHeightForSnapState,
				sheetHeightValue,
				sheetHeightValueRef,
				snapSpringConfig,
				targetSnapState: resolvedSnapState,
			});
		},
		onPanResponderTerminate: () => {
			springSheetHeightToDetent({
				getHeightForSnapState,
				sheetHeightValue,
				sheetHeightValueRef,
				snapSpringConfig,
				targetSnapState: resolvedSnapState,
			});
		},
	});
}
