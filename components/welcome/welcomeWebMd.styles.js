import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeEntrySpacing,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeWebMdTheme({
	viewportHeight = 900,
	viewportWidth = 900,
	isDarkMode = true,
	horizontalPadding = 32,
} = {}) {
	const colors = {
		...getWelcomeThemePalette({ isDarkMode }),
		chipBackground: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.74)",
		bottomGlow: isDarkMode ? "#152744" : "#E8EEF8",
	};
	const ambient = getWelcomeAmbientGeometry({
		surface: "web-md",
		isDarkMode,
	});
	const entrySpacing = getWelcomeEntrySpacing({
		profile: "web",
		isVeryShortHeight: viewportHeight < 760,
	});

	const metrics = {
		viewportHeight,
		viewportWidth,
		showChip: viewportHeight >= 760,
		topPadding: viewportHeight < 760 ? 28 : 40,
		bottomPadding: 28,
		stageWidth: Math.min(Math.max(viewportWidth - horizontalPadding * 2, 840), 980),
		leftColumnWidth: Math.min(Math.max(viewportWidth * 0.38, 340), 420),
		logoSize: 50,
		brandSize: 30,
		heroWidth: Math.min(Math.max(viewportWidth * 0.34, 320), 400),
		heroHeight: Math.min(Math.max(viewportHeight * 0.3, 250), 310),
		headlineSize: 48,
		headlineLineHeight: 52,
		helperSize: 17,
		helperLineHeight: 26,
		primaryActionHeight: 62,
		secondaryActionHeight: 58,
		heroPanelRadius: 34,
		stageSpacing: {
			brandToHeadline: viewportHeight < 760 ? 26 : 32,
			headlineToHelper: 14,
			helperToChip: entrySpacing.helperToChip + 2,
			chipToActions: viewportHeight < 760 ? 24 : 30,
			actionGap: 14,
			signInTop: 20,
			columnGap: viewportWidth >= 920 ? 52 : 40,
		},
	};

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
			paddingHorizontal: horizontalPadding,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			alignItems: "center",
			backgroundColor: "transparent",
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			minHeight: metrics.viewportHeight - metrics.topPadding - metrics.bottomPadding,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			columnGap: metrics.stageSpacing.columnGap,
			alignSelf: "center",
			backgroundColor: "transparent",
		},
		leftColumn: {
			width: metrics.leftColumnWidth,
			alignItems: "flex-start",
			flexShrink: 0,
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
		brandBlock: {
			alignItems: "flex-start",
		},
		logo: {
			width: metrics.logoSize,
			height: metrics.logoSize,
		},
		brandText: {
			marginTop: 10,
			color: colors.brand,
			fontWeight: "900",
			letterSpacing: -1,
			fontSize: metrics.brandSize,
			textAlign: "left",
		},
		brandDot: {
			color: COLORS.brandPrimary,
			fontSize: metrics.brandSize + 2,
		},
		heroBlock: {
			width: "100%",
			alignItems: "center",
		},
		heroImage: {
			width: metrics.heroWidth,
			height: metrics.heroHeight,
		},
		heroPanel: {
			flex: 1,
			minHeight: metrics.heroHeight + 48,
			borderRadius: metrics.heroPanelRadius,
			backgroundColor: isDarkMode
				? "rgba(12, 18, 32, 0.50)"
				: "rgba(255,255,255,0.56)",
			justifyContent: "center",
			alignItems: "center",
			shadowColor: isDarkMode ? "#000000" : "#CBD5E1",
			shadowOpacity: isDarkMode ? 0.16 : 0.10,
			shadowRadius: 24,
			shadowOffset: { width: 0, height: 16 },
			overflow: "hidden",
		},
		heroRing: {
			position: "absolute",
			width: metrics.heroWidth * 0.84,
			height: metrics.heroWidth * 0.84,
			borderRadius: 999,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.05)"
				: "rgba(255,255,255,0.84)",
			opacity: isDarkMode ? 0.10 : 0.42,
		},
		copyBlock: {
			width: "100%",
			marginTop: metrics.stageSpacing.brandToHeadline,
			alignItems: "flex-start",
		},
		headline: {
			color: colors.headline,
			fontWeight: "900",
			letterSpacing: -1.55,
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
			maxWidth: Math.min(metrics.leftColumnWidth, 400),
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 16,
			paddingVertical: 9,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
			shadowColor: isDarkMode ? "#000000" : "#D2D8E3",
			shadowOpacity: isDarkMode ? 0.12 : 0.08,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 10 },
		},
		chipText: {
			color: colors.chipText,
			fontSize: 14,
			lineHeight: 18,
			fontWeight: "400",
			letterSpacing: 0.2,
		},
		actions: {
			width: "100%",
			maxWidth: 360,
			marginTop: metrics.stageSpacing.chipToActions,
			gap: metrics.stageSpacing.actionGap,
			alignItems: "flex-start",
		},
		primaryActionSlot: {
			width: "100%",
			maxWidth: 360,
		},
		secondaryActionSlot: {
			width: "100%",
			maxWidth: 320,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "flex-start",
		},
		signInText: {
			color: colors.support,
			fontSize: 17,
			lineHeight: 24,
			fontWeight: "600",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "left",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeWebMdTheme;
