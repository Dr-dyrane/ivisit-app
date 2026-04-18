import { Platform, useWindowDimensions } from "react-native";
import {
	DEVICE_BREAKPOINTS,
	VIEWPORT_BREAKPOINTS,
} from "../../constants/breakpoints";
import useWebViewportMetrics from "./useWebViewportMetrics";
import getViewportSurfaceMetrics from "../../utils/ui/viewportSurfaceMetrics";

export function useAuthViewport() {
	const { width: layoutWidth, height: layoutHeight } = useWindowDimensions();
	const webViewportMetrics = useWebViewportMetrics();
	const isWeb = Platform.OS === "web";
	const width = isWeb
		? webViewportMetrics.visibleWidth || layoutWidth
		: layoutWidth;
	const height = isWeb
		? webViewportMetrics.visibleHeight || layoutHeight
		: layoutHeight;

	const isDesktop = width >= VIEWPORT_BREAKPOINTS.nativeDesktopMin;
	const isTablet =
		width >= VIEWPORT_BREAKPOINTS.tabletMin &&
		width < VIEWPORT_BREAKPOINTS.nativeDesktopMin;
	const isTabletPortrait = isTablet && height >= width;
	const isTabletLandscape = isTablet && width > height;
	const isCompactPhone = width < DEVICE_BREAKPOINTS.compactPhone;
	const isLargePhone =
		width >= DEVICE_BREAKPOINTS.largePhone &&
		width < VIEWPORT_BREAKPOINTS.tabletMin;
	const isLargeMonitor = width >= VIEWPORT_BREAKPOINTS.largeMonitorMin;
	const isShortHeight = height < 780;
	const isVeryShortHeight = height < 680;
	const isDialog = width >= VIEWPORT_BREAKPOINTS.tabletMin;
	const sharedMetrics = getViewportSurfaceMetrics({
		width,
		height,
		platform: Platform.OS,
		presentationMode: isDialog ? "modal" : "sheet",
	});

	return {
		width,
		height,
		layoutWidth,
		layoutHeight,
		visibleWidth: width,
		visibleHeight: height,
		isWeb,
		isStandalonePWA: isWeb ? webViewportMetrics.isStandalonePWA : false,
		isIosBrowser: isWeb ? webViewportMetrics.isIosBrowser : false,
		isAndroidBrowser: isWeb ? webViewportMetrics.isAndroidBrowser : false,
		isBrowserChromeConstrained: isWeb
			? webViewportMetrics.isBrowserChromeConstrained
			: false,
		browserInsetTop: isWeb ? webViewportMetrics.topInset : 0,
		browserInsetRight: isWeb ? webViewportMetrics.rightInset : 0,
		browserInsetBottom: isWeb ? webViewportMetrics.bottomInset : 0,
		browserInsetLeft: isWeb ? webViewportMetrics.leftInset : 0,
		isDesktop,
		isTablet,
		isTabletPortrait,
		isTabletLandscape,
		isCompactPhone,
		isLargePhone,
		isLargeMonitor,
		isShortHeight,
		isVeryShortHeight,
		isDialog,
		horizontalPadding: sharedMetrics.insets.horizontal,
		contentMaxWidth: isDesktop ? sharedMetrics.welcome.stageMaxWidth : width,
		textMaxWidth: isDesktop ? sharedMetrics.welcome.contentMaxWidth : width,
		authPanelMaxWidth: isDesktop ? 560 : isTablet ? 520 : width,
		legalMaxWidth: isDesktop ? 520 : isTablet ? 480 : width,
		heroImageWidth: isDesktop
			? Math.min(sharedMetrics.welcome.heroWidth, 420)
			: isTablet
				? Math.min(sharedMetrics.welcome.heroWidth, 360)
				: Math.min(width - sharedMetrics.insets.contentHorizontal * 2, sharedMetrics.welcome.heroWidth),
		heroImageHeight: isDesktop
			? Math.min(sharedMetrics.welcome.heroHeight, 300)
			: isTablet
				? Math.min(sharedMetrics.welcome.heroHeight, 260)
				: Math.min(sharedMetrics.welcome.heroHeight, 240),
		welcomeTitleSize: isDesktop
			? Math.min(sharedMetrics.type.headline, 58)
			: isTablet
				? Math.min(sharedMetrics.type.headline, 48)
				: isCompactPhone
					? Math.min(sharedMetrics.type.headline, 32)
					: Math.min(sharedMetrics.type.headline, 40),
		welcomeTitleLineHeight: isDesktop
			? Math.min(sharedMetrics.type.headlineLineHeight, 62)
			: isTablet
				? Math.min(sharedMetrics.type.headlineLineHeight, 52)
				: isCompactPhone
					? Math.min(sharedMetrics.type.headlineLineHeight, 36)
					: Math.min(sharedMetrics.type.headlineLineHeight, 44),
		authTitleSize: isDesktop ? 56 : isTablet ? 50 : isCompactPhone ? 38 : 44,
		authTitleLineHeight: isDesktop ? 60 : isTablet ? 54 : isCompactPhone ? 42 : 48,
		bodyTextSize: sharedMetrics.type.body,
		bodyTextLineHeight: sharedMetrics.type.bodyLineHeight,
		ctaMaxWidth: isDesktop ? 340 : isTablet ? 360 : width,
		surfaceMaxWidth: isDesktop ? 620 : isTablet ? 560 : width,
		screenVerticalPadding: sharedMetrics.insets.largeGap,
		modalMode: isDialog ? "dialog" : "sheet",
		modalMaxWidth: isDesktop ? 560 : isTablet ? 520 : width,
		modalHeight: isDialog ? Math.min(height * 0.82, 820) : Math.min(height * 0.88, height - 24),
		modalContentPadding: sharedMetrics.modal.contentPadding,
		modalRadius: sharedMetrics.radius.modal,
		entryStageMaxWidth: isLargeMonitor ? 1180 : isDesktop ? sharedMetrics.welcome.stageMaxWidth : isTablet ? 860 : width,
		entryContentMaxWidth: isDesktop ? sharedMetrics.welcome.contentMaxWidth : isTablet ? 540 : width,
		entryActionMaxWidth: isDesktop ? 420 : isTablet ? 480 : width,
		entryTopPadding: isDesktop
			? Math.max(40, sharedMetrics.welcome.topPadding)
			: isTablet
				? Math.max(28, sharedMetrics.welcome.topPadding - 8)
				: isVeryShortHeight
					? 12
					: Math.max(20, sharedMetrics.welcome.topPadding),
		entryBottomPadding: isDesktop
			? Math.max(28, sharedMetrics.welcome.bottomPadding)
			: isTablet
				? Math.max(20, sharedMetrics.welcome.bottomPadding)
				: isVeryShortHeight
					? 12
					: Math.max(18, sharedMetrics.welcome.bottomPadding),
		entryPrimaryActionHeight: sharedMetrics.cta.primaryHeight,
	};
}

export default useAuthViewport;
