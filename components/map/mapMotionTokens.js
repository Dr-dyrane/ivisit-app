import { Easing, Platform } from "react-native";
import { MAP_SHEET_SNAP_STATES } from "./mapSheet.constants";

export const MAP_APPLE_EASE = Easing.bezier(0.21, 0.47, 0.32, 0.98);

export const MAP_MODAL_SPRING = {
	tension: 46,
	friction: 10,
};

export const MAP_SHEET_SNAP_SPRING = {
	tension: 56,
	friction: 10,
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
			gestureActivationOffset: 4,
			dragRange: { up: -220, down: 180 },
			release: { distance: 44, velocity: 0.28 },
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: false,
				topThreshold: 10,
				expandOffset: 32,
				collapsePull: -36,
				expandVelocity: 0.72,
				collapseVelocity: -0.82,
				halfCollapseExtraPull: 12,
				halfCollapseVelocityFactor: 1.2,
				halfCollapseWheelThreshold: -96,
			},
		},
		modal: {
			defaultSnapState: MAP_SHEET_SNAP_STATES.HALF,
			spring: {
				damping: 24,
				mass: 0.9,
				stiffness: 210,
			},
			gestureActivationOffset: 4,
			dragRange: { up: -220, down: 180 },
			release: { distance: 44, velocity: 0.28 },
			scroll: {
				enableContentDetents: true,
				enableWheelDetents: false,
				topThreshold: 10,
				expandOffset: 28,
				collapsePull: -34,
				expandVelocity: 0.7,
				collapseVelocity: -0.8,
				halfCloseExtraPull: 18,
				halfCloseVelocityFactor: 1.28,
				halfCloseWheelThreshold: -118,
				collapsedWheelThreshold: -82,
			},
		},
	},
	ios: {
		defaultSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
	},
	android: {
		sheet: {
			gestureActivationOffset: 3,
			release: { distance: 38, velocity: 0.22 },
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: false,
			},
		},
		modal: {
			gestureActivationOffset: 3,
			release: { distance: 38, velocity: 0.22 },
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: false,
			},
		},
	},
	web: {
		sheet: {
			gestureActivationOffset: 5,
			release: { distance: 40, velocity: 0.24 },
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: true,
				halfCollapseWheelThreshold: -84,
			},
		},
		modal: {
			gestureActivationOffset: 5,
			release: { distance: 40, velocity: 0.24 },
			scroll: {
				enableContentDetents: false,
				enableWheelDetents: true,
				halfCloseWheelThreshold: -96,
				collapsedWheelThreshold: -72,
			},
		},
	},
};

export function getMapPlatformMotion(platform = Platform.OS) {
	const base = MAP_PLATFORM_MOTION.default;
	const override = MAP_PLATFORM_MOTION[platform] || {};

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
