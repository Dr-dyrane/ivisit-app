import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeAndroidFoldTheme({
	isDarkMode,
	isShortHeight,
	horizontalPadding,
	insetsTop,
	insetsBottom,
	entryPrimaryActionHeight,
}) {
	const colors = getWelcomeThemePalette({ isDarkMode, profile: "android" });
	const ambient = getWelcomeAmbientGeometry({
		surface: "android-fold",
		isDarkMode,
	});

	const metrics = {
		topPadding: insetsTop + (isShortHeight ? 18 : 28),
		bottomPadding: insetsBottom + 28,
		stageWidth: 820,
		logoSize: 52,
		brandSize: 32,
		heroWidth: isShortHeight ? 360 : 420,
		heroHeight: isShortHeight ? 290 : 330,
		headlineSize: isShortHeight ? 46 : 54,
		headlineLineHeight: isShortHeight ? 50 : 58,
		helperSize: 18,
		helperLineHeight: 28,
		primaryActionHeight: Math.max(entryPrimaryActionHeight, 62),
		secondaryActionHeight: 58,
		stageSpacing: {
			brandToHero: isShortHeight ? 18 : 24,
			heroToHeadline: isShortHeight ? 20 : 26,
			headlineToHelper: 14,
			helperToChip: 16,
			chipToActions: isShortHeight ? 26 : 30,
			actionGap: 12,
			signInTop: 18,
		},
	};

	const styles = StyleSheet.create({
		gradient: { flex: 1, backgroundColor: colors.backgroundBase },
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
			backgroundColor: colors.backgroundBase,
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			alignItems: "center",
			backgroundColor: colors.backgroundBase,
		},
		brandBlock: { alignItems: "center" },
		logo: { width: metrics.logoSize, height: metrics.logoSize },
		brandText: {
			marginTop: 12,
			color: colors.brand,
			fontWeight: "900",
			letterSpacing: -1,
			fontSize: metrics.brandSize,
			textAlign: "center",
		},
		brandDot: { color: COLORS.brandPrimary, fontSize: metrics.brandSize + 2 },
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
			maxWidth: 520,
		},
		helper: {
			color: colors.helper,
			fontWeight: "500",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "center",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 480,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 16,
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
			fontSize: 17,
			lineHeight: 23,
			fontWeight: "700",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeAndroidFoldTheme;
