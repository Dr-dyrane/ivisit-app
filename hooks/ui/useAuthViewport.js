import { Platform, useWindowDimensions } from "react-native";
import {
	DEVICE_BREAKPOINTS,
	VIEWPORT_BREAKPOINTS,
} from "../../constants/breakpoints";
import useWebViewportMetrics from "./useWebViewportMetrics";

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
		horizontalPadding: isDesktop ? 40 : isTablet ? 32 : 24,
		contentMaxWidth: isDesktop ? 1160 : isTablet ? 820 : width,
		textMaxWidth: isDesktop ? 620 : isTablet ? 560 : width,
		authPanelMaxWidth: isDesktop ? 560 : isTablet ? 520 : width,
		legalMaxWidth: isDesktop ? 520 : isTablet ? 480 : width,
		heroImageWidth: isDesktop ? 420 : isTablet ? 360 : Math.min(width - 64, 340),
		heroImageHeight: isDesktop ? 300 : isTablet ? 260 : Math.min((width - 64) * 0.72, 240),
		welcomeTitleSize: isDesktop ? 58 : isTablet ? 48 : isCompactPhone ? 32 : 40,
		welcomeTitleLineHeight: isDesktop ? 62 : isTablet ? 52 : isCompactPhone ? 36 : 44,
		authTitleSize: isDesktop ? 56 : isTablet ? 50 : isCompactPhone ? 38 : 44,
		authTitleLineHeight: isDesktop ? 60 : isTablet ? 54 : isCompactPhone ? 42 : 48,
		bodyTextSize: isDesktop ? 18 : isTablet ? 17 : 16,
		bodyTextLineHeight: isDesktop ? 28 : isTablet ? 26 : 24,
		ctaMaxWidth: isDesktop ? 340 : isTablet ? 360 : width,
		surfaceMaxWidth: isDesktop ? 620 : isTablet ? 560 : width,
		screenVerticalPadding: isDesktop ? 40 : isTablet ? 32 : 24,
		modalMode: isDialog ? "dialog" : "sheet",
		modalMaxWidth: isDesktop ? 560 : isTablet ? 520 : width,
		modalHeight: isDialog ? Math.min(height * 0.82, 820) : Math.min(height * 0.88, height - 24),
		modalContentPadding: isDesktop ? 40 : isTablet ? 32 : isCompactPhone ? 20 : 24,
		modalRadius: isDialog ? 36 : 32,
		entryStageMaxWidth: isLargeMonitor ? 1180 : isDesktop ? 1040 : isTablet ? 860 : width,
		entryContentMaxWidth: isDesktop ? 520 : isTablet ? 540 : width,
		entryActionMaxWidth: isDesktop ? 420 : isTablet ? 480 : width,
		entryTopPadding: isDesktop
			? (isShortHeight ? 40 : 72)
			: isTablet
				? (isShortHeight ? 28 : 44)
				: isVeryShortHeight
					? 12
					: isShortHeight
						? 20
						: 32,
		entryBottomPadding: isDesktop ? 40 : isTablet ? 28 : isVeryShortHeight ? 12 : 20,
		entryPrimaryActionHeight: isDesktop ? 64 : isTablet ? 62 : isCompactPhone ? 56 : 60,
	};
}

export default useAuthViewport;
