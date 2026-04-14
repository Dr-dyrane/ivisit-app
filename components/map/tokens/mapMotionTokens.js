import { Easing, Platform } from "react-native";
import { MAP_SHEET_SNAP_STATES } from "../core/mapSheet.constants";
import { getMapRuntimePlatform } from "../core/mapViewportConfig";

export const MAP_APPLE_EASE = Easing.bezier(0.21, 0.47, 0.32, 0.98);

export const MAP_MODAL_SPRING = {
	tension: 38,
	friction: 13,
	restDisplacementThreshold: 0.4,
	restSpeedThreshold: 0.4,
};

export const MAP_SHEET_SNAP_SPRING = {
	tension: 42,
	friction: 14,
	restDisplacementThreshold: 0.4,
	restSpeedThreshold: 0.4,
};

export const MAP_MODAL_BACKDROP_IN_MS = 260;
export const MAP_MODAL_BACKDROP_OUT_MS = 180;
export const MAP_MODAL_EXIT_MS = 240;
export const MAP_CARE_PULSE_MS = 760;

const MAP_PLATFORM_MOTION = {
	default: {
		ease: MAP_APPLE_EASE,
		sheet: {
			spring: MAP_SHEET_SNAP_SPRING,
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: false,
			axisLockRatio: 1.3,
			gestureActivationOffset: 10,
			dragRange: { up: -220, down: 180 },
			release: { distance: 68, velocity: 0.46 },
			expandedBodyGesture: {
				activeOffsetY: 32,
				failOffsetX: [-16, 16],
				verticalIntentDistance: 56,
				axisLockRatio: 1.6,
				collapseDistance: 104,
				velocityDistance: 56,
				collapseVelocity: 1450,
				visualDragFactor: 0.35,
				maxVisualDrag: 36,
			},
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: false,
				topThreshold: 10,
				expandOffset: 72,
				collapsePull: -58,
				expandVelocity: 1.2,
				collapseVelocity: -1.05,
				halfCollapseExtraPull: 24,
				halfCollapseVelocityFactor: 1.32,
				halfCollapseWheelThreshold: -128,
				wheelCooldownMs: 360,
			},
		},
		modal: {
			defaultSnapState: MAP_SHEET_SNAP_STATES.HALF,
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: false,
			axisLockRatio: 1.3,
			spring: {
				damping: 30,
				mass: 0.9,
				stiffness: 168,
				restDisplacementThreshold: 0.4,
				restSpeedThreshold: 0.4,
			},
			gestureActivationOffset: 10,
			dragRange: { up: -220, down: 180 },
			release: { distance: 68, velocity: 0.46 },
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: false,
				topThreshold: 10,
				expandOffset: 72,
				collapsePull: -58,
				expandVelocity: 1.2,
				collapseVelocity: -1.05,
				halfCloseExtraPull: 28,
				halfCloseVelocityFactor: 1.36,
				halfCloseWheelThreshold: -140,
				collapsedWheelThreshold: -108,
				wheelCooldownMs: 360,
			},
		},
	},
	ios: {
		defaultSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
	},
	"ios-web": {
		sheet: {
			gestureActivationOffset: 10,
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: false,
			},
		},
		modal: {
			gestureActivationOffset: 10,
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: false,
			},
		},
	},
	android: {
		sheet: {
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: true,
			gestureActivationOffset: 16,
			release: { distance: 76, velocity: 0.56 },
			expandedBodyGesture: {
				activeOffsetY: 36,
				collapseDistance: 116,
				collapseVelocity: 1560,
				maxVisualDrag: 34,
			},
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: false,
			},
		},
		modal: {
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: true,
			gestureActivationOffset: 16,
			release: { distance: 76, velocity: 0.56 },
			expandedBodyGesture: {
				activeOffsetY: 36,
				collapseDistance: 116,
				collapseVelocity: 1560,
				maxVisualDrag: 34,
			},
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: false,
			},
		},
	},
	"android-web": {
		sheet: {
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: true,
			gestureActivationOffset: 16,
			release: { distance: 76, velocity: 0.56 },
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: false,
			},
		},
		modal: {
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: true,
			gestureActivationOffset: 16,
			release: { distance: 76, velocity: 0.56 },
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: false,
			},
		},
	},
	web: {
		sheet: {
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: false,
			gestureActivationOffset: 12,
			release: { distance: 64, velocity: 0.45 },
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: true,
				halfCollapseWheelThreshold: -120,
				wheelCooldownMs: 420,
			},
		},
		modal: {
			enableHeaderGestureRegion: true,
			enableBodyGestureRegion: true,
			enableBodyGestureInExpandedState: false,
			gestureActivationOffset: 12,
			release: { distance: 64, velocity: 0.45 },
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: true,
				halfCloseWheelThreshold: -132,
				collapsedWheelThreshold: -104,
				wheelCooldownMs: 420,
			},
		},
	},
};

export function getMapPlatformMotion(platform = Platform.OS) {
	const resolvedPlatform = typeof platform === "string" ? platform : platform?.platform || Platform.OS;
	const resolvedUserAgent = typeof platform === "object" ? platform?.userAgent || null : null;
	const runtimePlatform = getMapRuntimePlatform({
		platform: resolvedPlatform,
		userAgent: resolvedUserAgent,
	});
	const base = MAP_PLATFORM_MOTION.default;
	const override = MAP_PLATFORM_MOTION[runtimePlatform] || {};

	return {
		ease: override.ease || base.ease,
		sheet: {
			...base.sheet,
			...(override.sheet || {}),
			spring: {
				...base.sheet.spring,
				...((override.sheet || {}).spring || {}),
			},
			dragRange: {
				...base.sheet.dragRange,
				...((override.sheet || {}).dragRange || {}),
			},
			release: {
				...base.sheet.release,
				...((override.sheet || {}).release || {}),
			},
			expandedBodyGesture: {
				...base.sheet.expandedBodyGesture,
				...((override.sheet || {}).expandedBodyGesture || {}),
			},
			scroll: {
				...base.sheet.scroll,
				...((override.sheet || {}).scroll || {}),
			},
		},
		modal: {
			...base.modal,
			...(override.modal || {}),
			defaultSnapState:
				override.defaultSnapState ||
				(override.modal || {}).defaultSnapState ||
				base.modal.defaultSnapState,
			spring: {
				...base.modal.spring,
				...((override.modal || {}).spring || {}),
			},
			dragRange: {
				...base.modal.dragRange,
				...((override.modal || {}).dragRange || {}),
			},
			release: {
				...base.modal.release,
				...((override.modal || {}).release || {}),
			},
			scroll: {
				...base.modal.scroll,
				...((override.modal || {}).scroll || {}),
			},
		},
	};
}
