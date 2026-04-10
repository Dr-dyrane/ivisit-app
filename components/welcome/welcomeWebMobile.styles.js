import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeEntrySpacing,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeWebMobileTheme({
	viewportHeight = 760,
	isDarkMode = true,
	isShortHeight = false,
	isVeryShortHeight = false,
} = {}) {
	const resolvedVeryShortHeight = isVeryShortHeight || viewportHeight < 680;
	const resolvedShortHeight = isShortHeight || viewportHeight < 780;
	const colors = {
		...getWelcomeThemePalette({ isDarkMode }),
		chipBackground: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.74)",
		bottomGlow: isDarkMode ? "#14253F" : "#E8EEF8",
	};
	const ambient = getWelcomeAmbientGeometry({
		surface: "web-mobile",
		isDarkMode,
	});
	const entrySpacing = getWelcomeEntrySpacing({
		profile: "web",
		isVeryShortHeight: resolvedVeryShortHeight,
	});

	const metrics = {
		viewportHeight,
		showChip: !resolvedShortHeight,
		topPadding: resolvedVeryShortHeight ? 14 : resolvedShortHeight ? 18 : 24,
		bottomPadding: resolvedVeryShortHeight ? 14 : resolvedShortHeight ? 16 : 20,
		logoSize: resolvedVeryShortHeight ? 42 : resolvedShortHeight ? 44 : 46,
		brandSize: resolvedShortHeight ? 26 : 28,
		heroWidth: resolvedVeryShortHeight ? 286 : resolvedShortHeight ? 300 : 320,
		heroHeight: resolvedVeryShortHeight ? 220 : resolvedShortHeight ? 236 : 256,
		headlineSize: resolvedVeryShortHeight ? 34 : resolvedShortHeight ? 36 : 40,
		headlineLineHeight: resolvedVeryShortHeight ? 38 : resolvedShortHeight ? 40 : 44,
		helperSize: resolvedShortHeight ? 15 : 16,
		helperLineHeight: resolvedShortHeight ? 22 : 24,
		primaryActionHeight: 60,
		secondaryActionHeight: 56,
		stageSpacing: {
			brandToHero: resolvedVeryShortHeight ? 12 : resolvedShortHeight ? 16 : 24,
			heroToHeadline: resolvedVeryShortHeight ? 10 : resolvedShortHeight ? 12 : 16,
			helperToChip: entrySpacing.helperToChip,
			chipToActionWell: resolvedVeryShortHeight
				? Math.min(entrySpacing.chipToActionWell, 18)
				: resolvedShortHeight
					? Math.min(entrySpacing.chipToActionWell, 22)
					: entrySpacing.chipToActionWell,
			actionWellMinHeight: resolvedVeryShortHeight
				? Math.min(entrySpacing.actionWellMinHeight, 12)
				: resolvedShortHeight
					? Math.min(entrySpacing.actionWellMinHeight, 28)
					: entrySpacing.actionWellMinHeight,
			actionGap: entrySpacing.actionGap,
			signInTop: entrySpacing.signInTop,
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
			paddingHorizontal: 20,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			alignItems: "stretch",
			backgroundColor: "transparent",
		},
		stage: {
			width: "100%",
			minHeight: metrics.viewportHeight - metrics.topPadding - metrics.bottomPadding,
			alignSelf: "stretch",
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
			letterSpacing: -1.2,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "center",
			maxWidth: 320,
		},
		helper: {
			color: colors.helper,
			fontWeight: "400",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "center",
			marginTop: resolvedShortHeight ? 10 : 12,
			maxWidth: 320,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
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
			fontSize: 15,
			lineHeight: 22,
			fontWeight: "600",
			opacity: 0.84,
			textAlign: "center",
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeWebMobileTheme;
