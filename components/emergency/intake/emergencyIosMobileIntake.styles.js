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
	const isContextPanelSurface = isIosPad || isDesktop;
	const isStackedHospitalReviewSurface =
		isWebSmWide || isWebMd || (isTablet && !isDesktop && !isIosPad);
	const stackedReviewMapMaxWidth = isWebMd
		? 620
		: isWebSmWide
			? 520
			: isIosPad
				? 640
				: isTablet
					? 600
					: 520;
	const stackedReviewCardMaxWidth = isWebMd
		? 580
		: isWebSmWide
			? 520
			: isIosPad
				? 620
				: isTablet
					? 580
					: 520;
	const stackedReviewMapMinHeight = isWebMd
		? 320
		: isWebSmWide
			? 280
			: isIosPad
				? 360
				: isTablet
					? 320
					: 280;
	const stackedReviewMapMaxHeight = isWebMd
		? 420
		: isWebSmWide
			? 360
			: isIosPad
				? 480
				: isTablet
					? 420
					: 360;
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
	const webBottomBuffer = isWebMobile
		? Math.max(insetsBottom, isVeryShortHeight ? 30 : 14)
		: isWebWideChooseLocation
			? Math.max(insetsBottom, isVeryShortHeight ? 20 : 12)
			: 0;
	const bottomPadding = isAndroidMobile
		? insetsBottom + (isVeryShortHeight ? 18 : 24)
		: isWebMobile || isWebWideChooseLocation
			? webBottomBuffer
			: insetsBottom + (isDesktop ? 28 : isTablet ? 24 : isVeryShortHeight ? 18 : 24);
	const stageMinHeight = Math.max(viewportHeight - topPadding - bottomPadding, 0);

	const metrics = {
		topPadding,
		bottomPadding,
		stageMinHeight,
		contentMaxWidth: isDesktop
			? 1120
			: isIosPad
				? 1040
				: isWebMd
					? 720
					: isWebSmWide
						? 560
						: isTablet
							? 860
							: isAndroidMobile
							? 460
							: isWebMobile
								? 420
								: 430,
		centerClusterMaxWidth: isDesktop
			? 720
			: isWebMd
				? 680
				: isWebSmWide
					? 540
					: isTablet
						? 620
						: isAndroidMobile
							? 460
							: isWebMobile
								? 420
								: 430,
		locationPreviewMaxWidth: isDesktop
			? 720
			: isWebMd
				? 560
				: isWebSmWide
					? 460
					: isTablet
						? 620
						: isAndroidMobile
							? 460
							: isWebMobile
								? 340
								: 430,
		actionMaxWidth: isDesktop
			? 420
			: isWebMd
				? 560
				: isWebSmWide
					? 500
					: isTablet
						? 460
						: isAndroidMobile
							? 460
							: isWebMobile
								? 420
								: 430,
		reviewSheetMaxWidth: isDesktop
			? 480
			: isWebMd
				? 560
				: isWebSmWide
					? 500
					: isIosPad
						? 600
						: isTablet
							? 560
							: 430,
		heroImageWidth: isDesktop ? 268 : isTablet ? 236 : isCompactPhone ? 194 : 214,
		heroImageHeight: isDesktop ? 190 : isTablet ? 168 : isCompactPhone ? 138 : 152,
		headlineSize: isDesktop ? 46 : isTablet ? 40 : isCompactPhone ? 30 : 34,
		headlineLineHeight: isDesktop ? 50 : isTablet ? 44 : isCompactPhone ? 34 : 38,
		helperSize: isDesktop ? 18 : 17,
		helperLineHeight: isDesktop ? 26 : 24,
		actionTopGap: isStackedHospitalReviewSurface
			? (isVeryShortHeight ? 20 : 26)
			: isVeryShortHeight
				? 26
				: 32,
		primaryHeight: isDesktop ? 62 : isWebSmWide ? 58 : isTablet ? 60 : isCompactPhone ? 56 : 60,
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
			maxWidth: isIosPad ? 1040 : 980,
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
			gap: isIosPad ? 18 : isDesktop ? 28 : 20,
			paddingBottom: isIosPad ? 0 : 8,
		},
		reviewSplitMapPanel: {
			flex: isIosPad ? 1.52 : 1,
			position: "relative",
			overflow: "hidden",
			borderRadius: isIosPad ? 30 : isDesktop ? 40 : 34,
			backgroundColor: isDarkMode ? "#111827" : "#F3F4F6",
			minHeight: isIosPad ? 560 : isDesktop ? 540 : 440,
			shadowColor: isDarkMode ? "#000000" : "#0F172A",
			shadowOpacity: isDarkMode ? 0.14 : 0.08,
			shadowRadius: 26,
			shadowOffset: { width: 0, height: 16 },
			elevation: 0,
		},
		reviewSplitCardRail: {
			width: isIosPad ? 390 : isDesktop ? 420 : 392,
			maxWidth: isIosPad ? "41%" : "42%",
			minWidth: isIosPad ? 360 : undefined,
			justifyContent: "stretch",
		},
		reviewSplitSheet: {
			width: "100%",
			paddingBottom: 0,
			paddingHorizontal: 0,
			marginTop: 0,
			alignSelf: "stretch",
			flex: 1,
		},
		reviewStackShell: {
			flex: 1,
			width: "100%",
			alignItems: "center",
			justifyContent: "flex-end",
			gap: isIosPad ? 20 : isWebMd || isTablet ? 18 : 16,
			paddingBottom: 8,
		},
		reviewStackMapPanel: {
			width: "100%",
			maxWidth: stackedReviewMapMaxWidth,
			flex: 1,
			minHeight: stackedReviewMapMinHeight,
			maxHeight: stackedReviewMapMaxHeight,
			position: "relative",
			overflow: "hidden",
			borderRadius: isIosPad ? 36 : isWebMd || isTablet ? 34 : 30,
			backgroundColor: isDarkMode ? "#111827" : "#F3F4F6",
			shadowColor: isDarkMode ? "#000000" : "#0F172A",
			shadowOpacity: isDarkMode ? 0.14 : 0.08,
			shadowRadius: 22,
			shadowOffset: { width: 0, height: 14 },
			elevation: 0,
		},
		reviewStackCardRail: {
			width: "100%",
			maxWidth: stackedReviewCardMaxWidth,
			alignSelf: "center",
		},
		reviewStackSheet: {
			width: "100%",
			paddingHorizontal: 0,
			paddingBottom: 4,
			alignSelf: "center",
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
			paddingHorizontal: isContextPanelSurface ? 0 : 12,
			alignSelf: isContextPanelSurface ? "flex-start" : "center",
		},
		reviewPanelLead: {
			width: "100%",
			marginBottom: 16,
		},
		reviewSectionEyebrow: {
			color: colors.support,
			fontSize: 10,
			lineHeight: 12,
			fontWeight: "700",
			letterSpacing: 0.9,
			textTransform: "uppercase",
			marginBottom: 8,
		},
		reviewHeroMedia: {
			width: "100%",
			height: isIosPad ? 132 : isDesktop ? 108 : 96,
			borderRadius: 20,
			overflow: "hidden",
			justifyContent: "flex-end",
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15, 23, 42, 0.06)",
		},
		reviewHeroImage: {
			width: "100%",
			height: "100%",
		},
		reviewHeroImageScrim: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: isDarkMode ? "rgba(4, 8, 15, 0.32)" : "rgba(15, 23, 42, 0.18)",
		},
		reviewHeroFallback: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 18,
			backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.96)" : "rgba(241, 245, 249, 0.96)",
		},
		reviewHeroFallbackMonogram: {
			color: colors.headline,
			fontSize: isIosPad ? 34 : 30,
			lineHeight: isIosPad ? 38 : 34,
			fontWeight: "800",
			letterSpacing: -1,
		},
		reviewHeroFallbackCaption: {
			marginTop: 8,
			color: colors.helper,
			fontSize: 13,
			lineHeight: 18,
			fontWeight: "500",
			textAlign: "center",
		},
		reviewHeroBadge: {
			position: "absolute",
			top: 10,
			left: 10,
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
			paddingHorizontal: 9,
			paddingVertical: 5,
			borderRadius: 999,
			backgroundColor: "rgba(2, 6, 23, 0.42)",
		},
		reviewHeroBadgeText: {
			color: "#F8FAFC",
			fontSize: 10,
			lineHeight: 12,
			fontWeight: "700",
			letterSpacing: 0.15,
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
			paddingTop: isContextPanelSurface ? 18 : isWebMd || isIosPad ? 14 : 10,
			paddingHorizontal: isIosPad ? 22 : isContextPanelSurface ? 20 : isStackedHospitalReviewSurface ? 18 : 16,
			paddingBottom: isContextPanelSurface ? 20 : isStackedHospitalReviewSurface ? 16 : 14,
			alignItems: isContextPanelSurface ? "stretch" : "center",
			justifyContent: "flex-start",
			width: "100%",
			flex: isContextPanelSurface ? 1 : 0,
			borderRadius: isIosPad ? 28 : isWebMd ? 30 : isWebSmWide ? 28 : 30,
			backgroundColor: isDarkMode
				? "rgba(9, 14, 24, 0.64)"
				: "rgba(255, 255, 255, 0.82)",
			shadowColor: isDarkMode ? "#000000" : "#0F172A",
			shadowOpacity: isDarkMode ? 0.12 : 0.06,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 12 },
			elevation: 0,
		},
		reviewActions: {
			width: "100%",
			marginTop: isContextPanelSurface ? "auto" : isStackedHospitalReviewSurface ? 18 : 20,
			paddingTop: isContextPanelSurface ? 24 : 0,
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
			paddingHorizontal: isStackedHospitalReviewSurface ? 0 : isCompactPhone ? 12 : 14,
			paddingBottom: isStackedHospitalReviewSurface ? 4 : 10,
			marginTop: "auto",
			alignSelf: "center",
		},
		reviewEtaCard: {
			width: "100%",
			paddingVertical: 14,
			paddingHorizontal: 18,
			borderRadius: 22,
			backgroundColor: isDarkMode
				? "rgba(255,255,255,0.045)"
				: "rgba(15, 23, 42, 0.035)",
			alignItems: isContextPanelSurface ? "flex-start" : "center",
			justifyContent: "center",
			shadowColor: isDarkMode ? "#000000" : COLORS.brandPrimary,
			shadowOpacity: isDarkMode ? 0.08 : 0.04,
			shadowRadius: 14,
			shadowOffset: { width: 0, height: 8 },
			elevation: 0,
		},
		reviewCopyBlock: {
			marginTop: isContextPanelSurface ? 18 : 16,
			width: "100%",
			alignItems: isContextPanelSurface ? "flex-start" : "center",
		},
		reviewHeadline: {
			color: colors.headline,
			fontSize: isDesktop ? 30 : isTablet ? 28 : isWebMd ? 28 : isWebSmWide ? 27 : isCompactPhone ? 24 : 26,
			lineHeight: isDesktop ? 34 : isTablet ? 32 : isWebMd ? 32 : isWebSmWide ? 31 : isCompactPhone ? 28 : 30,
			fontWeight: "800",
			letterSpacing: -0.7,
			textAlign: isContextPanelSurface ? "left" : "center",
			maxWidth: isContextPanelSurface ? "100%" : isDesktop ? 400 : isTablet ? 360 : isWebMd ? 420 : isWebSmWide ? 380 : 308,
		},
		reviewHelper: {
			marginTop: 8,
			color: colors.helper,
			fontSize: isDesktop ? 16 : isWebMd ? 15 : 15,
			lineHeight: isDesktop ? 22 : isWebMd ? 21 : 20,
			fontWeight: "400",
			textAlign: isContextPanelSurface ? "left" : "center",
			maxWidth: isContextPanelSurface ? "100%" : isDesktop ? 380 : isTablet ? 340 : isWebMd ? 400 : isWebSmWide ? 350 : 290,
		},
		reviewEtaLabel: {
			color: colors.support,
			fontSize: 11,
			lineHeight: 14,
			fontWeight: "700",
			letterSpacing: 1.1,
			textTransform: "uppercase",
		},
		reviewEtaValue: {
			marginTop: 8,
			color: colors.headline,
			fontSize: isIosPad ? 40 : isDesktop ? 38 : isTablet ? 36 : isWebMd ? 36 : isCompactPhone ? 32 : 34,
			lineHeight: isIosPad ? 44 : isDesktop ? 42 : isTablet ? 40 : isWebMd ? 40 : isCompactPhone ? 36 : 38,
			fontWeight: "800",
			letterSpacing: -1,
		},
		reviewMetaRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: isContextPanelSurface ? "flex-start" : "center",
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
		reviewSummaryList: {
			width: "100%",
			marginTop: 18,
			gap: 10,
		},
		reviewHospitalMetaRow: {
			width: "100%",
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		reviewHospitalMetaChip: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 10,
			paddingVertical: 7,
			borderRadius: 999,
			backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15, 23, 42, 0.045)",
		},
		reviewHospitalMetaText: {
			color: colors.helper,
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "600",
		},
		reviewSummaryRow: {
			width: "100%",
			paddingVertical: 2,
		},
		reviewSummaryLabel: {
			color: colors.support,
			fontSize: 12,
			lineHeight: 16,
			fontWeight: "600",
			letterSpacing: 0.1,
		},
		reviewSummaryValue: {
			marginTop: 2,
			color: colors.headline,
			fontSize: 14,
			lineHeight: 20,
			fontWeight: "600",
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
