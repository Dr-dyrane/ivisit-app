import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeEntrySpacing,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeAndroidMobileTheme({
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
	const colors = getWelcomeThemePalette({ isDarkMode, profile: "android" });
	const ambient = getWelcomeAmbientGeometry({
		surface: "android-mobile",
		isDarkMode,
	});
	const entrySpacing = getWelcomeEntrySpacing({
		profile: "android",
		isVeryShortHeight,
		insetsBottom,
	});
	const stageMinHeight = Math.max(
		viewportHeight - (insetsTop + (isVeryShortHeight ? 8 : 16)) - (insetsBottom + (isVeryShortHeight ? 18 : 24)),
		0,
	);

	const metrics = {
		topPadding: insetsTop + (isVeryShortHeight ? 8 : 16),
		bottomPadding: insetsBottom + (isVeryShortHeight ? 18 : 24),
		stageMinHeight,
		contentWidth: 460,
		logoSize: isVeryShortHeight ? 44 : 48,
		brandSize: 30,
		heroWidth: isCompactPhone ? 304 : isVeryShortHeight ? 326 : 346,
		heroHeight: isCompactPhone ? 248 : isVeryShortHeight ? 270 : 286,
		headlineSize: isCompactPhone ? 34 : isVeryShortHeight ? 38 : 42,
		headlineLineHeight: isCompactPhone ? 38 : isVeryShortHeight ? 42 : 46,
		helperSize: isVeryShortHeight ? 15 : Math.max(16, bodyTextSize),
		helperLineHeight: isVeryShortHeight ? 22 : Math.max(24, bodyTextLineHeight),
		primaryActionHeight: entryPrimaryActionHeight,
		secondaryActionHeight: Math.max(entryPrimaryActionHeight - 4, 56),
		showChip: !isVeryShortHeight,
		stageSpacing: {
			brandToHero: isVeryShortHeight ? 14 : 22,
			heroToHeadline: isVeryShortHeight ? 16 : 22,
			headlineToHelper: 12,
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
			letterSpacing: -1.25,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "center",
			maxWidth: 320,
		},
		helper: {
			color: colors.helper,
			fontWeight: "500",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "center",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 320,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
			shadowColor: isDarkMode ? "#000000" : "#D2D8E3",
			shadowOpacity: isDarkMode ? 0.12 : 0.08,
			shadowRadius: 14,
			shadowOffset: { width: 0, height: 8 },
		},
		chipText: {
			color: colors.chipText,
			fontSize: 13,
			lineHeight: 16,
			fontWeight: "700",
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
			fontWeight: "700",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeAndroidMobileTheme;
