import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	PanResponder,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import { useScrollAwareHeader } from "../../../contexts/ScrollAwareHeaderContext";
import useAuthViewport from "../../../hooks/ui/useAuthViewport";
import { HEADER_MODES } from "../../../constants/header";
import {
	MAP_APPLE_EASE,
	MAP_MODAL_BACKDROP_IN_MS,
	MAP_MODAL_BACKDROP_OUT_MS,
	MAP_MODAL_EXIT_MS,
	getMapPlatformMotion,
} from "../tokens/mapMotionTokens";
import {
	getMapSheetHeight,
	getNextMapSheetSnapStateDown,
	getNextMapSheetSnapStateUp,
	MAP_SHEET_SNAP_INDEX,
	MAP_SHEET_SNAP_STATES,
} from "../core/mapSheet.constants";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
} from "../core/mapViewportConfig";
import { styles } from "./mapModalShell.styles";

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
	footerSlot = null,
	closeOnBackdropPress = Platform.OS !== "web",
	headerModeWhenVisible = HEADER_MODES.HIDDEN,
	syncHeaderVisibility = true,
	defaultSnapState = null,
	enableSnapDetents = true,
	allowCollapsedState = false,
	closeFromCollapsed = true,
	children,
}) {
	const { isDarkMode } = useTheme();
	const { lockHeaderHidden, unlockHeaderHidden, forceHeaderVisible } = useScrollAwareHeader();
	const insets = useSafeAreaInsets();
	const {
		width: screenWidth,
		height: visibleScreenHeight,
		layoutHeight,
		browserInsetTop,
		browserInsetBottom,
	} = useAuthViewport();
	const isWeb = Platform.OS === "web";
	const platformMotion = useMemo(() => getMapPlatformMotion(Platform.OS), []);
	const modalMotion = platformMotion.modal;
	const screenHeight = visibleScreenHeight;
	const offscreenHeight = layoutHeight || visibleScreenHeight;
	const viewportVariant = getMapViewportVariant({ platform: Platform.OS, width: screenWidth });
	const surfaceConfig = getMapViewportSurfaceConfig(viewportVariant);
	const isDrawer = surfaceConfig.modalPresentationMode === "left-drawer";
	const drawerSideInset = isDrawer
		? Math.max(0, surfaceConfig.modalSideInset ?? surfaceConfig.sidebarOuterInset ?? 0)
		: 0;
	const drawerTopInset = isDrawer
		? Math.max(0, surfaceConfig.modalTopInset ?? surfaceConfig.sidebarTopInset ?? 0)
		: 0;
	const drawerBottomInset = isDrawer
		? Math.max(0, surfaceConfig.modalBottomInset ?? surfaceConfig.sidebarBottomInset ?? 0)
		: 0;
	const drawerWidthForMotion =
		surfaceConfig.drawerMaxWidth || surfaceConfig.sidebarMaxWidth || Math.max(360, screenWidth * 0.44);
	const resolvedCloseOnBackdropPress = closeOnBackdropPress || isDrawer;
	const enableDetents = !isDrawer && enableSnapDetents;
	const resolvedShowHandle = !isDrawer && (showHandle || enableDetents);
	const requestedDefaultSnapState = defaultSnapState ?? modalMotion.defaultSnapState;
	const resolvedDefaultSnapState = enableDetents
		? !allowCollapsedState && requestedDefaultSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED
			? MAP_SHEET_SNAP_STATES.HALF
			: requestedDefaultSnapState
		: MAP_SHEET_SNAP_STATES.EXPANDED;
	const [shouldRender, setShouldRender] = useState(visible);
	const [modalSnapState, setModalSnapState] = useState(resolvedDefaultSnapState);
	const slideAnim = useRef(new Animated.Value(screenHeight)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;
	const snapProgress = useRef(
		new Animated.Value(
			MAP_SHEET_SNAP_INDEX[resolvedDefaultSnapState] ??
				MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.EXPANDED],
		),
	).current;
	const dragTranslateY = useRef(new Animated.Value(0)).current;
	const contentScrollRef = useRef(null);
	const scrollStartOffsetYRef = useRef(0);
	const lastScrollOffsetYRef = useRef(0);
	const scrollSnapHandledRef = useRef(false);
	const wheelSnapAccumRef = useRef(0);
	const modalScrollMotion = modalMotion.scroll;
	const shouldUseHeaderGestureRegion = Boolean(modalMotion.enableHeaderGestureRegion);
	const shouldUseBodyGestureRegion =
		Boolean(modalMotion.enableBodyGestureRegion) &&
		(
			modalSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED ||
			Boolean(modalMotion.enableBodyGestureInExpandedState)
		);
	const allowScrollDetents = Boolean(modalScrollMotion.enableContentDetents);
	const allowWheelDetents = isWeb && Boolean(modalScrollMotion.enableWheelDetents);
	const SCROLL_TOP_THRESHOLD = modalScrollMotion.topThreshold;
	const SCROLL_EXPAND_OFFSET = modalScrollMotion.expandOffset;
	const SCROLL_COLLAPSE_PULL = modalScrollMotion.collapsePull;
	const SCROLL_EXPAND_VELOCITY = modalScrollMotion.expandVelocity;
	const SCROLL_COLLAPSE_VELOCITY = modalScrollMotion.collapseVelocity;
	const HALF_CLOSE_PULL_THRESHOLD = allowCollapsedState
		? SCROLL_COLLAPSE_PULL
		: SCROLL_COLLAPSE_PULL - modalScrollMotion.halfCloseExtraPull;
	const HALF_CLOSE_VELOCITY_THRESHOLD = allowCollapsedState
		? SCROLL_COLLAPSE_VELOCITY
		: SCROLL_COLLAPSE_VELOCITY * modalScrollMotion.halfCloseVelocityFactor;
	const HALF_CLOSE_WHEEL_THRESHOLD = allowCollapsedState
		? modalScrollMotion.collapsedWheelThreshold
		: modalScrollMotion.halfCloseWheelThreshold;
	const modalSpringConfig = useMemo(
		() => ({
			...modalMotion.spring,
			overshootClamping: Platform.OS === "android",
		}),
		[modalMotion],
	);

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
			? -(drawerWidthForMotion + drawerSideInset + 24)
			: offscreenHeight;
		if (visible) {
			setShouldRender(true);
			setModalSnapState(resolvedDefaultSnapState);
			scrollSnapHandledRef.current = false;
			wheelSnapAccumRef.current = 0;
			scrollStartOffsetYRef.current = 0;
			lastScrollOffsetYRef.current = 0;
			dragTranslateY.setValue(0);
			if (!shouldRender) {
				slideAnim.setValue(closedOffset);
				snapProgress.setValue(
					MAP_SHEET_SNAP_INDEX[resolvedDefaultSnapState] ??
						MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.EXPANDED],
				);
			}
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 320,
					easing: platformMotion.ease,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: MAP_MODAL_BACKDROP_IN_MS,
					easing: platformMotion.ease,
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
				easing: platformMotion.ease,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: MAP_MODAL_BACKDROP_OUT_MS,
				easing: platformMotion.ease,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setShouldRender(false);
			}
		});

		return undefined;
	}, [
		bgOpacity,
		drawerSideInset,
		drawerWidthForMotion,
		dragTranslateY,
		isDrawer,
		offscreenHeight,
		resolvedDefaultSnapState,
		shouldRender,
		slideAnim,
		snapProgress,
		surfaceConfig.drawerMaxWidth,
		surfaceConfig.sidebarMaxWidth,
		visible,
	]);

	useEffect(() => {
		if (!enableDetents || !visible) return;

		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
		scrollStartOffsetYRef.current = 0;
		lastScrollOffsetYRef.current = 0;

		Animated.spring(snapProgress, {
			toValue:
				MAP_SHEET_SNAP_INDEX[modalSnapState] ??
				MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.EXPANDED],
			useNativeDriver: false,
			...modalSpringConfig,
		}).start();
	}, [enableDetents, modalSnapState, snapProgress, visible]);

	if (!shouldRender) return null;

	const resetDetentInteractionState = () => {
		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
		scrollStartOffsetYRef.current = 0;
		lastScrollOffsetYRef.current = 0;
	};

	const resolveNextDetentDown = (currentState = modalSnapState) => {
		if (currentState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			return closeFromCollapsed ? "__close__" : MAP_SHEET_SNAP_STATES.COLLAPSED;
		}

		const nextState = getNextMapSheetSnapStateDown(currentState);
		if (!allowCollapsedState && nextState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			return closeFromCollapsed ? "__close__" : MAP_SHEET_SNAP_STATES.HALF;
		}
		return nextState;
	};

	const commitDetentState = (nextState) => {
		if (!enableDetents || !nextState) return;
		if (nextState === "__close__") {
			onClose?.();
			return;
		}
		setModalSnapState(nextState);
	};

	const triggerScrollDetent = (nextState) => {
		if (!enableDetents || scrollSnapHandledRef.current || !nextState) return;
		scrollSnapHandledRef.current = true;
		wheelSnapAccumRef.current = 0;
		contentScrollRef.current?.scrollTo?.({ y: 0, animated: false });
		commitDetentState(nextState);
	};

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const surfaceColor = isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(255, 255, 255, 0.88)";
	const closeBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const handleColor = isDarkMode ? "rgba(148,163,184,0.54)" : "rgba(100,116,139,0.30)";
	const expandedSheetHeight = getMapSheetHeight(screenHeight, MAP_SHEET_SNAP_STATES.EXPANDED);
	const resolvedTopClearance = topClearance ?? surfaceConfig.topClearance;
	const browserTopOffset = isWeb ? Math.max(0, browserInsetTop || 0) : 0;
	const browserBottomOffset = isWeb ? Math.max(0, browserInsetBottom || 0) : 0;
	const hostWidth = isDrawer
		? Math.min(
				drawerWidthForMotion,
				Math.max(320, screenWidth - drawerSideInset - 32),
			)
		: screenWidth;
	const hostLeft = isDrawer ? drawerSideInset : 0;
	const hostBottom = isDrawer ? drawerBottomInset : 0;
	const drawerSafeTopOffset = isDrawer ? Math.max(0, (insets?.top || 0) - drawerTopInset) : 0;
	const drawerSafeBottomOffset = isDrawer ? Math.max(0, (insets?.bottom || 0) - drawerBottomInset) : 0;
	const modalRadius = surfaceConfig.modalCornerRadius;
	const viewportMaxHeight = isDrawer
		? Math.max(320, screenHeight - drawerTopInset - drawerBottomInset)
		: Math.max(360, screenHeight - insets.top - resolvedTopClearance);
	const resolvedHeight = isDrawer
		? viewportMaxHeight
		: matchExpandedSheetHeight
			? Math.min(expandedSheetHeight, viewportMaxHeight)
			: Math.min(screenHeight * maxHeightRatio, viewportMaxHeight);
	const maxHeight = resolvedHeight;
	const collapsedHeight = isDrawer
		? viewportMaxHeight
		: Math.max(insets.bottom + 72, resolvedShowHandle ? 94 : 80);
	const halfHeight = isDrawer
		? viewportMaxHeight
		: Math.min(
				maxHeight - 28,
				Math.max(
					collapsedHeight + 108,
					Math.min(Math.max(320, screenHeight * 0.52), maxHeight - 72),
				),
			);
	const minHeight = enableDetents ? collapsedHeight : isDrawer
		? viewportMaxHeight
		: matchExpandedSheetHeight
			? resolvedHeight
			: Math.min(screenHeight * minHeightRatio, resolvedHeight);
	const animatedSheetHeight = enableDetents
		? snapProgress.interpolate({
				inputRange: [0, 1, 2],
				outputRange: [collapsedHeight, halfHeight, maxHeight],
			})
		: maxHeight;
	const surfaceShapeStyle = isDrawer
		? {
				borderTopLeftRadius: modalRadius,
				borderTopRightRadius: modalRadius,
				borderBottomLeftRadius: modalRadius,
				borderBottomRightRadius: modalRadius,
			}
		: {
				borderTopLeftRadius: modalRadius,
				borderTopRightRadius: modalRadius,
				borderBottomLeftRadius: 0,
				borderBottomRightRadius: 0,
			};

	const handleHandlePress = () => {
		if (!enableDetents) {
			onClose?.();
			return;
		}
		if (modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			commitDetentState(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}
		if (modalSnapState === MAP_SHEET_SNAP_STATES.HALF) {
			commitDetentState(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}
		commitDetentState(MAP_SHEET_SNAP_STATES.HALF);
	};

	const handleContentScrollBeginDrag = (event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
		scrollStartOffsetYRef.current = offsetY;
		lastScrollOffsetYRef.current = offsetY;
		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
	};

	const handleContentScroll = (event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
		lastScrollOffsetYRef.current = offsetY;

		if (offsetY > SCROLL_TOP_THRESHOLD) {
			wheelSnapAccumRef.current = 0;
		}

		if (!enableDetents || !allowScrollDetents || scrollSnapHandledRef.current) return;
		const startedNearTop = scrollStartOffsetYRef.current <= SCROLL_TOP_THRESHOLD;
		if (!startedNearTop) return;

		if (modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED && offsetY > 14) {
			triggerScrollDetent(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}

		if (modalSnapState === MAP_SHEET_SNAP_STATES.HALF && offsetY > SCROLL_EXPAND_OFFSET) {
			triggerScrollDetent(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}

		if (offsetY < SCROLL_COLLAPSE_PULL) {
			if (modalSnapState === MAP_SHEET_SNAP_STATES.EXPANDED) {
				triggerScrollDetent(MAP_SHEET_SNAP_STATES.HALF);
				return;
			}
			if (modalSnapState === MAP_SHEET_SNAP_STATES.HALF && offsetY < HALF_CLOSE_PULL_THRESHOLD) {
				triggerScrollDetent(resolveNextDetentDown(MAP_SHEET_SNAP_STATES.HALF));
				return;
			}
			if (modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
				triggerScrollDetent(resolveNextDetentDown(MAP_SHEET_SNAP_STATES.COLLAPSED));
			}
		}
	};

	const handleContentScrollEndDrag = (event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? lastScrollOffsetYRef.current ?? 0;
		const velocityY = event?.nativeEvent?.velocity?.y ?? 0;
		lastScrollOffsetYRef.current = offsetY;

		if (!enableDetents || !allowScrollDetents || scrollSnapHandledRef.current) return;
		const startedNearTop = scrollStartOffsetYRef.current <= SCROLL_TOP_THRESHOLD;
		if (!startedNearTop) return;

		if (
			modalSnapState === MAP_SHEET_SNAP_STATES.HALF &&
			offsetY <= SCROLL_EXPAND_OFFSET * 0.75 &&
			velocityY > SCROLL_EXPAND_VELOCITY
		) {
			triggerScrollDetent(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}

		if (offsetY <= 0 && velocityY < SCROLL_COLLAPSE_VELOCITY) {
			if (modalSnapState === MAP_SHEET_SNAP_STATES.EXPANDED) {
				triggerScrollDetent(MAP_SHEET_SNAP_STATES.HALF);
				return;
			}
			if (
				modalSnapState === MAP_SHEET_SNAP_STATES.HALF &&
				velocityY < HALF_CLOSE_VELOCITY_THRESHOLD
			) {
				triggerScrollDetent(resolveNextDetentDown(MAP_SHEET_SNAP_STATES.HALF));
				return;
			}
			if (modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
				triggerScrollDetent(resolveNextDetentDown(MAP_SHEET_SNAP_STATES.COLLAPSED));
			}
		}
	};

	const handleContentWheel = (event) => {
		if (!enableDetents || !allowWheelDetents || scrollSnapHandledRef.current || !isWeb) return;

		const deltaY = Number(event?.nativeEvent?.deltaY ?? 0);
		if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 1) return;

		const isAtTop = lastScrollOffsetYRef.current <= SCROLL_TOP_THRESHOLD;
		if (!isAtTop) {
			wheelSnapAccumRef.current = 0;
			return;
		}

		wheelSnapAccumRef.current =
			Math.sign(wheelSnapAccumRef.current) === Math.sign(deltaY) || wheelSnapAccumRef.current === 0
				? wheelSnapAccumRef.current + deltaY
				: deltaY;

		if (modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED && wheelSnapAccumRef.current >= 34) {
			triggerScrollDetent(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}

		if (modalSnapState === MAP_SHEET_SNAP_STATES.HALF && wheelSnapAccumRef.current >= 52) {
			triggerScrollDetent(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}

		if (modalSnapState === MAP_SHEET_SNAP_STATES.EXPANDED && wheelSnapAccumRef.current <= -42) {
			triggerScrollDetent(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}

		if (modalSnapState === MAP_SHEET_SNAP_STATES.HALF && wheelSnapAccumRef.current <= HALF_CLOSE_WHEEL_THRESHOLD) {
			triggerScrollDetent(resolveNextDetentDown(MAP_SHEET_SNAP_STATES.HALF));
			return;
		}

		if (modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED && wheelSnapAccumRef.current <= -112) {
			triggerScrollDetent(resolveNextDetentDown(MAP_SHEET_SNAP_STATES.COLLAPSED));
		}
	};

	const panResponder = enableDetents
		? PanResponder.create({
				onMoveShouldSetPanResponder: (_, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					return (
						absDy > modalMotion.gestureActivationOffset &&
						absDy > absDx * (modalMotion.axisLockRatio || 1.1)
					);
				},
				onMoveShouldSetPanResponderCapture: (_, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					return (
						absDy > modalMotion.gestureActivationOffset &&
						absDy > absDx * (modalMotion.axisLockRatio || 1.1)
					);
				},
				onPanResponderGrant: () => {
					dragTranslateY.stopAnimation();
					resetDetentInteractionState();
				},
				onPanResponderMove: (_, gestureState) => {
					const rawDy = gestureState.dy;
					const minDy =
						modalSnapState === MAP_SHEET_SNAP_STATES.EXPANDED ? 0 : modalMotion.dragRange.up;
					const maxDy =
						modalSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED ? 0 : modalMotion.dragRange.down;
					const clampedDy = Math.max(minDy, Math.min(maxDy, rawDy));
					dragTranslateY.setValue(clampedDy);
				},
				onPanResponderRelease: (_, gestureState) => {
					const { dy, vy } = gestureState;
					let nextState = modalSnapState;

					if (dy <= -modalMotion.release.distance || vy <= -modalMotion.release.velocity) {
						nextState = getNextMapSheetSnapStateUp(modalSnapState);
					} else if (
						dy >= modalMotion.release.distance ||
						vy >= modalMotion.release.velocity
					) {
						nextState = resolveNextDetentDown(modalSnapState);
					}

					Animated.spring(dragTranslateY, {
						toValue: 0,
						useNativeDriver: false,
						...modalSpringConfig,
					}).start();

					if (nextState !== modalSnapState) {
						commitDetentState(nextState);
					}
				},
				onPanResponderTerminate: () => {
					Animated.spring(dragTranslateY, {
						toValue: 0,
						useNativeDriver: false,
						...modalSpringConfig,
					}).start();
				},
			})
		: null;
	const contentScrollEnabled =
		scrollEnabled &&
		(isDrawer ||
			modalSnapState === MAP_SHEET_SNAP_STATES.EXPANDED ||
			allowScrollDetents ||
			allowWheelDetents);

	const modalContent = (
		<Animated.View
			style={[
				styles.sheetSurface,
				surfaceShapeStyle,
				{
					backgroundColor: surfaceColor,
					minHeight,
					maxHeight,
					height: animatedSheetHeight,
					paddingTop: isDrawer ? 12 + drawerSafeTopOffset : 14,
					paddingBottom: isDrawer ? 18 + drawerSafeBottomOffset : insets.bottom + 18,
					transform: enableDetents ? [{ translateY: dragTranslateY }] : undefined,
				},
			]}
		>
			{resolvedShowHandle ? (
				<View {...(panResponder?.panHandlers || {})} style={styles.handleWrap}>
					<Pressable onPress={handleHandlePress} hitSlop={12}>
						<View style={[styles.handle, { backgroundColor: handleColor }]} />
					</Pressable>
				</View>
			) : null}

			<View
				{...(shouldUseHeaderGestureRegion ? (panResponder?.panHandlers || {}) : {})}
				style={styles.headerRow}
			>
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
				<View
					{...(shouldUseBodyGestureRegion ? (panResponder?.panHandlers || {}) : {})}
					style={[
						styles.contentGestureRegion,
						shouldUseBodyGestureRegion ? styles.contentGestureRegionActive : null,
					]}
				>
					<ScrollView
						ref={contentScrollRef}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						scrollEnabled={contentScrollEnabled}
						nestedScrollEnabled
						bounces={!isDrawer && !isWeb}
						alwaysBounceVertical={!isDrawer && !isWeb}
						overScrollMode={enableDetents && allowScrollDetents ? "always" : "auto"}
						directionalLockEnabled
						scrollEventThrottle={16}
						onScrollBeginDrag={handleContentScrollBeginDrag}
						onScroll={handleContentScroll}
						onScrollEndDrag={handleContentScrollEndDrag}
						onMomentumScrollEnd={handleContentScrollEndDrag}
						onWheel={isWeb ? handleContentWheel : undefined}
						contentContainerStyle={[styles.content, contentContainerStyle]}
					>
						{children}
					</ScrollView>
				</View>
			) : (
				<View style={[styles.content, contentContainerStyle]}>
					{children}
				</View>
			)}
			{footerSlot ? <View style={styles.footerSlot}>{footerSlot}</View> : null}
		</Animated.View>
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
								top: (surfaceConfig.modalTopInset ?? drawerTopInset) + browserTopOffset,
								bottom: hostBottom + browserBottomOffset,
							}
						: {
								left: 0,
								right: 0,
								bottom: browserBottomOffset,
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
