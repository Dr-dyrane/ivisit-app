import { StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

export function createEmergencyIosMobileIntakeTheme({
	isDarkMode,
	isCompactPhone,
	isAndroidMobile = false,
	isWebMobile = false,
	isWebSmWide = false,
	isWebMd = false,
	isTablet = false,
	isIosPad = false,
	isDesktop = false,
	isVeryShortHeight,
	horizontalPadding,
	insetsTop,
	insetsBottom,
	viewportHeight,
	headerOffset = 0,
}) {
	const colors = isDarkMode
		? {
			backgroundGradient: [COLORS.bgDark, "#0D1422", COLORS.bgDarkAlt],
			backgroundBase: COLORS.bgDark,
			headline: "#F8FAFC",
			helper: "#B5C0D2",
			support: "#8EA0B8",
			caption: "#728198",
		}
		: {
			backgroundGradient: [COLORS.bgLight, "#FBF5F3", "#F5F7FB"],
			backgroundBase: COLORS.bgLight,
			headline: "#111827",
			helper: "#5E687B",
			support: "#748095",
			caption: "#7C879A",
		};

	const isWebWideChooseLocation = isWebSmWide || isWebMd;
	const pageHorizontalPadding = isWebMobile
		? 16
		: isWebSmWide
			? 20
			: isWebMd
				? 24
				: horizontalPadding;

	const topPadding = isAndroidMobile
		? headerOffset + (isVeryShortHeight ? 8 : 16)
		: isWebMobile
			? (isVeryShortHeight ? 28 : 34)
		: isWebWideChooseLocation
			? (isVeryShortHeight ? 30 : 38)
		: headerOffset +
			(isDesktop ? 40 : isTablet ? 32 : isVeryShortHeight ? 18 : 30);
	const bottomPadding = isAndroidMobile
		? insetsBottom + (isVeryShortHeight ? 18 : 24)
		: isWebMobile
			? (isVeryShortHeight ? 12 : 16)
		: insetsBottom + (isDesktop ? 28 : isTablet ? 24 : isVeryShortHeight ? 18 : 24);
	const stageMinHeight = Math.max(viewportHeight - topPadding - bottomPadding, 0);

	const metrics = {
		topPadding,
		bottomPadding,
		stageMinHeight,
		contentMaxWidth: isDesktop ? 1120 : isTablet ? 860 : isAndroidMobile ? 460 : isWebMobile ? 420 : 430,
		centerClusterMaxWidth: isDesktop ? 720 : isTablet ? 620 : isAndroidMobile ? 460 : isWebMobile ? 420 : 430,
		locationPreviewMaxWidth: isDesktop ? 720 : isTablet ? 620 : isAndroidMobile ? 460 : isWebMobile ? 340 : 430,
		actionMaxWidth: isDesktop ? 420 : isTablet ? 440 : isAndroidMobile ? 460 : isWebMobile ? 420 : 430,
		reviewSheetMaxWidth: isDesktop ? 480 : isTablet ? 520 : 430,
		heroImageWidth: isDesktop ? 268 : isTablet ? 236 : isCompactPhone ? 194 : 214,
		heroImageHeight: isDesktop ? 190 : isTablet ? 168 : isCompactPhone ? 138 : 152,
		headlineSize: isDesktop ? 46 : isTablet ? 40 : isCompactPhone ? 30 : 34,
		headlineLineHeight: isDesktop ? 50 : isTablet ? 44 : isCompactPhone ? 34 : 38,
		helperSize: isDesktop ? 18 : 17,
		helperLineHeight: isDesktop ? 26 : 24,
		actionTopGap: isVeryShortHeight ? 26 : 32,
		primaryHeight: isDesktop ? 62 : isTablet ? 60 : isCompactPhone ? 56 : 60,
	};

	const ambient = {
		findingHaloOuterSize: metrics.heroImageWidth + 188,
		findingHaloMiddleSize: metrics.heroImageWidth + 132,
		findingHaloInnerSize: metrics.heroImageWidth + 88,
		findingHaloOuterCoreColor: isDarkMode ? "#7F1D1D" : "#DC2626",
		findingHaloMiddleCoreColor: isDarkMode ? "#991B1B" : "#DC2626",
		findingHaloInnerCoreColor: isDarkMode ? "#B91C1C" : "#B91C1C",
		findingPulseMinOpacity: 0.2,
		findingPulseMaxOpacity: 0.46,
		findingPulseMinScale: 0.98,
		findingPulseMaxScale: 1.1,
	};

	const styles = StyleSheet.create({
		gradient: {
			flex: 1,
			backgroundColor: colors.backgroundBase,
		},
		scrollContent: {
			flexGrow: 1,
			paddingTop: metrics.topPadding,
			paddingBottom: metrics.bottomPadding,
			paddingHorizontal: pageHorizontalPadding,
		},
		padScrollContent: {
			justifyContent: "stretch",
		},
		stage: {
			minHeight: metrics.stageMinHeight,
			width: "100%",
			maxWidth: metrics.contentMaxWidth,
			alignSelf: "center",
			alignItems: "center",
		},
		padStage: {
			maxWidth: 980,
			alignItems: "stretch",
		},
		reviewStage: {
			justifyContent: "flex-end",
			overflow: "hidden",
			borderRadius: isDesktop ? 44 : isTablet ? 40 : 36,
		},
		reviewSplitShell: {
			flex: 1,
			width: "100%",
			flexDirection: "row",
			alignItems: "stretch",
			justifyContent: "center",
			gap: isDesktop ? 28 : 20,
			paddingBottom: 8,
		},
		reviewSplitMapPanel: {
			flex: 1,
			position: "relative",
			overflow: "hidden",
			borderRadius: isDesktop ? 40 : 34,
			backgroundColor: isDarkMode ? "#111827" : "#F3F4F6",
			minHeight: isDesktop ? 540 : 440,
			shadowColor: isDarkMode ? "#000000" : "#0F172A",
			shadowOpacity: isDarkMode ? 0.14 : 0.08,
			shadowRadius: 26,
			shadowOffset: { width: 0, height: 16 },
			elevation: 0,
		},
		reviewSplitCardRail: {
			width: isDesktop ? 420 : 392,
			maxWidth: "42%",
			justifyContent: "flex-end",
		},
		reviewSplitSheet: {
			width: "100%",
			paddingBottom: 0,
			paddingHorizontal: 0,
			marginTop: 0,
			alignSelf: "stretch",
		},
		centeredStateLayer: {
			flex: 1,
			width: "100%",
			justifyContent: "flex-start",
			alignItems: "center",
			paddingTop: isDesktop
				? 24
				: isWebWideChooseLocation
					? (isVeryShortHeight ? 14 : 18)
				: isTablet
					? 18
					: isWebMobile
						? (isVeryShortHeight ? 14 : 20)
						: isVeryShortHeight
							? 6
							: 14,
		},
		padCenteredStateLayer: {
			justifyContent: "space-between",
			paddingTop: isVeryShortHeight ? 4 : 10,
			paddingBottom: 4,
		},
		reviewLayer: {
			...StyleSheet.absoluteFillObject,
			justifyContent: "flex-end",
		},
		committedLayer: {
			...StyleSheet.absoluteFillObject,
			overflow: "hidden",
			borderRadius: isDesktop ? 44 : isTablet ? 40 : 36,
		},
		committedMapScrim: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: isDarkMode
				? "rgba(11, 15, 26, 0.10)"
				: "rgba(255, 255, 255, 0.06)",
		},
		centerCluster: {
			width: "100%",
			maxWidth: metrics.centerClusterMaxWidth,
			flexShrink: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		padCenterCluster: {
			maxWidth: 900,
			alignItems: "stretch",
			flexGrow: 1,
			flexShrink: 1,
			justifyContent: "flex-start",
		},
		padHeroCopyRow: {
			width: "100%",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			columnGap: 24,
		},
		padHeroRail: {
			width: 296,
			alignItems: "center",
			justifyContent: "center",
		},
		padCopyRail: {
			flex: 1,
			minHeight: 196,
			justifyContent: "center",
		},
		heroBlock: {
			alignItems: "center",
			justifyContent: "center",
			marginTop: isDesktop ? 28 : isTablet ? 22 : isVeryShortHeight ? 10 : 18,
			marginBottom: isDesktop ? 28 : isTablet ? 26 : isVeryShortHeight ? 16 : 24,
		},
		padHeroBlock: {
			marginTop: 0,
			marginBottom: 0,
		},
		findingHeroAmbient: {
			position: "absolute",
			alignItems: "center",
			justifyContent: "center",
		},
		findingHeroHaloOuter: {
			position: "absolute",
			width: ambient.findingHaloOuterSize,
			height: ambient.findingHaloOuterSize,
		},
		findingHeroHaloMiddle: {
			position: "absolute",
			width: ambient.findingHaloMiddleSize,
			height: ambient.findingHaloMiddleSize,
		},
		findingHeroHaloInner: {
			position: "absolute",
			width: ambient.findingHaloInnerSize,
			height: ambient.findingHaloInnerSize,
		},
		heroImage: {
			width: metrics.heroImageWidth,
			height: metrics.heroImageHeight,
		},
		padHeroImage: {
			width: isIosPad ? 268 : metrics.heroImageWidth,
			height: isIosPad ? 190 : metrics.heroImageHeight,
		},
		copyBlock: {
			marginTop: isDesktop ? 28 : isTablet ? 24 : isWebMobile ? 10 : isVeryShortHeight ? 18 : 22,
			width: "100%",
			alignItems: "center",
			minHeight: 92,
		},
		padCopyBlock: {
			marginTop: 0,
			alignItems: "flex-start",
			minHeight: 0,
		},
		locationPreviewWrap: {
			width: "100%",
			maxWidth: metrics.locationPreviewMaxWidth,
			marginTop: 0,
			height: isDesktop ? 272 : isTablet ? 248 : isVeryShortHeight ? 188 : 224,
			borderRadius: 26,
			overflow: "hidden",
			backgroundColor: isDarkMode ? "#111827" : "#F3F4F6",
			borderWidth: 4,
			borderColor: "transparent",
			shadowColor: isDarkMode ? "#000000" : COLORS.brandPrimary,
			shadowOpacity: isDarkMode ? 0.1 : 0.06,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 10 },
			elevation: 0,
		},
		padLocationPreviewWrap: {
			maxWidth: "100%",
			width: "100%",
			height: isVeryShortHeight ? 212 : 258,
			marginTop: 22,
		},
		locationPreviewSkeleton: {
			width: "100%",
			maxWidth: metrics.locationPreviewMaxWidth,
			marginTop: 0,
			height: isDesktop ? 272 : isTablet ? 248 : isVeryShortHeight ? 188 : 224,
			borderRadius: 26,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.05)"
				: "rgba(15, 23, 42, 0.035)",
			overflow: "hidden",
		},
		padLocationPreviewSkeleton: {
			maxWidth: "100%",
			width: "100%",
			height: isVeryShortHeight ? 212 : 258,
			marginTop: 22,
		},
		copySkeleton: {
			width: "100%",
			alignItems: "center",
			justifyContent: "center",
			minHeight: 92,
		},
		padCopySkeleton: {
			alignItems: "flex-start",
			justifyContent: "center",
			minHeight: 0,
		},
		headlineSkeleton: {
			width: isCompactPhone ? 214 : 238,
			height: isCompactPhone ? 28 : 32,
			borderRadius: 16,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.08)"
				: "rgba(15, 23, 42, 0.08)",
		},
		padHeadlineSkeleton: {
			width: 320,
			height: 40,
		},
		helperSkeleton: {
			marginTop: 14,
			width: isCompactPhone ? 162 : 182,
			height: 18,
			borderRadius: 12,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.06)"
				: "rgba(15, 23, 42, 0.06)",
		},
		padHelperSkeleton: {
			width: 260,
			height: 20,
		},
		headline: {
			color: colors.headline,
			fontSize: metrics.headlineSize,
			lineHeight: metrics.headlineLineHeight,
			fontWeight: "900",
			letterSpacing: -1.1,
			textAlign: "center",
			maxWidth: isDesktop ? 620 : isTablet ? 520 : 320,
		},
		padHeadline: {
			fontSize: 44,
			lineHeight: 48,
			textAlign: "left",
			maxWidth: 400,
		},
		helper: {
			marginTop: 12,
			color: colors.helper,
			fontSize: metrics.helperSize,
			lineHeight: metrics.helperLineHeight,
			fontWeight: "400",
			textAlign: "center",
			maxWidth: isDesktop ? 560 : isTablet ? 460 : 280,
		},
		padHelper: {
			marginTop: 14,
			fontSize: 19,
			lineHeight: 27,
			textAlign: "left",
			maxWidth: 400,
		},
		quietLink: {
			marginTop: 16,
			alignSelf: "center",
		},
		padQuietLink: {
			marginTop: 18,
		},
		reviewQuietLink: {
			marginTop: 18,
			paddingVertical: 10,
			paddingHorizontal: 12,
			alignSelf: "center",
		},
		quietLinkText: {
			color: colors.helper,
			fontSize: 14,
			lineHeight: 18,
			fontWeight: "600",
		},
		actionWell: {
			justifyContent: "flex-end",
			marginTop: isWebMobile || isWebWideChooseLocation ? 8 : isVeryShortHeight ? 10 : 14,
			width: "100%",
			maxWidth: metrics.actionMaxWidth,
			minHeight: isWebMobile || isWebWideChooseLocation ? 96 : isVeryShortHeight ? 104 : 118,
			alignSelf: "center",
		},
		padActionWell: {
			maxWidth: 440,
			marginTop: 18,
			minHeight: 108,
		},
		loadingWell: {
			paddingTop: 8,
			alignItems: "center",
			justifyContent: "center",
		},
		padLoadingWell: {
			width: "100%",
		},
		primarySkeleton: {
			width: "100%",
			height: metrics.primaryHeight,
			borderRadius: 999,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.09)"
				: "rgba(15, 23, 42, 0.08)",
		},
		quietLinkSkeleton: {
			marginTop: 16,
			width: 116,
			height: 16,
			borderRadius: 10,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.06)"
				: "rgba(15, 23, 42, 0.06)",
		},
		findingWell: {
			paddingTop: 8,
			alignItems: "center",
			justifyContent: "center",
		},
		padFindingWell: {
			paddingTop: 0,
		},
		matchedWell: {
			paddingTop: 8,
			alignItems: "center",
			justifyContent: "center",
		},
		reviewWell: {
			paddingTop: 12,
			paddingHorizontal: 14,
			paddingBottom: 16,
			alignItems: "center",
			justifyContent: "center",
			width: "100%",
			borderRadius: 34,
			backgroundColor: isDarkMode
				? "rgba(11, 15, 26, 0.38)"
				: "rgba(255, 255, 255, 0.60)",
			shadowColor: isDarkMode ? "#000000" : "#0F172A",
			shadowOpacity: isDarkMode ? 0.08 : 0.04,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 10 },
			elevation: 0,
		},
		reviewActions: {
			width: "100%",
			marginTop: 24,
		},
		matchedProgressWrap: {
			width: "100%",
			marginTop: 18,
			paddingHorizontal: 8,
		},
		matchedProgressTrack: {
			width: "100%",
			height: 6,
			borderRadius: 999,
			overflow: "hidden",
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.10)"
				: "rgba(15, 23, 42, 0.08)",
		},
		matchedProgressFill: {
			height: "100%",
			borderRadius: 999,
			backgroundColor: COLORS.brandPrimary,
		},
		reviewSheet: {
			width: "100%",
			maxWidth: metrics.reviewSheetMaxWidth,
			paddingHorizontal: isCompactPhone ? 8 : 10,
			paddingBottom: 8,
			marginTop: "auto",
			alignSelf: "center",
		},
		reviewEtaCard: {
			width: "100%",
			paddingVertical: 18,
			paddingHorizontal: 22,
			borderRadius: 28,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.06)"
				: "rgba(15, 23, 42, 0.04)",
			alignItems: "center",
			justifyContent: "center",
			shadowColor: isDarkMode ? "#000000" : COLORS.brandPrimary,
			shadowOpacity: isDarkMode ? 0.14 : 0.07,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 12 },
			elevation: 0,
		},
		reviewCopyBlock: {
			marginTop: 18,
			width: "100%",
			alignItems: "center",
		},
		reviewHeadline: {
			color: colors.headline,
			fontSize: isDesktop ? 32 : isTablet ? 30 : isCompactPhone ? 26 : 28,
			lineHeight: isDesktop ? 36 : isTablet ? 34 : isCompactPhone ? 30 : 32,
			fontWeight: "900",
			letterSpacing: -0.9,
			textAlign: "center",
			maxWidth: isDesktop ? 380 : isTablet ? 340 : 300,
		},
		reviewHelper: {
			marginTop: 10,
			color: colors.helper,
			fontSize: isDesktop ? 17 : 16,
			lineHeight: isDesktop ? 24 : 22,
			fontWeight: "400",
			textAlign: "center",
			maxWidth: isDesktop ? 360 : isTablet ? 320 : 280,
		},
		reviewEtaLabel: {
			color: colors.support,
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "800",
			letterSpacing: 1.2,
			textTransform: "uppercase",
		},
		reviewEtaValue: {
			marginTop: 10,
			color: colors.headline,
			fontSize: isDesktop ? 42 : isTablet ? 40 : isCompactPhone ? 34 : 38,
			lineHeight: isDesktop ? 46 : isTablet ? 44 : isCompactPhone ? 38 : 42,
			fontWeight: "900",
			letterSpacing: -1.2,
		},
		reviewMetaRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "center",
			gap: 10,
			marginTop: 16,
			marginBottom: 18,
		},
		reviewMetaChip: {
			paddingHorizontal: 14,
			paddingVertical: 9,
			borderRadius: 999,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.07)"
				: "rgba(15, 23, 42, 0.05)",
		},
		reviewMetaText: {
			color: colors.helper,
			fontSize: 13,
			lineHeight: 18,
			fontWeight: "500",
			textAlign: "center",
		},
		matchedEtaCard: {
			width: "100%",
			paddingVertical: 20,
			paddingHorizontal: 22,
			borderRadius: 28,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.06)"
				: "rgba(15, 23, 42, 0.04)",
			alignItems: "center",
			justifyContent: "center",
			shadowColor: isDarkMode ? "#000000" : COLORS.brandPrimary,
			shadowOpacity: isDarkMode ? 0.16 : 0.08,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 12 },
			elevation: 0,
		},
		matchedEtaLabel: {
			color: colors.support,
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "800",
			letterSpacing: 1.2,
			textTransform: "uppercase",
		},
		matchedEtaValue: {
			marginTop: 10,
			color: colors.headline,
			fontSize: isDesktop ? 42 : isTablet ? 40 : isCompactPhone ? 34 : 38,
			lineHeight: isDesktop ? 46 : isTablet ? 44 : isCompactPhone ? 38 : 42,
			fontWeight: "900",
			letterSpacing: -1.2,
		},
		matchedMetaRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "center",
			gap: 10,
			marginTop: 16,
		},
		matchedMetaChip: {
			paddingHorizontal: 14,
			paddingVertical: 9,
			borderRadius: 999,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.07)"
				: "rgba(15, 23, 42, 0.05)",
		},
		matchedMetaText: {
			color: colors.helper,
			fontSize: 13,
			lineHeight: 18,
			fontWeight: "500",
			textAlign: "center",
		},
		findingRail: {
			width: 184,
			height: 6,
			borderRadius: 999,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.08)"
				: "rgba(15, 23, 42, 0.08)",
			overflow: "hidden",
			justifyContent: "center",
		},
		padFindingRail: {
			width: 244,
			height: 7,
		},
		findingRailIndicator: {
			width: 74,
			height: 6,
			borderRadius: 999,
			backgroundColor: COLORS.brandPrimary,
		},
		padFindingRailIndicator: {
			width: 96,
			height: 7,
		},
		findingStatusText: {
			marginTop: 14,
			color: colors.helper,
			fontSize: 14,
			lineHeight: 20,
			fontWeight: "500",
			textAlign: "center",
			maxWidth: 260,
		},
		padFindingStatusText: {
			marginTop: 16,
			fontSize: 16,
			lineHeight: 22,
			maxWidth: 320,
		},
	});

	return { colors, metrics, ambient, styles };
}

export default createEmergencyIosMobileIntakeTheme;
