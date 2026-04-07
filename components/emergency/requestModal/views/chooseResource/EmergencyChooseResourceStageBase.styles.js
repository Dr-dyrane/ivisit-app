import { StyleSheet } from "react-native";
import { getWelcomeThemePalette } from "../../../../../constants/welcomeTheme";

const EXPANDED_CONTEXT_VARIANTS = new Set([
	"ios-pad",
	"android-tablet",
	"android-chromebook",
	"macbook",
	"web-md",
	"web-lg",
	"web-xl",
	"web-2xl-3xl",
	"web-ultra-wide",
]);

const COMPACT_ROW_VARIANTS = new Set([
	"ios-mobile",
	"android-mobile",
	"web-mobile",
	"android-fold",
]);

function getVariantTuning(variant) {
	switch (variant) {
		case "ios-pad":
			return { maxWidth: 760, gap: 16, padding: 20, routeHeight: 220 };
		case "android-tablet":
		case "web-sm-wide":
		case "web-md":
			return { maxWidth: 860, gap: 16, padding: 20, routeHeight: 228 };
		case "android-chromebook":
		case "macbook":
		case "web-lg":
		case "web-xl":
		case "web-2xl-3xl":
		case "web-ultra-wide":
			return { maxWidth: 980, gap: 18, padding: 22, routeHeight: 244 };
		case "android-mobile":
		case "web-mobile":
		case "ios-mobile":
		default:
			return { maxWidth: 680, gap: 12, padding: 14, routeHeight: 188 };
	}
}

export function createEmergencyChooseResourceTheme({
	variant = "ios-mobile",
	isDarkMode = false,
	accent = "#B42318",
} = {}) {
	const resolvedVariant = String(variant || "ios-mobile");
	const resolvedAccent = accent || "#B42318";
	const tuning = getVariantTuning(resolvedVariant);
	const showExpandedContext = EXPANDED_CONTEXT_VARIANTS.has(resolvedVariant);
	const showCompactRowLayout = COMPACT_ROW_VARIANTS.has(resolvedVariant);
	const welcomePalette = getWelcomeThemePalette({
		isDarkMode,
		profile: resolvedVariant.startsWith("android") ? "android" : "default",
	});

	const surfaces = {
		heroArtworkBackground: isDarkMode ? "rgba(255,255,255,0.045)" : welcomePalette.chipBackground,
		heroOverlayColors: isDarkMode
			? ["rgba(2,6,23,0.86)", "rgba(2,6,23,0.66)", "rgba(2,6,23,0.20)", "rgba(2,6,23,0.02)"]
			: ["rgba(255,255,255,0.94)", "rgba(255,255,255,0.78)", "rgba(255,255,255,0.24)", "rgba(255,255,255,0.02)"],
		heroGlassBackground: welcomePalette.chipBackground,
		tierBaseSurface: isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.72)",
		tierSelectedSurface: isDarkMode ? `${resolvedAccent}26` : `${resolvedAccent}14`,
		tierUnavailableSurface: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(148,163,184,0.10)",
		mapTintColors: isDarkMode
			? ["rgba(2,6,23,0.00)", "rgba(2,6,23,0.08)", "rgba(2,6,23,0.20)"]
			: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.02)", "rgba(15,23,42,0.08)"],
	};

	const styles = StyleSheet.create({
		shell: {
			width: "100%",
			alignItems: "center",
			alignSelf: "center",
			paddingHorizontal: 4,
		},
		primarySurface: {
			width: "100%",
			borderRadius: 28,
			overflow: "hidden",
		},
		previewHeroCard: {
			width: "100%",
			borderRadius: 24,
			overflow: "hidden",
			position: "relative",
			justifyContent: "center",
		},
		previewHeroArtwork: {
			borderRadius: 24,
			minHeight: 184,
			alignItems: "flex-end",
			justifyContent: "center",
			paddingHorizontal: 14,
			paddingVertical: 12,
		},
		previewOverlayGradient: {
			...StyleSheet.absoluteFillObject,
		},
		previewOverlayContent: {
			...StyleSheet.absoluteFillObject,
			paddingHorizontal: 16,
			paddingVertical: 14,
			justifyContent: "space-between",
		},
		previewHeaderRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 10,
		},
		previewBadge: {
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 999,
			maxWidth: "82%",
		},
		previewBadgeText: {
			fontSize: 11,
			fontWeight: "700",
			letterSpacing: -0.1,
		},
		previewInfoStack: {
			gap: 6,
			maxWidth: "60%",
			paddingRight: 8,
			justifyContent: "flex-end",
		},
		previewTitle: {
			fontSize: 19,
			fontWeight: "800",
			letterSpacing: -0.45,
			lineHeight: 24,
		},
		previewIconButton: {
			width: 34,
			height: 34,
			borderRadius: 17,
			alignItems: "center",
			justifyContent: "center",
			flexShrink: 0,
		},
		previewEta: {
			fontSize: 30,
			fontWeight: "900",
			letterSpacing: -1,
			lineHeight: 32,
		},
		previewSummaryText: {
			fontSize: 13,
			fontWeight: "400",
			lineHeight: 19,
		},
		tierRailScroll: {
			marginTop: 14,
		},
		tierRailContent: {
			gap: 10,
			paddingRight: 8,
		},
		tierCard: {
			width: 190,
			borderRadius: 18,
			paddingHorizontal: 12,
			paddingVertical: 12,
			gap: 6,
		},
		tierCardUnavailable: {
			opacity: 0.48,
		},
		tierCardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		tierChip: {
			fontSize: 11,
			fontWeight: "800",
			letterSpacing: 0.45,
			textTransform: "uppercase",
		},
		tierCardTitle: {
			fontSize: 15,
			fontWeight: "800",
			letterSpacing: -0.25,
		},
		tierCardSubtitle: {
			fontSize: 12,
			lineHeight: 17,
		},
		routeDetailsSurface: {
			width: "100%",
			borderRadius: 22,
			gap: 12,
		},
		routeHeaderInline: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			gap: 10,
		},
		routeHeaderTitle: {
			fontSize: 15,
			fontWeight: "800",
			letterSpacing: -0.3,
		},
		routeHeaderMeta: {
			fontSize: 12,
			fontWeight: "700",
			textAlign: "right",
		},
		addressStack: {
			gap: 12,
		},
		addressRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: 10,
		},
		addressIconWrap: {
			width: 30,
			height: 30,
			borderRadius: 15,
			alignItems: "center",
			justifyContent: "center",
			marginTop: 2,
		},
		addressCopy: {
			flex: 1,
			minWidth: 0,
			gap: 2,
		},
		addressLabel: {
			fontSize: 10,
			fontWeight: "800",
			textTransform: "uppercase",
			letterSpacing: 0.35,
		},
		addressValue: {
			fontSize: 14,
			fontWeight: "700",
			lineHeight: 20,
		},
		addressSubvalue: {
			fontSize: 12,
			fontWeight: "600",
			lineHeight: 18,
		},
		flatMapStage: {
			width: "100%",
			borderRadius: 24,
			overflow: "hidden",
			position: "relative",
			backgroundColor: "rgba(148,163,184,0.08)",
		},
		mapTint: {
			...StyleSheet.absoluteFillObject,
		},
		mapPlaceholder: {
			...StyleSheet.absoluteFillObject,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 20,
			gap: 8,
		},
		mapPlaceholderText: {
			fontSize: 13,
			fontWeight: "600",
			textAlign: "center",
			lineHeight: 18,
		},
	});

	return {
		tuning,
		showExpandedContext,
		showCompactRowLayout,
		welcomePalette,
		surfaces,
		styles,
	};
}

export default createEmergencyChooseResourceTheme;
