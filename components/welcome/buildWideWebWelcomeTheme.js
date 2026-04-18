import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function buildWideWebWelcomeTheme({
	surface,
	viewportHeight = 980,
	viewportWidth = 1280,
	isDarkMode = true,
	resolveMetrics,
	panelDark = "rgba(12, 18, 32, 0.48)",
	panelLight = "rgba(255,255,255,0.58)",
	panelRingDark = "rgba(255,255,255,0.04)",
	panelRingLight = "rgba(255,255,255,0.86)",
	chipBackgroundDark = "rgba(255,255,255,0.05)",
	chipBackgroundLight = "rgba(255,255,255,0.72)",
	heroRingOpacityDark = 0.08,
	heroRingOpacityLight = 0.45,
} = {}) {
	if (typeof resolveMetrics !== "function") {
		throw new Error("buildWideWebWelcomeTheme requires a resolveMetrics function.");
	}

	const colors = {
		...getWelcomeThemePalette({ isDarkMode }),
		chipBackground: isDarkMode ? chipBackgroundDark : chipBackgroundLight,
		panel: isDarkMode ? panelDark : panelLight,
		panelRing: isDarkMode ? panelRingDark : panelRingLight,
	};
	const ambient = getWelcomeAmbientGeometry({
		surface,
		isDarkMode,
	});
	const metrics = resolveMetrics({
		viewportHeight,
		viewportWidth,
	});
	const chipPaddingX = Math.round(Math.min(18, Math.max(14, viewportWidth * 0.013)));
	const chipPaddingY = Math.round(Math.min(10, Math.max(8, viewportHeight * 0.009)));
	const chipTextSize = Math.round(Math.min(14, Math.max(13, viewportWidth * 0.0115)));
	const chipTextLineHeight = Math.round(Math.min(18, Math.max(17, chipTextSize + 4)));

	const styles = StyleSheet.create({
		gradient: {
			flex: 1,
			minHeight: metrics.viewportHeight,
			width: "100%",
			backgroundColor: colors.backgroundBase,
			overflow: "hidden",
		},
		scrollView: {
			flex: 1,
			width: "100%",
			alignSelf: "stretch",
		},
		scrollContent: {
			flexGrow: 1,
			width: "100%",
			minHeight: metrics.viewportHeight,
			paddingHorizontal: metrics.horizontalPadding,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "transparent",
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			columnGap: metrics.stageSpacing.columnGap,
			backgroundColor: "transparent",
		},
		topGlow: {
			position: "absolute",
			...ambient.topGlow,
			backgroundColor: colors.topGlow,
		},
		bottomGlow: {
			position: "absolute",
			...ambient.bottomGlow,
			backgroundColor: colors.bottomGlow,
		},
		leftColumn: {
			width: metrics.leftColumnWidth,
			alignItems: "flex-start",
			flexShrink: 0,
		},
		brandBlock: {
			alignItems: "flex-start",
		},
		logo: {
			width: metrics.logoSize,
			height: metrics.logoSize,
		},
		brandText: {
			marginTop: metrics.brandMarginTop,
			color: colors.brand,
			fontWeight: "900",
			letterSpacing: metrics.brandLetterSpacing,
			fontSize: metrics.brandSize,
			textAlign: "left",
		},
		brandDot: {
			color: COLORS.brandPrimary,
			fontSize: metrics.brandSize + 2,
		},
		copyBlock: {
			width: "100%",
			marginTop: metrics.stageSpacing.brandToHeadline,
			alignItems: "flex-start",
		},
		headline: {
			color: colors.headline,
			fontWeight: "900",
			letterSpacing: metrics.headlineLetterSpacing,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "left",
			maxWidth: metrics.leftColumnWidth,
		},
		helper: {
			color: colors.helper,
			fontWeight: "400",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "left",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: metrics.helperMaxWidth,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: chipPaddingX,
			paddingVertical: chipPaddingY,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
			shadowColor: isDarkMode ? "#000000" : "#D2D8E3",
			shadowOpacity: isDarkMode ? 0.12 : 0.08,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
		},
		chipText: {
			color: colors.chipText,
			fontSize: chipTextSize,
			lineHeight: chipTextLineHeight,
			fontWeight: "400",
			letterSpacing: 0.2,
		},
		actions: {
			width: "100%",
			maxWidth: metrics.actionsMaxWidth,
			marginTop: metrics.stageSpacing.chipToActions,
			gap: metrics.stageSpacing.actionGap,
			alignItems: "flex-start",
		},
		primaryActionSlot: {
			width: "100%",
			maxWidth: metrics.actionsMaxWidth,
		},
		secondaryActionSlot: {
			width: "100%",
			maxWidth: metrics.secondaryActionMaxWidth,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "flex-start",
		},
		signInText: {
			color: colors.support,
			fontSize: metrics.signInSize,
			lineHeight: metrics.signInLineHeight,
			fontWeight: "400",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "left",
		},
		heroPanel: {
			flex: 1,
			minHeight: metrics.heroHeight + metrics.heroPanelExtraHeight,
			borderRadius: metrics.heroPanelRadius,
			backgroundColor: colors.panel,
			justifyContent: "center",
			alignItems: "center",
			shadowColor: isDarkMode ? "#000000" : "#CBD5E1",
			shadowOpacity: isDarkMode ? 0.18 : 0.1,
			shadowRadius: metrics.heroShadowRadius,
			shadowOffset: { width: 0, height: metrics.heroShadowHeight },
			overflow: "hidden",
		},
		heroRing: {
			position: "absolute",
			width: metrics.heroWidth * metrics.heroRingScale,
			height: metrics.heroWidth * metrics.heroRingScale,
			borderRadius: 999,
			backgroundColor: colors.panelRing,
			opacity: isDarkMode ? heroRingOpacityDark : heroRingOpacityLight,
		},
		heroImage: {
			width: metrics.heroWidth,
			height: metrics.heroHeight,
		},
	});

	return { colors, metrics, styles };
}

export default buildWideWebWelcomeTheme;
