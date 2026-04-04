import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import { getWelcomeThemePalette } from "../../constants/welcomeTheme";

export function createWelcomePadTheme({
	isDarkMode,
	isShortHeight,
	horizontalPadding,
	insetsTop,
	insetsBottom,
	entryPrimaryActionHeight,
}) {
	const colors = getWelcomeThemePalette({ isDarkMode });

	const metrics = {
		topPadding: insetsTop + (isShortHeight ? 28 : 40),
		bottomPadding: insetsBottom + 32,
		stageWidth: 760,
		logoSize: 56,
		brandSize: 36,
		heroWidth: 470,
		heroHeight: 360,
		headlineSize: 58,
		headlineLineHeight: 62,
		helperSize: 20,
		helperLineHeight: 30,
		primaryActionHeight: Math.max(entryPrimaryActionHeight, 64),
		secondaryActionHeight: 60,
		stageSpacing: {
			brandToHero: isShortHeight ? 22 : 32,
			heroToHeadline: isShortHeight ? 24 : 34,
			headlineToHelper: 16,
			helperToChip: 18,
			chipToActions: 34,
			actionGap: 14,
			signInTop: 20,
		},
	};

	const styles = StyleSheet.create({
		gradient: {
			flex: 1,
			backgroundColor: colors.backgroundBase,
		},
		topGlow: {
			position: "absolute",
			top: -110,
			left: "-10%",
			width: 320,
			height: 320,
			borderRadius: 999,
			backgroundColor: colors.topGlow,
			opacity: isDarkMode ? 0.06 : 0.04,
		},
		bottomGlow: {
			position: "absolute",
			right: "-10%",
			bottom: -120,
			width: 320,
			height: 320,
			borderRadius: 999,
			backgroundColor: colors.bottomGlow,
			opacity: isDarkMode ? 0.12 : 0.18,
		},
		scrollContent: {
			flexGrow: 1,
			paddingHorizontal: horizontalPadding,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			alignItems: "center",
			backgroundColor: colors.backgroundBase,
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			alignItems: "center",
			backgroundColor: colors.backgroundBase,
		},
		brandBlock: {
			alignItems: "center",
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
			letterSpacing: -1.6,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "center",
			maxWidth: 520,
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
			maxWidth: 460,
			marginTop: metrics.stageSpacing.chipToActions,
			gap: metrics.stageSpacing.actionGap,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "center",
		},
		signInText: {
			color: colors.support,
			fontSize: 18,
			lineHeight: 24,
			fontWeight: "700",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomePadTheme;
