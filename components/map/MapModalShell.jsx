import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	Easing,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { HEADER_MODES } from "../../constants/header";
import {
	MAP_MODAL_BACKDROP_IN_MS,
	MAP_MODAL_BACKDROP_OUT_MS,
	MAP_MODAL_EXIT_MS,
} from "./mapMotionTokens";
import { getMapSheetHeight, MAP_SHEET_SNAP_STATES } from "./mapSheet.constants";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
} from "./mapViewportConfig";
import { styles } from "./mapModalShell.styles";

const APPLE_MODAL_EASE = Easing.bezier(0.21, 0.47, 0.32, 0.98);

export default function MapModalShell({
	visible,
	onClose,
	title = null,
	minHeightRatio = 0.78,
	maxHeightRatio = 0.9,
	matchExpandedSheetHeight = true,
	topClearance = null,
	showHandle = false,
	scrollEnabled = true,
	contentContainerStyle,
	closeOnBackdropPress = Platform.OS !== "web",
	headerModeWhenVisible = HEADER_MODES.HIDDEN,
	syncHeaderVisibility = true,
	children,
}) {
	const { isDarkMode } = useTheme();
	const { lockHeaderHidden, unlockHeaderHidden, forceHeaderVisible } = useScrollAwareHeader();
	const insets = useSafeAreaInsets();
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const isWeb = Platform.OS === "web";
	const viewportVariant = getMapViewportVariant({ platform: Platform.OS, width: screenWidth });
	const surfaceConfig = getMapViewportSurfaceConfig(viewportVariant);
	const isDrawer = surfaceConfig.modalPresentationMode === "left-drawer";
	const resolvedCloseOnBackdropPress = closeOnBackdropPress || isDrawer;
	const [shouldRender, setShouldRender] = useState(visible);
	const slideAnim = useRef(new Animated.Value(screenHeight)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!syncHeaderVisibility) {
			return undefined;
		}

		if (visible && headerModeWhenVisible === HEADER_MODES.HIDDEN) {
			lockHeaderHidden();
			return () => {
				unlockHeaderHidden();
				forceHeaderVisible();
			};
		}

		unlockHeaderHidden();
		if (visible || headerModeWhenVisible !== HEADER_MODES.HIDDEN) {
			forceHeaderVisible();
		}
		return undefined;
	}, [
		forceHeaderVisible,
		headerModeWhenVisible,
		lockHeaderHidden,
		syncHeaderVisibility,
		unlockHeaderHidden,
		visible,
	]);

	useEffect(() => {
		const closedOffset = isDrawer
			? -(surfaceConfig.drawerMaxWidth || surfaceConfig.sidebarMaxWidth || screenWidth) - 24
			: screenHeight;
		if (visible) {
			setShouldRender(true);
			if (!shouldRender) {
				slideAnim.setValue(closedOffset);
			}
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 320,
					easing: APPLE_MODAL_EASE,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: MAP_MODAL_BACKDROP_IN_MS,
					easing: APPLE_MODAL_EASE,
					useNativeDriver: true,
				}),
			]).start();
			return undefined;
		}

		if (!shouldRender) {
			return undefined;
		}

		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: closedOffset,
				duration: MAP_MODAL_EXIT_MS,
				easing: APPLE_MODAL_EASE,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: MAP_MODAL_BACKDROP_OUT_MS,
				easing: APPLE_MODAL_EASE,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setShouldRender(false);
			}
		});

		return undefined;
	}, [bgOpacity, isDrawer, screenHeight, screenWidth, shouldRender, slideAnim, surfaceConfig.drawerMaxWidth, surfaceConfig.sidebarMaxWidth, visible]);

	if (!shouldRender) return null;

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const surfaceColor = isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(255, 255, 255, 0.88)";
	const closeBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const handleColor = isDarkMode ? "rgba(148,163,184,0.54)" : "rgba(100,116,139,0.30)";
	const expandedSheetHeight = getMapSheetHeight(screenHeight, MAP_SHEET_SNAP_STATES.EXPANDED);
	const resolvedTopClearance = topClearance ?? surfaceConfig.topClearance;
	const hostWidth = isDrawer
		? Math.min(
				surfaceConfig.drawerMaxWidth || surfaceConfig.sidebarMaxWidth || Math.max(360, screenWidth * 0.44),
				Math.max(320, screenWidth - 48),
			)
		: screenWidth;
	const hostLeft = isDrawer ? 0 : 0;
	const hostBottom = isDrawer ? 0 : 0;
	const modalRadius = surfaceConfig.modalCornerRadius;
	const viewportMaxHeight = isDrawer
		? screenHeight
		: Math.max(
				360,
				screenHeight - insets.top - resolvedTopClearance - hostBottom,
			);
	const resolvedHeight = isDrawer
		? screenHeight
		: matchExpandedSheetHeight
			? Math.min(expandedSheetHeight, viewportMaxHeight)
			: Math.min(screenHeight * maxHeightRatio, viewportMaxHeight);
	const minHeight = isDrawer
		? screenHeight
		: matchExpandedSheetHeight
			? resolvedHeight
			: Math.min(screenHeight * minHeightRatio, resolvedHeight);
	const maxHeight = resolvedHeight;
	const surfaceShapeStyle = isDrawer
		? {
				borderTopLeftRadius: 0,
				borderTopRightRadius: modalRadius,
				borderBottomLeftRadius: 0,
				borderBottomRightRadius: modalRadius,
			}
		: {
				borderTopLeftRadius: modalRadius,
				borderTopRightRadius: modalRadius,
				borderBottomLeftRadius: 0,
				borderBottomRightRadius: 0,
			};
	const modalContent = (
		<View
			style={[
				styles.sheetSurface,
				surfaceShapeStyle,
				{
					backgroundColor: surfaceColor,
					minHeight,
					maxHeight,
					paddingTop: isDrawer ? insets.top + 12 : 14,
					paddingBottom: insets.bottom + 18,
				},
			]}
		>
			{showHandle && !isDrawer ? (
				<View style={styles.handleWrap}>
					<View style={[styles.handle, { backgroundColor: handleColor }]} />
				</View>
			) : null}

			<View style={styles.headerRow}>
				{title ? (
					<Text style={[styles.headerTitle, { color: titleColor }]}>{title}</Text>
				) : (
					<View style={styles.headerSpacer} />
				)}
				<Pressable onPress={onClose}>
					{({ pressed }) => (
						<View
							style={[
								styles.closeButton,
								{
									backgroundColor: closeBg,
									opacity: pressed ? 0.82 : 1,
									transform: [{ scale: pressed ? 0.96 : 1 }],
								},
							]}
						>
							<Ionicons name="close" size={18} color={titleColor} />
						</View>
					)}
				</Pressable>
			</View>

			{scrollEnabled ? (
				<ScrollView
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					scrollEnabled={scrollEnabled}
					contentContainerStyle={[styles.content, contentContainerStyle]}
				>
					{children}
				</ScrollView>
			) : (
				<View style={[styles.content, contentContainerStyle]}>
					{children}
				</View>
			)}
		</View>
	);

	return (
		<View style={styles.root} pointerEvents="box-none">
			<Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}> 
				<Pressable
					style={styles.backdrop}
					onPress={resolvedCloseOnBackdropPress ? onClose : undefined}
				/>
			</Animated.View>

			<Animated.View
				style={[
					styles.sheetHost,
					surfaceShapeStyle,
					isDrawer
						? {
								width: hostWidth,
								left: hostLeft,
								right: undefined,
								top: 0,
								bottom: 0,
							}
						: {
								left: 0,
								right: 0,
								bottom: 0,
							},
					{
						transform: isDrawer ? [{ translateX: slideAnim }] : [{ translateY: slideAnim }],
					},
				]}
			>
				{isWeb ? (
					<View style={[styles.sheetBlur, surfaceShapeStyle]}>{modalContent}</View>
				) : (
					<BlurView
						intensity={isDarkMode ? 44 : 56}
						tint={isDarkMode ? "dark" : "light"}
						style={[styles.sheetBlur, surfaceShapeStyle]}
					>
						{modalContent}
					</BlurView>
				)}
			</Animated.View>
		</View>
	);
}
