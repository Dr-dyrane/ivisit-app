import { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import getViewportSurfaceMetrics from "../../utils/ui/viewportSurfaceMetrics";
import { getMapPlatformMotion } from "./tokens/mapMotionTokens";
import { getMapSheetTokens } from "./tokens/mapSheetTokens";
import { createMapSheetPanResponder } from "./mapSheetShell.gestures";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
} from "./core/mapViewportConfig";
import { getMapSheetHeight, MAP_SHEET_SNAP_STATES } from "./core/mapSheet.constants";
import {
	getMapSheetContentPadding,
	getMapSheetHostLayout,
	getMapSheetSidebarShapeStyle,
	getResolvedMapSheetState,
} from "./mapSheetShell.helpers";

export function useMapSheetShell({
	sheetHeight,
	snapState,
	presentationMode = "sheet",
	shellWidth = null,
	allowedSnapStates = null,
	onHandlePress,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const isAndroid = Platform.OS === "android";
	const platformMotion = useMemo(() => getMapPlatformMotion(Platform.OS), []);
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const viewportVariant = useMemo(
		() => getMapViewportVariant({ platform: Platform.OS, width }),
		[width],
	);
	const surfaceConfig = useMemo(
		() => getMapViewportSurfaceConfig(viewportVariant),
		[viewportVariant],
	);
	const useFloatingShell =
		presentationMode !== "sheet" && Number.isFinite(shellWidth) && shellWidth > 0;
	const viewportMetrics = useMemo(
		() =>
			getViewportSurfaceMetrics({
				width,
				height,
				platform: Platform.OS,
				presentationMode: presentationMode === "sheet" ? "sheet" : "modal",
			}),
		[height, presentationMode, width],
	);
	const {
		isSidebar,
		resolvedSnapState,
		isCollapsed,
		shouldUseHeaderGestureRegion,
		shouldUseBodyGestureRegion,
	} = useMemo(
		() =>
			getResolvedMapSheetState({
				presentationMode,
				snapState,
				platformMotion,
			}),
		[presentationMode, platformMotion, snapState],
	);
	const sheetHeightValue = useRef(new Animated.Value(sheetHeight)).current;
	const sheetHeightValueRef = useRef(sheetHeight);
	const hasMountedRef = useRef(false);
	const snapSpringConfig = useMemo(
		() => ({
			...platformMotion.sheet.spring,
			overshootClamping: isAndroid,
		}),
		[isAndroid, platformMotion],
	);
	const getHeightForSnapState = useMemo(
		() => (state) => getMapSheetHeight(height, state),
		[height],
	);
	const collapsedHeight = getHeightForSnapState(MAP_SHEET_SNAP_STATES.COLLAPSED);
	const halfHeight = getHeightForSnapState(MAP_SHEET_SNAP_STATES.HALF);
	const expandedHeight = getHeightForSnapState(MAP_SHEET_SNAP_STATES.EXPANDED);
	const sheetChromeProgress = sheetHeightValue.interpolate({
		inputRange: [collapsedHeight, halfHeight, expandedHeight],
		outputRange: [0, 1, 2],
		extrapolate: "clamp",
	});

	useEffect(() => {
		if (!hasMountedRef.current) {
			sheetHeightValue.setValue(sheetHeight);
			sheetHeightValueRef.current = sheetHeight;
			hasMountedRef.current = true;
			return;
		}

		sheetHeightValueRef.current = sheetHeight;
		Animated.spring(sheetHeightValue, {
			toValue: sheetHeight,
			useNativeDriver: false,
			...snapSpringConfig,
		}).start();
	}, [sheetHeight, sheetHeightValue, snapSpringConfig]);

	const sideInset = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [
			Math.max(viewportMetrics.map.sheetSideInset + 2, 14),
			viewportMetrics.map.sheetSideInset,
			0,
		],
	});
	const bottomInset = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [18, tokens.islandMargin, 0],
	});
	const topRadius = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [
			Math.max(viewportMetrics.radius.sheet - 2, 28),
			viewportMetrics.radius.sheet,
			Math.max(viewportMetrics.radius.sheet - 2, 28),
		],
	});
	const bottomRadius = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [
			Math.max(viewportMetrics.radius.sheet - 2, 28),
			viewportMetrics.radius.sheet,
			0,
		],
	});
	const handleWidth = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [
			Math.max(viewportMetrics.map.handleWidth + 4, 46),
			viewportMetrics.map.handleWidth,
			Math.max(viewportMetrics.map.handleWidth - 2, 42),
		],
	});
	const horizontalPadding = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [0, 0, 0],
	});
	const topPadding = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [2, 6, 8],
	});
	const bottomPadding = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [4, 10, 12],
	});
	const handleBottomMargin = sheetChromeProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [3, 6, 7],
	});

	const panResponder = useMemo(
		() =>
			createMapSheetPanResponder({
				allowedSnapStates,
				isSidebar,
				getHeightForSnapState,
				platformMotion,
				resolvedSnapState,
				onHandlePress,
				sheetHeightValue,
				sheetHeightValueRef,
				snapSpringConfig,
			}),
		[
			allowedSnapStates,
			getHeightForSnapState,
			isSidebar,
			onHandlePress,
			platformMotion,
			resolvedSnapState,
			sheetHeightValue,
			snapSpringConfig,
		],
	);

	const sidebarShapeStyle = useMemo(
		() => getMapSheetSidebarShapeStyle(viewportMetrics.radius.sheet),
		[viewportMetrics.radius.sheet],
	);
	const radiusStyle = isSidebar
		? null
		: {
				borderTopLeftRadius: topRadius,
				borderTopRightRadius: topRadius,
				borderBottomLeftRadius: bottomRadius,
				borderBottomRightRadius: bottomRadius,
			};
	const hostLayoutStyle = getMapSheetHostLayout({
		isSidebar,
		useFloatingShell,
		shellWidth,
		sideInset,
		bottomInset,
		sheetHeight: sheetHeightValue,
		insets,
		viewportHeight: height,
		sidebarOuterInset: surfaceConfig.sidebarOuterInset ?? 14,
		sidebarTopInset: surfaceConfig.sidebarTopInset ?? 14,
		sidebarBottomInset: surfaceConfig.sidebarBottomInset ?? 14,
		sidebarMaxHeightRatio: surfaceConfig.sidebarMaxHeightRatio ?? 0.92,
	});
	const { contentPaddingTop, contentPaddingBottom } = getMapSheetContentPadding({
		isSidebar,
		topPadding,
		bottomPadding,
		insets,
		sidebarTopInset: surfaceConfig.sidebarTopInset ?? 14,
		sidebarBottomInset: surfaceConfig.sidebarBottomInset ?? 14,
		sidebarContentTopPadding: surfaceConfig.sidebarContentTopPadding ?? 6,
		sidebarContentBottomPadding: surfaceConfig.sidebarContentBottomPadding ?? 6,
	});

	return {
		blurTint: isDarkMode ? "dark" : "light",
		contentStyle: {
			paddingHorizontal: horizontalPadding,
			paddingTop: contentPaddingTop,
			paddingBottom: contentPaddingBottom,
		},
		handleStyle: {
			width: handleWidth,
			backgroundColor: tokens.handleColor,
			height: viewportMetrics.map.handleHeight,
			marginBottom: handleBottomMargin,
		},
		hostLayoutStyle,
		isAndroid,
		isCollapsed,
		isSidebar,
		panResponder,
		radiusStyle,
		resolvedSnapState,
		sidebarShapeStyle,
		shouldUseBodyGestureRegion,
		shouldUseHeaderGestureRegion,
		tokens,
		underlayStyle: isSidebar
			? {
					...sidebarShapeStyle,
					backgroundColor: tokens.glassUnderlay,
				}
			: {
					...radiusStyle,
					backgroundColor: tokens.glassUnderlay,
				},
		clipStyle: isSidebar
			? {
					...sidebarShapeStyle,
					backgroundColor: isAndroid ? tokens.glassSurface : "transparent",
				}
			: {
					...radiusStyle,
					backgroundColor: isAndroid ? tokens.glassSurface : "transparent",
				},
		backdropStyle: isSidebar
			? {
					...sidebarShapeStyle,
					backgroundColor: tokens.glassBackdrop,
				}
			: {
					...radiusStyle,
					backgroundColor: tokens.glassBackdrop,
				},
		overlayStyle: isSidebar
			? {
					...sidebarShapeStyle,
					backgroundColor: tokens.glassOverlay,
				}
			: {
					...radiusStyle,
					backgroundColor: tokens.glassOverlay,
				},
		useFloatingShell,
	};
}
