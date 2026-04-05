import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeMacbookTheme({
	isDarkMode,
	isShortHeight,
	isLargeMonitor,
	horizontalPadding,
	insetsTop,
	insetsBottom,
	entryPrimaryActionHeight,
}) {
	const colors = {
		...getWelcomeThemePalette({ isDarkMode }),
		chipBackground: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)",
		panel: isDarkMode ? "rgba(12, 18, 32, 0.56)" : "rgba(255, 255, 255, 0.56)",
		panelRing: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.86)",
	};
	const ambient = getWelcomeAmbientGeometry({
		surface: "macbook",
		isDarkMode,
	});

	const metrics = {
		topPadding: insetsTop + (isShortHeight ? 36 : 52),
		bottomPadding: insetsBottom + 36,
		stageWidth: isLargeMonitor ? 1360 : 1200,
		leftColumnWidth: 470,
		logoSize: 58,
		brandSize: 36,
		heroWidth: isLargeMonitor ? 620 : 560,
		heroHeight: isLargeMonitor ? 480 : 430,
		headlineSize: isLargeMonitor ? 72 : 64,
		headlineLineHeight: isLargeMonitor ? 76 : 68,
		helperSize: 22,
		helperLineHeight: 32,
		primaryActionHeight: Math.max(entryPrimaryActionHeight, 66),
		secondaryActionHeight: 60,
		stageSpacing: {
			brandToHeadline: 36,
			headlineToHelper: 18,
			helperToChip: 18,
			chipToActions: 38,
			actionGap: 14,
			signInTop: 18,
		},
	};

	const styles = StyleSheet.create({
		gradient: {
			flex: 1,
			backgroundColor: colors.backgroundBase,
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
		scrollContent: {
			flexGrow: 1,
			paddingHorizontal: horizontalPadding,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: colors.backgroundBase,
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			columnGap: 60,
			backgroundColor: colors.backgroundBase,
		},
		leftColumn: {
			width: metrics.leftColumnWidth,
			alignItems: "flex-start",
		},
		brandBlock: {
			alignItems: "flex-start",
		},
		logo: {
			width: metrics.logoSize,
			height: metrics.logoSize,
		},
		brandText: {
			marginTop: 12,
			color: colors.brand,
			fontWeight: "900",
			letterSpacing: -1.1,
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
			letterSpacing: -1.8,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "left",
			maxWidth: metrics.leftColumnWidth,
		},
		helper: {
			color: colors.helper,
			fontWeight: "500",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "left",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 430,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 16,
			paddingVertical: 9,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
			shadowColor: isDarkMode ? "#000000" : "#D2D8E3",
			shadowOpacity: isDarkMode ? 0.12 : 0.08,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
		},
		chipText: {
			color: colors.chipText,
			fontSize: 14,
			lineHeight: 18,
			fontWeight: "700",
			letterSpacing: 0.2,
		},
		actions: {
			width: "100%",
			maxWidth: 420,
			marginTop: metrics.stageSpacing.chipToActions,
			gap: metrics.stageSpacing.actionGap,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "flex-start",
		},
		signInText: {
			color: colors.support,
			fontSize: 18,
			lineHeight: 24,
			fontWeight: "700",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "left",
		},
		heroPanel: {
			flex: 1,
			minHeight: metrics.heroHeight + 60,
			borderRadius: 44,
			backgroundColor: colors.panel,
			justifyContent: "center",
			alignItems: "center",
			shadowColor: isDarkMode ? "#000000" : "#CBD5E1",
			shadowOpacity: isDarkMode ? 0.18 : 0.1,
			shadowRadius: 28,
			shadowOffset: { width: 0, height: 18 },
			overflow: "hidden",
		},
		heroRing: {
			position: "absolute",
			width: metrics.heroWidth * 0.86,
			height: metrics.heroWidth * 0.86,
			borderRadius: 999,
			backgroundColor: colors.panelRing,
			opacity: isDarkMode ? 0.08 : 0.45,
		},
		heroImage: {
			width: metrics.heroWidth,
			height: metrics.heroHeight,
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeMacbookTheme;
