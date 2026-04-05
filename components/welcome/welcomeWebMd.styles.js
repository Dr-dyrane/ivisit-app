import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeEntrySpacing,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeWebMdTheme({
	viewportHeight = 900,
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
		showChip: viewportHeight >= 760,
		topPadding: viewportHeight < 760 ? 28 : 40,
		bottomPadding: 28,
		stageWidth: 860,
		logoSize: 50,
		brandSize: 30,
		heroWidth: 380,
		heroHeight: 286,
		headlineSize: 52,
		headlineLineHeight: 56,
		helperSize: 18,
		helperLineHeight: 28,
		primaryActionHeight: 62,
		secondaryActionHeight: 58,
		stageSpacing: {
			brandToHero: viewportHeight < 760 ? 20 : 28,
			heroToHeadline: viewportHeight < 760 ? 22 : 28,
			headlineToHelper: 14,
			helperToChip: entrySpacing.helperToChip + 2,
			chipToActions: viewportHeight < 760 ? 24 : 30,
			actionGap: 14,
			signInTop: 20,
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
			alignItems: "center",
			alignSelf: "center",
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
		brandBlock: {
			alignItems: "center",
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
			textAlign: "center",
		},
		brandDot: {
			color: COLORS.brandPrimary,
			fontSize: metrics.brandSize + 2,
		},
		heroBlock: {
			width: "100%",
			marginTop: metrics.stageSpacing.brandToHero,
			alignItems: "center",
		},
		heroImage: {
			width: metrics.heroWidth,
			height: metrics.heroHeight,
		},
		copyBlock: {
			width: "100%",
			marginTop: metrics.stageSpacing.heroToHeadline,
			alignItems: "center",
		},
		headline: {
			color: colors.headline,
			fontWeight: "900",
			letterSpacing: -1.45,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "center",
			maxWidth: 600,
		},
		helper: {
			color: colors.helper,
			fontWeight: "500",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "center",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 520,
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
			fontWeight: "700",
			letterSpacing: 0.2,
		},
		actions: {
			width: "100%",
			maxWidth: 500,
			marginTop: metrics.stageSpacing.chipToActions,
			gap: metrics.stageSpacing.actionGap,
			alignItems: "center",
		},
		primaryActionSlot: {
			width: "100%",
			maxWidth: 500,
		},
		secondaryActionSlot: {
			width: "100%",
			maxWidth: 456,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "center",
		},
		signInText: {
			color: colors.support,
			fontSize: 17,
			lineHeight: 24,
			fontWeight: "700",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeWebMdTheme;
