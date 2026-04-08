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
			return { maxWidth: 760, gap: 16, padding: 20, routeHeight: 248, stageMinHeight: 720, stageMaxHeight: 1180 };
		case "android-tablet":
		case "web-sm-wide":
		case "web-md":
			return { maxWidth: 860, gap: 16, padding: 20, routeHeight: 256, stageMinHeight: 760, stageMaxHeight: 1220 };
		case "android-chromebook":
		case "macbook":
		case "web-lg":
		case "web-xl":
		case "web-2xl-3xl":
		case "web-ultra-wide":
			return { maxWidth: 980, gap: 18, padding: 22, routeHeight: 272, stageMinHeight: 820, stageMaxHeight: 1280 };
		case "android-mobile":
		case "web-mobile":
		case "ios-mobile":
		default:
			return { maxWidth: 680, gap: 12, padding: 14, routeHeight: 214, stageMinHeight: 680, stageMaxHeight: 1120 };
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
			? ["rgba(2,6,23,0.18)", "rgba(2,6,23,0.12)", "rgba(2,6,23,0.30)"]
			: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)", "rgba(15,23,42,0.10)"],
		heroGlassBackground: isDarkMode ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.84)",
		mapTintColors: isDarkMode
			? ["rgba(2,6,23,0.00)", "rgba(2,6,23,0.08)", "rgba(2,6,23,0.22)"]
			: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.04)", "rgba(15,23,42,0.10)"],
	};

	const styles = StyleSheet.create({
		shell: {
			width: "100%",
			alignItems: "center",
			alignSelf: "center",
			paddingHorizontal: 0,
		},
		mapShell: {
			width: "100%",
			position: "relative",
			borderRadius: 0,
			overflow: "hidden",
			minHeight: 440,
			backgroundColor: "transparent",
		},
		flatMapStage: {
			...StyleSheet.absoluteFillObject,
			width: "100%",
			borderRadius: 0,
			overflow: "hidden",
			position: "absolute",
			backgroundColor: "rgba(148,163,184,0.08)",
			zIndex: 0,
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
		mapHud: {
			position: "absolute",
			top: 12,
			left: 12,
			right: 12,
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			gap: 8,
			zIndex: 2,
		},
		mapHudPill: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 10,
			paddingVertical: 7,
			borderRadius: 999,
			maxWidth: "74%",
		},
		mapHudText: {
			fontSize: 12,
			fontWeight: "700",
		},
		bottomSheet: {
			position: "absolute",
			left: 0,
			right: 0,
			bottom: -2,
			borderTopLeftRadius: 28,
			borderTopRightRadius: 28,
			borderBottomLeftRadius: 0,
			borderBottomRightRadius: 0,
			gap: 12,
			zIndex: 4,
			shadowColor: "#020617",
			shadowOffset: { width: 0, height: 12 },
			shadowOpacity: 0.12,
			shadowRadius: 18,
			elevation: 12,
		},
		sheetHeaderSurface: {
			borderRadius: 20,
			paddingHorizontal: 14,
			paddingVertical: 12,
		},
		sheetHandle: {
			width: 42,
			height: 5,
			borderRadius: 999,
			alignSelf: "center",
			marginTop: -2,
			marginBottom: 4,
		},
		sheetHeaderRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			justifyContent: "space-between",
			gap: 10,
		},
		sheetCopy: {
			flex: 1,
			gap: 4,
		},
		sheetEyebrow: {
			fontSize: 11,
			fontWeight: "800",
			letterSpacing: 0.4,
			textTransform: "uppercase",
		},
		sheetTitle: {
			fontSize: 22,
			fontWeight: "900",
			letterSpacing: -0.7,
		},
		sheetSubtitle: {
			fontSize: 13,
			lineHeight: 19,
			maxWidth: 420,
		},
		skipChip: {
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 999,
		},
		skipChipText: {
			fontSize: 12,
			fontWeight: "700",
		},
		sheetBody: {
			flex: 1,
			justifyContent: "flex-start",
			gap: 12,
			paddingTop: 2,
		},
		dispatchCard: {
			borderRadius: 20,
			padding: 12,
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		dispatchArtwork: {
			width: 110,
			height: 84,
			borderRadius: 16,
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
		},
		dispatchCopy: {
			flex: 1,
			gap: 4,
		},
		dispatchTitle: {
			fontSize: 16,
			fontWeight: "800",
			letterSpacing: -0.25,
		},
		dispatchEta: {
			fontSize: 22,
			fontWeight: "900",
			letterSpacing: -0.7,
		},
		dispatchMeta: {
			fontSize: 12,
			lineHeight: 18,
		},
		previewIconButton: {
			width: 34,
			height: 34,
			borderRadius: 17,
			alignItems: "center",
			justifyContent: "center",
			flexShrink: 0,
		},
		routeDetailsSurface: {
			width: "100%",
			borderRadius: 20,
			gap: 12,
			padding: 12,
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
		identityCard: {
			borderRadius: 20,
			padding: 12,
			gap: 12,
		},
		sheetFooter: {
			gap: 8,
			marginTop: "auto",
			paddingTop: 4,
		},
		primaryActionButton: {
			minHeight: 46,
			borderRadius: 999,
			paddingHorizontal: 16,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
		},
		primaryActionText: {
			color: "#FFFFFF",
			fontSize: 14,
			fontWeight: "800",
			letterSpacing: -0.2,
		},
		progressRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 2,
			paddingTop: 2,
		},
		progressButton: {
			width: 28,
			height: 28,
			alignItems: "center",
			justifyContent: "center",
		},
		progressDot: {
			width: 8,
			height: 8,
			borderRadius: 4,
			opacity: 0.4,
		},
		progressDotActive: {
			width: 22,
			borderRadius: 999,
			opacity: 1,
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
