import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	PanResponder,
	Platform,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../../contexts/ThemeContext";
import { MAP_SHEET_SNAP_INDEX, MAP_SHEET_SNAP_STATES, getNextMapSheetSnapStateDown, getNextMapSheetSnapStateUp } from "./mapSheet.constants";
import { MAP_SHEET_SNAP_SPRING } from "./mapMotionTokens";
import { getMapSheetTokens } from "./mapSheetTokens";
import styles from "./mapSheetShell.styles";

export default function MapSheetShell({
	sheetHeight,
	snapState,
	presentationMode = "sheet",
	shellWidth = null,
	topSlot = null,
	footerSlot = null,
	onHandlePress,
	children,
}) {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const useFloatingShell =
		presentationMode !== "sheet" && Number.isFinite(shellWidth) && shellWidth > 0;
	const snapProgress = useRef(
		new Animated.Value(
			MAP_SHEET_SNAP_INDEX[snapState] ?? MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF],
		),
	).current;
	const dragTranslateY = useRef(new Animated.Value(0)).current;
	const hasMountedRef = useRef(false);
	const snapTarget =
		MAP_SHEET_SNAP_INDEX[snapState] ??
		MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF];
	const snapSpringConfig = useMemo(
		() => ({
			...MAP_SHEET_SNAP_SPRING,
			overshootClamping: isAndroid,
		}),
		[isAndroid],
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
			PanResponder.create({
				onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
				onPanResponderGrant: () => {
					dragTranslateY.stopAnimation();
				},
				onPanResponderMove: (_, gestureState) => {
					const rawDy = gestureState.dy;
					const minDy = snapState === MAP_SHEET_SNAP_STATES.EXPANDED ? 0 : -220;
					const maxDy = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED ? 0 : 180;
					const clampedDy = Math.max(minDy, Math.min(maxDy, rawDy));
					dragTranslateY.setValue(clampedDy);
				},
				onPanResponderRelease: (_, gestureState) => {
					const { dy, vy } = gestureState;
					let nextState = snapState;

					if (dy <= -44 || vy <= -0.28) {
						nextState = getNextMapSheetSnapStateUp(snapState);
					} else if (dy >= 44 || vy >= 0.28) {
						nextState = getNextMapSheetSnapStateDown(snapState);
					}

					if (nextState !== snapState) {
						onHandlePress?.(nextState);
					} else {
						Animated.spring(dragTranslateY, {
							toValue: 0,
							useNativeDriver: false,
							...snapSpringConfig,
						}).start();
					}
				},
				onPanResponderTerminate: () => {
					Animated.spring(dragTranslateY, {
						toValue: 0,
						useNativeDriver: false,
						...snapSpringConfig,
					}).start();
				},
			}),
		[dragTranslateY, onHandlePress, snapSpringConfig, snapState],
	);

	return (
		<Animated.View
			renderToHardwareTextureAndroid={isAndroid}
			needsOffscreenAlphaCompositing={isAndroid}
			style={[
				styles.sheetHost,
				useFloatingShell ? styles.sheetHostFloating : null,
				presentationMode === "modal" ? styles.sheetHostModal : null,
				presentationMode === "panel" ? styles.sheetHostPanel : null,
				tokens.shadowStyle,
				{
					left: useFloatingShell ? undefined : sideInset,
					right: useFloatingShell ? undefined : sideInset,
					width: useFloatingShell ? shellWidth : undefined,
					bottom: bottomInset,
					height: sheetHeight,
					borderTopLeftRadius: topRadius,
					borderTopRightRadius: topRadius,
					borderBottomLeftRadius: bottomRadius,
					borderBottomRightRadius: bottomRadius,
					transform: [{ translateY: dragTranslateY }],
				},
			]}
		>
			{isAndroid ? (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.sheetUnderlay,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassUnderlay,
						},
					]}
				/>
			) : null}

			<Animated.View
				renderToHardwareTextureAndroid={isAndroid}
				needsOffscreenAlphaCompositing={isAndroid}
				style={[
					styles.sheetClip,
					{
						borderTopLeftRadius: topRadius,
						borderTopRightRadius: topRadius,
						borderBottomLeftRadius: bottomRadius,
						borderBottomRightRadius: bottomRadius,
						backgroundColor: isAndroid ? tokens.glassSurface : "transparent",
					},
				]}
			>
				{Platform.OS === "ios" ? (
					<BlurView
						intensity={tokens.blurIntensity}
						tint={isDarkMode ? "dark" : "light"}
						style={StyleSheet.absoluteFill}
					/>
				) : null}

				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassBackdrop,
						},
					]}
				/>
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassOverlay,
						},
					]}
				/>

				<Animated.View
					style={[
						styles.sheetContent,
						{
							paddingHorizontal: horizontalPadding,
							paddingTop: topPadding,
							paddingBottom: bottomPadding,
						},
					]}
				>
					<View {...panResponder.panHandlers} style={styles.dragZone}>
						<Pressable
							onPress={() => onHandlePress?.()}
							hitSlop={isCollapsed ? { top: 14, bottom: 14, left: 16, right: 16 } : 12}
							style={[
								styles.handleTapTarget,
								isCollapsed ? styles.handleTapTargetCollapsed : null,
							]}
						>
							<Animated.View
								style={[
									styles.handle,
									{
										width: handleWidth,
										backgroundColor: tokens.handleColor,
										marginBottom: handleBottomMargin,
									},
								]}
							/>
						</Pressable>
					</View>
					{topSlot}
					{children ? <View style={styles.contentViewport}>{children}</View> : null}
					{footerSlot}
				</Animated.View>
			</Animated.View>
		</Animated.View>
	);
}
