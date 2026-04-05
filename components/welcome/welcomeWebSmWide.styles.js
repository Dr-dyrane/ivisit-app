import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeEntrySpacing,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeWebSmWideTheme({
	viewportHeight = 820,
	viewportWidth = 640,
	isDarkMode = true,
} = {}) {
	const colors = {
		...getWelcomeThemePalette({ isDarkMode }),
		chipBackground: isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(255,255,255,0.74)",
		bottomGlow: isDarkMode ? "#14253F" : "#E8EEF8",
	};
	const ambient = getWelcomeAmbientGeometry({
		surface: "web-sm-wide",
		isDarkMode,
	});
	const entrySpacing = getWelcomeEntrySpacing({
		profile: "web",
		isVeryShortHeight: viewportHeight < 720,
	});

	const metrics = {
		viewportHeight,
		showChip: viewportHeight >= 720,
		stageWidth: Math.min(Math.max(viewportWidth - 56, 420), 560),
		topPadding: viewportHeight < 720 ? 28 : 34,
		bottomPadding: 24,
		logoSize: 48,
		brandSize: 29,
		heroWidth: Math.min(Math.max(viewportWidth * 0.46, 248), 320),
		heroHeight: Math.min(Math.max(viewportWidth * 0.36, 194), 252),
		headlineSize: 44,
		headlineLineHeight: 48,
		helperSize: 17,
		helperLineHeight: 25,
		primaryActionHeight: 60,
		secondaryActionHeight: 56,
		stageSpacing: {
			brandToHero: viewportHeight < 720 ? 22 : 28,
			heroToHeadline: 18,
			headlineToHelper: 12,
			helperToChip: entrySpacing.helperToChip,
			chipToActionWell: entrySpacing.chipToActionWell + 6,
			actionWellMinHeight: Math.max(entrySpacing.actionWellMinHeight, 84),
			actionGap: entrySpacing.actionGap,
			signInTop: entrySpacing.signInTop + 2,
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
			paddingHorizontal: 28,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			alignItems: "center",
			backgroundColor: "transparent",
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			minHeight:
				metrics.viewportHeight - metrics.topPadding - metrics.bottomPadding,
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
			letterSpacing: -1.25,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "center",
			maxWidth: 460,
		},
		helper: {
			color: colors.helper,
			fontWeight: "600",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "center",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 420,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 16,
			paddingVertical: 9,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
		},
		chipText: {
			color: colors.chipText,
			fontSize: 14,
			lineHeight: 18,
			fontWeight: "700",
			letterSpacing: 0.2,
		},
		actionWell: {
			width: "100%",
			flexGrow: 1,
			minHeight: metrics.stageSpacing.actionWellMinHeight,
			marginTop: metrics.stageSpacing.chipToActionWell,
			justifyContent: "flex-end",
			alignItems: "center",
		},
		actions: {
			width: "100%",
			maxWidth: 460,
			gap: metrics.stageSpacing.actionGap,
			alignItems: "center",
		},
		primaryActionSlot: {
			width: "100%",
			maxWidth: 460,
		},
		secondaryActionSlot: {
			width: "100%",
			maxWidth: 420,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "center",
		},
		signInText: {
			color: colors.support,
			fontSize: 16,
			lineHeight: 22,
			fontWeight: "700",
			opacity: 0.84,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeWebSmWideTheme;
