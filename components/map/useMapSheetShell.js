import { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { getMapPlatformMotion } from "./mapMotionTokens";
import { getMapSheetTokens } from "./mapSheetTokens";
import { createMapSheetPanResponder } from "./mapSheetShell.gestures";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
} from "./mapViewportConfig";
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
	onHandlePress,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
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
	const {
		isSidebar,
		resolvedSnapState,
		isCollapsed,
		snapTarget,
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
	const snapProgress = useRef(new Animated.Value(snapTarget)).current;
	const dragTranslateY = useRef(new Animated.Value(0)).current;
	const hasMountedRef = useRef(false);
	const snapSpringConfig = useMemo(
		() => ({
			...platformMotion.sheet.spring,
			overshootClamping: isAndroid,
		}),
		[isAndroid, platformMotion],
	);

	useEffect(() => {
		if (!hasMountedRef.current) {
			snapProgress.setValue(snapTarget);
			hasMountedRef.current = true;
			return;
		}

		Animated.spring(snapProgress, {
			toValue: snapTarget,
			useNativeDriver: false,
			...snapSpringConfig,
		}).start();
	}, [snapProgress, snapSpringConfig, snapTarget]);

	useEffect(() => {
		dragTranslateY.stopAnimation((currentValue) => {
			if (Math.abs(currentValue) < 0.5) {
				dragTranslateY.setValue(0);
				return;
			}

			Animated.spring(dragTranslateY, {
				toValue: 0,
				useNativeDriver: false,
				...snapSpringConfig,
			}).start();
		});
	}, [dragTranslateY, snapSpringConfig, snapState]);

	const sideInset = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [16, tokens.islandMargin, 0],
	});
	const bottomInset = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [18, tokens.islandMargin, 0],
	});
	const topRadius = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [34, tokens.sheetRadius, 34],
	});
	const bottomRadius = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [34, tokens.sheetRadius, 0],
	});
	const handleWidth = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [54, 48, 46],
	});
	const horizontalPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [0, 0, 0],
	});
	const topPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [2, 6, 8],
	});
	const bottomPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [4, 10, 12],
	});
	const handleBottomMargin = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [3, 6, 7],
	});

	const panResponder = useMemo(
		() =>
			createMapSheetPanResponder({
				isSidebar,
				dragTranslateY,
				platformMotion,
				resolvedSnapState,
				onHandlePress,
				snapSpringConfig,
			}),
		[dragTranslateY, isSidebar, onHandlePress, platformMotion, resolvedSnapState, snapSpringConfig],
	);

	const sidebarShapeStyle = useMemo(
		() => getMapSheetSidebarShapeStyle(tokens.sheetRadius),
		[tokens.sheetRadius],
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
		sheetHeight,
		dragTranslateY,
		insets,
		sidebarOuterInset: surfaceConfig.sidebarOuterInset ?? 18,
		sidebarTopInset: surfaceConfig.sidebarTopInset ?? 18,
		sidebarBottomInset: surfaceConfig.sidebarBottomInset ?? 18,
	});
	const { contentPaddingTop, contentPaddingBottom } = getMapSheetContentPadding({
		isSidebar,
		topPadding,
		bottomPadding,
		sidebarContentTopPadding: surfaceConfig.sidebarContentTopPadding ?? 8,
		sidebarContentBottomPadding: surfaceConfig.sidebarContentBottomPadding ?? 10,
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
