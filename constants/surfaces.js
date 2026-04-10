import { Platform } from "react-native";

export const GLASS_SURFACE_VARIANTS = Object.freeze({
	HEADER: "header",
	ACTION: "action",
});

export const SURFACE_RADII = Object.freeze({
	HEADER_ISLAND: 48,
	ACTION_CHIP: 14,
});

const GLASS_SURFACE_PRESETS = {
	[GLASS_SURFACE_VARIANTS.HEADER]: {
		blurIntensity: { dark: 80, light: 90 },
		webBackdropFilter: "blur(18px) saturate(1.2)",
		palette: {
			dark: {
				underlay: "rgba(0, 0, 0, 0.24)",
				ios: "transparent",
				android: "rgba(18, 24, 38, 0.74)",
				web: "rgba(18, 24, 38, 0.44)",
				overlay: "rgba(15, 23, 42, 0.20)",
			},
			light: {
				underlay: "rgba(15, 23, 42, 0.12)",
				ios: "transparent",
				android: "rgba(255, 255, 255, 0.82)",
				web: "rgba(255, 255, 255, 0.40)",
				overlay: "rgba(255, 255, 255, 0.30)",
			},
		},
		shadow: {
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 12 },
				shadowOpacity: 0.12,
				shadowRadius: 16,
				elevation: 10,
			},
			android: {
				elevation: 0,
			},
			web: {
				boxShadow: "0px 12px 16px rgba(0,0,0,0.12)",
			},
			default: {},
		},
	},
	[GLASS_SURFACE_VARIANTS.ACTION]: {
		blurIntensity: { dark: 42, light: 46 },
		webBackdropFilter: "blur(12px) saturate(1.18)",
		palette: {
			dark: {
				underlay: "rgba(0, 0, 0, 0.16)",
				ios: "rgba(255,255,255,0.05)",
				android: "rgba(18, 24, 38, 0.70)",
				web: "rgba(18, 24, 38, 0.42)",
				overlay: "rgba(255,255,255,0.05)",
			},
			light: {
				underlay: "rgba(15, 23, 42, 0.08)",
				ios: "rgba(0,0,0,0.03)",
				android: "rgba(238, 242, 247, 0.78)",
				web: "rgba(255, 255, 255, 0.38)",
				overlay: "rgba(255,255,255,0.18)",
			},
		},
		shadow: {
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.08,
				shadowRadius: 12,
			},
			android: {
				elevation: 0,
			},
			web: {
				boxShadow: "0px 8px 16px rgba(0,0,0,0.16)",
			},
			default: {},
		},
	},
};

export function getGlassSurfaceTokens({
	isDarkMode,
	variant = GLASS_SURFACE_VARIANTS.HEADER,
	platform = Platform.OS,
} = {}) {
	const resolvedVariant = GLASS_SURFACE_PRESETS[variant]
		? variant
		: GLASS_SURFACE_VARIANTS.HEADER;
	const preset = GLASS_SURFACE_PRESETS[resolvedVariant];
	const themeKey = isDarkMode ? "dark" : "light";
	const palette = preset.palette[themeKey];
	const isWeb = platform === "web";
	const isAndroid = platform === "android";

	return {
		variant: resolvedVariant,
		tint: isDarkMode ? "dark" : "light",
		blurIntensity: preset.blurIntensity[themeKey],
		underlayColor: palette.underlay,
		surfaceColor: isWeb ? palette.web : isAndroid ? palette.android : palette.ios,
		overlayColor: palette.overlay,
		webBackdropStyle: isWeb
			? {
				backdropFilter: preset.webBackdropFilter,
				WebkitBackdropFilter: preset.webBackdropFilter,
			}
			: {},
		shadowStyle: Platform.select(preset.shadow) ?? preset.shadow.default ?? {},
	};
}
