import { COLORS } from "./colors";

export function getWelcomeRootBackground(isDarkMode) {
	return isDarkMode ? COLORS.bgDark : COLORS.bgLight;
}

export function getWelcomeEntrySpacing({
	profile = "ios",
	isVeryShortHeight = false,
	insetsBottom = 0,
} = {}) {
	const safeBottom = Math.min(Math.max(insetsBottom, 0), 34);
	const isAndroidProfile = profile === "android";
	const isWebProfile = profile === "web";

	return {
		helperToChip: isAndroidProfile ? 14 : 16,
		chipToActionWell: isVeryShortHeight
			? (isAndroidProfile ? 22 : 24)
			: (isAndroidProfile ? 32 : isWebProfile ? 30 : 34),
		actionWellMinHeight: isVeryShortHeight
			? (isAndroidProfile ? 28 : isWebProfile ? 24 : 30)
			: (isAndroidProfile
				? 76
				: isWebProfile
					? 68
					: 52 + Math.round(safeBottom * 0.55)),
		actionGap: isAndroidProfile ? 10 : 12,
		signInTop: isAndroidProfile ? 14 : 16,
	};
}

const WELCOME_AMBIENT_GEOMETRY = {
	"ios-mobile": {
		topGlow: { top: -82, left: "-22%", width: 220, height: 220, borderRadius: 999 },
		bottomGlow: { right: "-20%", bottom: -88, width: 220, height: 220, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.1, light: 0.18 },
	},
	"android-mobile": {
		topGlow: { top: -74, left: "-18%", width: 200, height: 200, borderRadius: 999 },
		bottomGlow: { right: "-18%", bottom: -84, width: 220, height: 220, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.1, light: 0.18 },
	},
	"web-mobile": {
		topGlow: { top: -72, left: -72, width: 180, height: 180, borderRadius: 999 },
		bottomGlow: { right: -84, bottom: -84, width: 220, height: 220, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.18 },
	},
	"web-sm-wide": {
		topGlow: { top: -88, left: "-12%", width: 220, height: 220, borderRadius: 999 },
		bottomGlow: { right: "-14%", bottom: -104, width: 260, height: 260, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.18 },
	},
	"web-md": {
		topGlow: { top: -104, left: "-10%", width: 280, height: 280, borderRadius: 999 },
		bottomGlow: { right: "-8%", bottom: -128, width: 320, height: 320, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.18 },
	},
	"web-lg": {
		topGlow: { top: -124, left: "-6%", width: 360, height: 360, borderRadius: 999 },
		bottomGlow: { right: "-8%", bottom: -172, width: 460, height: 460, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.2 },
	},
	"web-xl": {
		topGlow: { top: -156, left: "-4%", width: 440, height: 440, borderRadius: 999 },
		bottomGlow: { right: "-7%", bottom: -208, width: 560, height: 560, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.2 },
	},
	"web-2xl-3xl": {
		topGlow: { top: -184, left: "-3%", width: 520, height: 520, borderRadius: 999 },
		bottomGlow: { right: "-6%", bottom: -248, width: 680, height: 680, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.2 },
	},
	"web-ultra-wide": {
		topGlow: { top: -220, left: "-2%", width: 620, height: 620, borderRadius: 999 },
		bottomGlow: { right: "-5%", bottom: -300, width: 820, height: 820, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.12, light: 0.2 },
	},
	"ios-pad": {
		topGlow: { top: -110, left: "-10%", width: 320, height: 320, borderRadius: 999 },
		bottomGlow: { right: "-10%", bottom: -120, width: 320, height: 320, borderRadius: 999 },
		topOpacity: { dark: 0.06, light: 0.04 },
		bottomOpacity: { dark: 0.12, light: 0.18 },
	},
	"macbook": {
		topGlow: { top: -140, left: "-4%", width: 420, height: 420, borderRadius: 999 },
		bottomGlow: { right: "-8%", bottom: -180, width: 520, height: 520, borderRadius: 999 },
		topOpacity: { dark: 0.06, light: 0.04 },
		bottomOpacity: { dark: 0.12, light: 0.2 },
	},
	"android-fold": {
		topGlow: { top: -90, left: "-14%", width: 260, height: 260, borderRadius: 999 },
		bottomGlow: { right: "-14%", bottom: -110, width: 280, height: 280, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.1, light: 0.18 },
	},
	"android-tablet": {
		topGlow: { top: -110, left: "-10%", width: 320, height: 320, borderRadius: 999 },
		bottomGlow: { right: "-10%", bottom: -130, width: 340, height: 340, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.1, light: 0.18 },
	},
	"android-chromebook": {
		topGlow: { top: -140, left: "-6%", width: 420, height: 420, borderRadius: 999 },
		bottomGlow: { right: "-8%", bottom: -180, width: 520, height: 520, borderRadius: 999 },
		topOpacity: { dark: 0.05, light: 0.03 },
		bottomOpacity: { dark: 0.1, light: 0.18 },
	},
};

const TOP_GLOW_RADIUS_SCALE = 1.32;

function scaleGlowBox(glow, scale = 1) {
	if (!glow || scale === 1) return glow;

	return {
		...glow,
		width:
			typeof glow.width === "number"
				? Math.round(glow.width * scale)
				: glow.width,
		height:
			typeof glow.height === "number"
				? Math.round(glow.height * scale)
				: glow.height,
	};
}

export function getWelcomeAmbientGeometry({
	surface = "ios-mobile",
	isDarkMode = false,
} = {}) {
	const config = WELCOME_AMBIENT_GEOMETRY[surface] || WELCOME_AMBIENT_GEOMETRY["ios-mobile"];

	return {
		topGlow: {
			...scaleGlowBox(config.topGlow, TOP_GLOW_RADIUS_SCALE),
			opacity: isDarkMode ? config.topOpacity.dark : config.topOpacity.light,
		},
		bottomGlow: {
			...config.bottomGlow,
			opacity: isDarkMode ? config.bottomOpacity.dark : config.bottomOpacity.light,
		},
	};
}

export function getWelcomeThemePalette({
	isDarkMode,
	profile = "default",
} = {}) {
	const isAndroidProfile = profile === "android";

	if (isDarkMode) {
		return {
			backgroundBase: COLORS.bgDark,
			backgroundGradient: [
				COLORS.bgDark,
				isAndroidProfile ? "#0E1522" : "#0F1624",
				COLORS.bgDarkAlt,
			],
			brand: COLORS.textLight,
			headline: "#F8FAFC",
			helper: isAndroidProfile ? "#B2BED1" : "#B5C0D2",
			support: isAndroidProfile ? "#8F9CB0" : "#93A1B5",
			chipText: isAndroidProfile ? "#D3DCEA" : "#D6DFEB",
			chipBackground: isAndroidProfile
				? "rgba(255,255,255,0.045)"
				: "rgba(255,255,255,0.05)",
			topGlow: COLORS.brandPrimary,
			bottomGlow: isAndroidProfile ? "#162743" : "#14253F",
		};
	}

	return {
		backgroundBase: COLORS.bgLight,
		backgroundGradient: [
			COLORS.bgLight,
			isAndroidProfile ? "#FAF5F4" : "#FBF6F5",
			COLORS.bgLightAlt,
		],
		brand: COLORS.textPrimary,
		headline: "#111827",
		helper: isAndroidProfile ? "#5E687B" : "#5D677A",
		support: isAndroidProfile ? "#758095" : "#768195",
		chipText: isAndroidProfile ? "#4F5A6E" : "#515C70",
		chipBackground: isAndroidProfile
			? "rgba(255,255,255,0.74)"
			: "rgba(255,255,255,0.76)",
		topGlow: COLORS.brandPrimary,
		bottomGlow: "#E6EEF9",
	};
}
