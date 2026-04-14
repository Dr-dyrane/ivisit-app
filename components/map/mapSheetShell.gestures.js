import { Animated, PanResponder } from "react-native";
import {
	getNextAllowedMapSheetSnapStateDown,
	getNextAllowedMapSheetSnapStateUp,
	MAP_SHEET_SNAP_STATES,
} from "./core/mapSheet.constants";

function shouldCaptureVerticalPan(gestureState, activationOffset, axisLockRatio = 1.1) {
	const absDx = Math.abs(gestureState?.dx || 0);
	const absDy = Math.abs(gestureState?.dy || 0);

	return absDy > activationOffset && absDy > absDx * axisLockRatio;
}

function resetDragTranslateY(dragTranslateY, snapSpringConfig) {
	Animated.spring(dragTranslateY, {
		toValue: 0,
		useNativeDriver: false,
		...snapSpringConfig,
	}).start();
}

export function createMapSheetPanResponder({
	allowedSnapStates,
	isSidebar,
	dragTranslateY,
	platformMotion,
	resolvedSnapState,
	onHandlePress,
	snapSpringConfig,
}) {
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
			dragTranslateY.stopAnimation();
		},
		onPanResponderMove: (_, gestureState) => {
			if (isSidebar) return;
			const rawDy = gestureState.dy;
			const minDy =
				resolvedSnapState === MAP_SHEET_SNAP_STATES.EXPANDED
					? 0
					: platformMotion.sheet.dragRange.up;
			const maxDy =
				resolvedSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED
					? 0
					: platformMotion.sheet.dragRange.down;
			const clampedDy = Math.max(minDy, Math.min(maxDy, rawDy));
			dragTranslateY.setValue(clampedDy);
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

			resetDragTranslateY(dragTranslateY, snapSpringConfig);
		},
		onPanResponderTerminate: () => {
			resetDragTranslateY(dragTranslateY, snapSpringConfig);
		},
	});
}
