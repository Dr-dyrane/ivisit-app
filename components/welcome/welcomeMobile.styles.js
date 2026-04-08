import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeEntrySpacing,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeMobileTheme({
	isDarkMode,
	isCompactPhone,
	isVeryShortHeight,
	horizontalPadding,
	bodyTextSize,
	bodyTextLineHeight,
	entryPrimaryActionHeight,
	viewportHeight,
	insetsTop,
	insetsBottom,
}) {
	const colors = getWelcomeThemePalette({ isDarkMode });
	const ambient = getWelcomeAmbientGeometry({
		surface: "ios-mobile",
		isDarkMode,
	});
	const entrySpacing = getWelcomeEntrySpacing({
		profile: "ios",
		isVeryShortHeight,
		insetsBottom,
	});
	const stageMinHeight = Math.max(
		viewportHeight - (insetsTop + (isVeryShortHeight ? 10 : 18)) - (insetsBottom + (isVeryShortHeight ? 18 : 26)),
		0,
	);

	const metrics = {
		topPadding: insetsTop + (isVeryShortHeight ? 10 : 18),
		bottomPadding: insetsBottom + (isVeryShortHeight ? 18 : 26),
		stageMinHeight,
		contentWidth: 460,
		logoSize: isVeryShortHeight ? 46 : 50,
		brandSize: 30,
		heroWidth: isCompactPhone ? 320 : isVeryShortHeight ? 340 : 360,
		heroHeight: isCompactPhone ? 260 : isVeryShortHeight ? 280 : 300,
		headlineSize: isCompactPhone ? 34 : isVeryShortHeight ? 40 : 46,
		headlineLineHeight: isCompactPhone ? 38 : isVeryShortHeight ? 44 : 50,
		helperSize: isVeryShortHeight ? 15 : Math.max(16, bodyTextSize),
		helperLineHeight: isVeryShortHeight ? 22 : Math.max(24, bodyTextLineHeight),
		primaryActionHeight: entryPrimaryActionHeight,
		secondaryActionHeight: Math.max(entryPrimaryActionHeight - 4, 56),
		showChip: !isVeryShortHeight,
		stageSpacing: {
			brandToHero: isVeryShortHeight ? 18 : 28,
			heroToHeadline: isVeryShortHeight ? 20 : 28,
			headlineToHelper: 14,
			helperToChip: entrySpacing.helperToChip,
			chipToActionWell: entrySpacing.chipToActionWell,
			actionWellMinHeight: entrySpacing.actionWellMinHeight,
			actionGap: entrySpacing.actionGap,
			signInTop: entrySpacing.signInTop,
		},
	};

	const styles = StyleSheet.create({
		gradient: {
			flex: 1,
			backgroundColor: colors.backgroundBase,
			overflow: "hidden",
		},
		scrollContent: {
			flexGrow: 1,
			paddingHorizontal: horizontalPadding,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			backgroundColor: "transparent",
		},
		stage: {
			width: "100%",
			minHeight: metrics.stageMinHeight,
			maxWidth: metrics.contentWidth,
			alignSelf: "center",
			alignItems: "center",
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
			letterSpacing: -1.35,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "center",
			maxWidth: 340,
		},
		helper: {
			color: colors.helper,
			fontWeight: "400",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "center",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 332,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
			shadowColor: isDarkMode ? "#000000" : "#D2D8E3",
			shadowOpacity: isDarkMode ? 0.14 : 0.08,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: 8 },
		},
		chipText: {
			color: colors.chipText,
			fontSize: 13,
			lineHeight: 16,
			fontWeight: "400",
			letterSpacing: 0.2,
		},
		actionWell: {
			width: "100%",
			flexGrow: 1,
			minHeight: metrics.stageSpacing.actionWellMinHeight,
			marginTop: metrics.stageSpacing.chipToActionWell,
			justifyContent: "flex-end",
		},
		actions: {
			width: "100%",
			gap: metrics.stageSpacing.actionGap,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "center",
		},
		signInText: {
			color: colors.support,
			fontSize: metrics.helperSize - 1,
			lineHeight: metrics.helperLineHeight - 2,
			fontWeight: "400",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeMobileTheme;
