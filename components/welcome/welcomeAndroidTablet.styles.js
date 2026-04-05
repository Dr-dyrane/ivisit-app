import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import {
	getWelcomeAmbientGeometry,
	getWelcomeThemePalette,
} from "../../constants/welcomeTheme";

export function createWelcomeAndroidTabletTheme({
	isDarkMode,
	isShortHeight,
	horizontalPadding,
	insetsTop,
	insetsBottom,
	entryPrimaryActionHeight,
}) {
	const colors = {
		...getWelcomeThemePalette({ isDarkMode, profile: "android" }),
		panel: isDarkMode ? "rgba(11, 18, 32, 0.52)" : "rgba(255,255,255,0.58)",
		ring: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)",
	};
	const ambient = getWelcomeAmbientGeometry({
		surface: "android-tablet",
		isDarkMode,
	});

	const metrics = {
		topPadding: insetsTop + (isShortHeight ? 24 : 40),
		bottomPadding: insetsBottom + 28,
		stageWidth: 1080,
		leftColumnWidth: 420,
		logoSize: 52,
		brandSize: 34,
		heroWidth: 460,
		heroHeight: 360,
		headlineSize: 54,
		headlineLineHeight: 58,
		helperSize: 20,
		helperLineHeight: 30,
		primaryActionHeight: Math.max(entryPrimaryActionHeight, 64),
		secondaryActionHeight: 58,
		stageSpacing: {
			brandToHeadline: 30,
			headlineToHelper: 16,
			helperToChip: 16,
			chipToActions: 34,
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
			justifyContent: "center",
			backgroundColor: colors.backgroundBase,
		},
		stage: {
			width: "100%",
			maxWidth: metrics.stageWidth,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			columnGap: 44,
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
			letterSpacing: -1,
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
			letterSpacing: -1.55,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			textAlign: "left",
			maxWidth: 420,
		},
		helper: {
			color: colors.helper,
			fontWeight: "500",
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			textAlign: "left",
			marginTop: metrics.stageSpacing.headlineToHelper,
			maxWidth: 400,
		},
		chip: {
			marginTop: metrics.stageSpacing.helperToChip,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 999,
			backgroundColor: colors.chipBackground,
			shadowColor: isDarkMode ? "#000000" : "#D2D8E3",
			shadowOpacity: isDarkMode ? 0.12 : 0.08,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: 8 },
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
			maxWidth: 400,
			marginTop: metrics.stageSpacing.chipToActions,
			gap: metrics.stageSpacing.actionGap,
		},
		signInPressable: {
			marginTop: metrics.stageSpacing.signInTop,
			alignItems: "flex-start",
		},
		signInText: {
			color: colors.support,
			fontSize: 17,
			lineHeight: 23,
			fontWeight: "700",
			opacity: isDarkMode ? 0.84 : 0.88,
			textAlign: "left",
		},
		heroPanel: {
			flex: 1,
			minHeight: metrics.heroHeight + 56,
			borderRadius: 40,
			backgroundColor: colors.panel,
			justifyContent: "center",
			alignItems: "center",
			shadowColor: isDarkMode ? "#000000" : "#CBD5E1",
			shadowOpacity: isDarkMode ? 0.16 : 0.1,
			shadowRadius: 24,
			shadowOffset: { width: 0, height: 16 },
			overflow: "hidden",
		},
		heroRing: {
			position: "absolute",
			width: metrics.heroWidth * 0.9,
			height: metrics.heroWidth * 0.9,
			borderRadius: 999,
			backgroundColor: colors.ring,
			opacity: isDarkMode ? 0.08 : 0.42,
		},
		heroImage: {
			width: metrics.heroWidth,
			height: metrics.heroHeight,
		},
	});

	return { colors, metrics, styles };
}

export default createWelcomeAndroidTabletTheme;
