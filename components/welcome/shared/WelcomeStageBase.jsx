import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Animated,
	Easing,
	Image,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import useAuthViewport from "../../../hooks/ui/useAuthViewport";
import getViewportSurfaceMetrics from "../../../utils/ui/viewportSurfaceMetrics";
import EntryActionButton from "../../entry/EntryActionButton";
import IOSInstallHintCard from "../install/IOSInstallHintCard";
import WelcomeAmbientGlows from "./WelcomeAmbientGlows";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import useWelcomeWebSurfaceChrome from "../hooks/useWelcomeWebSurfaceChrome";

const LOGO = require("../../../assets/logo.png");
const HERO = require("../../../assets/hero/speed.png");
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function useHiddenWebScrollbars({ enabled, styleId, nativeID }) {
	useEffect(() => {
		if (
			!enabled ||
			Platform.OS !== "web" ||
			typeof document === "undefined" ||
			!styleId ||
			!nativeID
		) {
			return undefined;
		}

		let styleElement = document.getElementById(styleId);
		let created = false;

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = styleId;
			styleElement.textContent = `
				#${nativeID},
				#${nativeID} > div {
					scrollbar-width: none;
					-ms-overflow-style: none;
				}

				#${nativeID}::-webkit-scrollbar,
				#${nativeID} > div::-webkit-scrollbar {
					width: 0;
					height: 0;
					display: none;
				}
			`;
			document.head.appendChild(styleElement);
			created = true;
		}

		return () => {
			if (created && styleElement?.parentNode) {
				styleElement.parentNode.removeChild(styleElement);
			}
		};
	}, [enabled, nativeID, styleId]);
}

function getActionSpacing(metrics, spacingKey) {
	const stageSpacing = metrics?.stageSpacing || {};
	const requested = Number(stageSpacing?.[spacingKey]);
	const fallback = Number(
		stageSpacing?.chipToActionWell ?? stageSpacing?.chipToActions ?? 20,
	);
	const helperGap = Number(stageSpacing?.helperToChip ?? 0);

	if (!Number.isFinite(requested)) {
		return Math.max(20, fallback);
	}

	if (metrics?.showChip) {
		return requested;
	}

	return Math.max(requested - helperGap + 8, 20);
}

export default function WelcomeStageBase({
	onRequestHelp,
	onFindHospitalBed,
	onSignIn,
	primaryActionLabel,
	isRequestOpening = false,
	createTheme,
	resolveThemeOverrides,
	animation = {},
	layout = "single",
	actionContainer = "plain",
	useActionSlots = false,
	forceShowChip = false,
	useWebChrome = false,
	scrollNativeID,
	scrollbarStyleId,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const viewport = useAuthViewport();
	const { height, width } = viewport;
	const browserInsetTop = viewport.isWeb ? viewport.browserInsetTop || 0 : 0;
	const browserInsetBottom = viewport.isWeb ? viewport.browserInsetBottom || 0 : 0;
	const resolvedInsetsTop = (insets?.top || 0) + browserInsetTop;
	const resolvedInsetsBottom = (insets?.bottom || 0) + browserInsetBottom;
	const sharedMetrics = useMemo(
		() =>
			getViewportSurfaceMetrics({
				width,
				height,
				platform: Platform.OS,
				presentationMode: layout === "split" ? "modal" : "sheet",
			}),
		[height, layout, width],
	);
	const [reduceMotion, setReduceMotion] = useState(false);
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;
	const heroMotion = useRef(new Animated.Value(0)).current;
	const pulseMotion = useRef(new Animated.Value(0)).current;
	const brandOpacity = useRef(new Animated.Value(0)).current;
	const headlineOpacity = useRef(new Animated.Value(0)).current;
	const helperOpacity = useRef(new Animated.Value(0)).current;
	const actionsOpacity = useRef(new Animated.Value(0)).current;
	const {
		duration = 240,
		tension = 50,
		friction = 10,
	} = animation;

	useWelcomeWebSurfaceChrome(isDarkMode, useWebChrome);
	useHiddenWebScrollbars({
		enabled: useWebChrome,
		styleId: scrollbarStyleId,
		nativeID: scrollNativeID,
	});

	useEffect(() => {
		AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
		return () => sub?.remove();
	}, []);

	useEffect(() => {
		if (reduceMotion) {
			[entranceOpacity, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity].forEach(
				(v) => v.setValue(1),
			);
			entranceTranslate.setValue(0);
			return;
		}

		const stagger = 60;
		Animated.stagger(stagger, [
			Animated.timing(brandOpacity, { toValue: 1, duration: duration * 0.7, useNativeDriver: true }),
			Animated.timing(headlineOpacity, { toValue: 1, duration: duration * 0.8, useNativeDriver: true }),
			Animated.timing(helperOpacity, { toValue: 1, duration: duration * 0.85, useNativeDriver: true }),
			Animated.timing(actionsOpacity, { toValue: 1, duration: duration, useNativeDriver: true }),
		]).start();

		Animated.parallel([
			Animated.timing(entranceOpacity, {
				toValue: 1,
				duration,
				useNativeDriver: true,
			}),
			Animated.spring(entranceTranslate, {
				toValue: 0,
				tension,
				friction,
				useNativeDriver: true,
			}),
		]).start();

		const driftLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(heroMotion, {
					toValue: 1,
					duration: 2800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(heroMotion, {
					toValue: 0,
					duration: 2800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseMotion, {
					toValue: 1,
					duration: 1100,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulseMotion, {
					toValue: 0,
					duration: 1100,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);

		driftLoop.start();
		pulseLoop.start();

		return () => {
			driftLoop.stop();
			pulseLoop.stop();
		};
	}, [reduceMotion, duration, tension, friction, entranceOpacity, entranceTranslate, brandOpacity, headlineOpacity, helperOpacity, actionsOpacity, heroMotion, pulseMotion]);

	const themeContext = useMemo(
		() => ({
			height,
			width,
			insetsTop: resolvedInsetsTop,
			insetsBottom: resolvedInsetsBottom,
			isDarkMode,
			viewport,
		}),
		[
			height,
			isDarkMode,
			resolvedInsetsBottom,
			resolvedInsetsTop,
			viewport,
			width,
		],
	);
	const theme = useMemo(
		() =>
			createTheme({
				isDarkMode,
				isCompactPhone: viewport.isCompactPhone,
				isVeryShortHeight: viewport.isVeryShortHeight,
				isShortHeight: viewport.isShortHeight,
				isLargeMonitor: viewport.isLargeMonitor,
				horizontalPadding: sharedMetrics.insets.horizontal,
				bodyTextSize: sharedMetrics.type.body,
				bodyTextLineHeight: sharedMetrics.type.bodyLineHeight,
				entryPrimaryActionHeight: sharedMetrics.cta.primaryHeight,
				viewportHeight: height,
				viewportWidth: width,
				height,
				width,
				insetsTop: resolvedInsetsTop,
				insetsBottom: resolvedInsetsBottom,
				...(typeof resolveThemeOverrides === "function"
					? resolveThemeOverrides(themeContext)
					: null),
			}),
		[
			createTheme,
			height,
			isDarkMode,
			resolveThemeOverrides,
			resolvedInsetsBottom,
			resolvedInsetsTop,
			sharedMetrics.cta.primaryHeight,
			sharedMetrics.insets.horizontal,
			sharedMetrics.type.body,
			sharedMetrics.type.bodyLineHeight,
			themeContext,
			viewport.isCompactPhone,
			viewport.isLargeMonitor,
			viewport.isShortHeight,
			viewport.isVeryShortHeight,
			width,
		],
	);
	const { colors, metrics, styles } = theme;
	const showChip = Boolean(WELCOME_COPY.chip) && (forceShowChip || metrics?.showChip);
	const spacingKey =
		actionContainer === "well" ? "chipToActionWell" : "chipToActions";
	const actionsMarginTop = getActionSpacing(metrics, spacingKey);

	const actionButtons = WELCOME_INTENTS.map((intent) => {
		const resolvedLabel =
			intent.key === "emergency" && typeof primaryActionLabel === "string" && primaryActionLabel.length > 0
				? primaryActionLabel
				: intent.label;
		const button = (
			<EntryActionButton
				key={intent.key}
				label={resolvedLabel}
				variant={intent.variant}
				disabled={isRequestOpening && intent.key === "emergency"}
				height={
					intent.variant === "primary"
						? Math.max(metrics.primaryActionHeight, sharedMetrics.cta.primaryHeight)
						: Math.max(metrics.secondaryActionHeight, sharedMetrics.cta.secondaryHeight)
				}
				fullWidth={false}
				minWidth={intent.variant === "primary" ? (layout === "split" ? 256 : 296) : 220}
				maxWidth={intent.variant === "primary" ? (layout === "split" ? 332 : 384) : 264}
				style={{ alignSelf: layout === "split" ? "flex-start" : "center" }}
				onPress={
					intent.key === "emergency" ? onRequestHelp : onFindHospitalBed
				}
			/>
		);

		if (!useActionSlots) {
			return button;
		}

		return (
			<View
				key={intent.key}
				style={
					intent.variant === "primary"
						? styles.primaryActionSlot
						: styles.secondaryActionSlot
				}
			>
				{button}
			</View>
		);
	});

	const headlineDisplayStyle = {
		fontSize:
			layout === "split"
				? Math.round(sharedMetrics.type.headline * 1.06)
				: Math.min(sharedMetrics.type.headline, viewport.welcomeTitleSize),
		lineHeight:
			layout === "split"
				? Math.round(sharedMetrics.type.headlineLineHeight * 1.12)
				: Math.min(sharedMetrics.type.headlineLineHeight, viewport.welcomeTitleLineHeight),
		paddingBottom: 8,
		maxWidth:
			layout === "split"
				? Math.max(metrics?.helperMaxWidth || 560, 560)
				: 392,
	};

	const helperDisplayStyle = {
		marginTop: Math.max(metrics?.stageSpacing?.headlineToHelper || sharedMetrics.insets.sectionGap, sharedMetrics.insets.sectionGap),
		maxWidth:
			layout === "split"
				? Math.max(metrics?.helperMaxWidth || 520, 520)
				: 336,
		fontSize: Math.max(15, metrics?.helperSize || sharedMetrics.type.body),
		lineHeight: Math.max(22, metrics?.helperLineHeight || sharedMetrics.type.bodyLineHeight),
		opacity: isDarkMode ? 0.86 : 0.78,
		letterSpacing: 0.05,
		fontWeight: Platform.OS === "ios" ? "500" : "400",
	};

	const elevatedActionsMarginTop = Math.max(actionsMarginTop + 10, 30);
	const isTallSingleLayout =
		layout !== "split" && (height >= 850 || height / Math.max(width, 1) >= 1.95);
	const usesShortHeightSingleLayout = layout !== "split" && viewport.isShortHeight;
	const shouldDockSingleActionBlock =
		actionContainer === "well" && layout !== "split" && viewport.isShortHeight;
	const shouldCenterSingleLayoutCluster = layout !== "split" && !viewport.isShortHeight;
	const shouldShowWebInstallHint =
		useWebChrome &&
		layout !== "split" &&
		(viewport.isIosBrowser || viewport.isAndroidBrowser) &&
		!viewport.isStandalonePWA;
	const resolvedActionsMarginTop =
		layout === "split"
			? elevatedActionsMarginTop
			: usesShortHeightSingleLayout
				? Math.min(actionsMarginTop, 16)
				: Math.min(elevatedActionsMarginTop, isTallSingleLayout ? 18 : 24);
	const dockedActionClearance = shouldDockSingleActionBlock
		? Math.max(
				(metrics?.primaryActionHeight || 60) +
					(metrics?.bottomPadding || 0) +
					48,
				(metrics?.stageSpacing?.actionWellMinHeight || 0) + 72,
			)
		: 0;
	const heroTranslateX = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [-2, 2],
	});
	const trailTranslateX = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [-6, 5],
	});
	const trailOpacity = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [isDarkMode ? 0.08 : 0.04, isDarkMode ? 0.14 : 0.08],
	});
	const ringScale = pulseMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [0.995, 1.02],
	});
	const ringOpacity = pulseMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [isDarkMode ? 0.24 : 0.14, isDarkMode ? 0.4 : 0.24],
	});

	const premiumHeadline = Platform.OS === "web" ? (
		<Text
			style={[
				styles.headline,
				headlineDisplayStyle,
				{
					color: "transparent",
					backgroundImage: `linear-gradient(135deg, ${colors.headline} 0%, ${colors.headline} 62%, ${COLORS.brandPrimary} 100%)`,
					backgroundClip: "text",
					WebkitBackgroundClip: "text",
					WebkitTextFillColor: "transparent",
					textShadowColor: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.10)",
					textShadowRadius: 12,
				},
			]}
		>
			{WELCOME_COPY.headline}
		</Text>
	) : (
		<MaskedView
			maskElement={
				<Text style={[styles.headline, headlineDisplayStyle]}>
					{WELCOME_COPY.headline}
				</Text>
			}
		>
			<LinearGradient
				colors={[colors.headline, colors.headline, COLORS.brandPrimary]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			>
				<Text style={[styles.headline, headlineDisplayStyle, { opacity: 0 }]}>
					{WELCOME_COPY.headline}
				</Text>
			</LinearGradient>
		</MaskedView>
	);

	const signInPressable = (
		<Pressable
			onPress={onSignIn}
			style={[
				styles.signInPressable,
				{ marginTop: (metrics?.stageSpacing?.signInTop || 0) + 6 },
				Platform.OS === "web" ? { cursor: "pointer" } : null,
			]}
		>
			<Text style={[styles.signInText, { opacity: isDarkMode ? 0.68 : 0.6 }]}>{WELCOME_COPY.resumeLabel || "Resume Visit"}</Text>
		</Pressable>
	);

	const ctaFootnote = WELCOME_COPY.ctaFootnote ? (
		<Text
			style={[
				styles.helper,
				{
					marginTop: Math.max(10, sharedMetrics.insets.sectionGap - 2),
					fontSize: Math.max(12, (metrics?.helperSize || 16) - 3),
					lineHeight: Math.max(18, (metrics?.helperLineHeight || 22) - 6),
					opacity: isDarkMode ? 0.7 : 0.62,
					maxWidth: Math.max(280, Math.round(sharedMetrics.modal.contentPadding * 8)),
				},
			]}
		>
			{WELCOME_COPY.ctaFootnote}
		</Text>
	) : null;

	const actionContent = (
		<>
			{shouldShowWebInstallHint ? (
				<IOSInstallHintCard visible compact={viewport.isShortHeight} />
			) : null}
			<View style={styles.actions}>{actionButtons}</View>
			{ctaFootnote}
			{/* {signInPressable} */}
		</>
	);

	const actionBlock =
		actionContainer === "well" ? (
			<Animated.View style={[styles.actionWell, { marginTop: resolvedActionsMarginTop, opacity: actionsOpacity }]}>
				{actionContent}
			</Animated.View>
		) : (
			<Animated.View style={{ opacity: actionsOpacity }}>
				<View
					style={[styles.actions, { marginTop: resolvedActionsMarginTop }]}
					accessibilityLiveRegion="polite"
				>
					{actionButtons}
				</View>
				{ctaFootnote}
				{/* {signInPressable} */}
			</Animated.View>
		);

	const brandBlock = (
		<Animated.View style={[styles.brandBlock, { opacity: Animated.multiply(brandOpacity, 0.88) }]}>
			<Image
				source={LOGO}
				resizeMode="contain"
				style={[
					styles.logo,
					{
						width: sharedMetrics.welcome.logoSize,
						height: sharedMetrics.welcome.logoSize,
						transform: [{ scale: 0.88 }],
					},
				]}
			/>
			<Text
				style={[
					styles.brandText,
					{
						fontSize: sharedMetrics.welcome.brandSize,
						lineHeight: Math.round(sharedMetrics.welcome.brandSize * 1.08),
						opacity: 0.84,
					},
				]}
			>
				iVisit
				<Text style={[styles.brandDot, { fontSize: sharedMetrics.welcome.brandSize + 2 }]}>.</Text>
			</Text>
		</Animated.View>
	);

	const copyBlock = (
		<View style={styles.copyBlock}>
			<Animated.View style={{ opacity: headlineOpacity }}>
				{premiumHeadline}
			</Animated.View>
			<Animated.View style={{ opacity: helperOpacity }}>
				<Text style={[styles.helper, helperDisplayStyle]}>{WELCOME_COPY.helper}</Text>
				{showChip ? (
					<View style={styles.chip}>
						<Text style={styles.chipText}>{WELCOME_COPY.chip}</Text>
					</View>
				) : null}
			</Animated.View>
		</View>
	);

	const heroBlock =
		layout === "split" ? (
			<View style={styles.heroPanel}>
				<AnimatedLinearGradient
					pointerEvents="none"
					colors={
						isDarkMode
							? ["transparent", "rgba(134,16,14,0.20)", "rgba(255,255,255,0.05)", "transparent"]
							: ["transparent", "rgba(134,16,14,0.12)", "rgba(255,255,255,0.6)", "transparent"]
					}
					start={{ x: 0, y: 0.5 }}
					end={{ x: 1, y: 0.5 }}
					style={[
						{
							position: "absolute",
							left: "10%",
							bottom: "28%",
							width: "66%",
							height: Math.max(18, sharedMetrics.type.captionLineHeight + 4),
							borderRadius: 999,
						},
						{
							opacity: trailOpacity,
							transform: [{ translateX: trailTranslateX }, { scaleX: 1.04 }],
						},
					]}
				/>
				<Animated.View
					pointerEvents="none"
					style={[
						styles.heroRing,
						{
							backgroundColor: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.08)",
							opacity: ringOpacity,
							transform: [{ scale: ringScale }],
						},
					]}
				/>
				<Animated.Image
					source={HERO}
					resizeMode="contain"
					style={[
						styles.heroImage,
						{
							width: sharedMetrics.welcome.heroWidth,
							height: sharedMetrics.welcome.heroHeight,
							transform: [{ translateX: heroTranslateX }, { translateY: -8 }, { scale: 0.94 }],
						},
					]}
				/>
			</View>
		) : (
			<View style={styles.heroBlock}>
				<Animated.Image
					source={HERO}
					resizeMode="contain"
					style={[
						styles.heroImage,
						{
							width: Math.min(sharedMetrics.welcome.heroWidth, viewport.heroImageWidth),
							height: Math.min(sharedMetrics.welcome.heroHeight, viewport.heroImageHeight),
							transform: [{ translateX: heroTranslateX }, { translateY: -8 }, { scale: 0.94 }],
						},
					]}
				/>
			</View>
		);

	return (
		<LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
			<WelcomeAmbientGlows
				topGlowStyle={styles.topGlow}
				bottomGlowStyle={styles.bottomGlow}
			/>

			<ScrollView
				nativeID={scrollNativeID}
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{
						paddingHorizontal: sharedMetrics.insets.horizontal,
						paddingTop: Math.max(metrics?.topPadding || 0, sharedMetrics.welcome.topPadding),
						paddingBottom: Math.max(metrics?.bottomPadding || 0, sharedMetrics.welcome.bottomPadding),
					},
					shouldDockSingleActionBlock
						? {
								paddingBottom:
									Math.max(metrics?.bottomPadding || 0, sharedMetrics.welcome.bottomPadding) +
									dockedActionClearance,
							}
						: null,
				]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<Animated.View
					style={[
						styles.stage,
						{
							opacity: entranceOpacity,
							transform: [{ translateY: entranceTranslate }],
						},
					]}
				>
					{layout === "split" ? (
						<>
							<View style={styles.leftColumn}>
								{brandBlock}
								{copyBlock}
								{actionBlock}
							</View>
							{heroBlock}
						</>
					) : (
						<View style={{ width: "100%", flex: 1 }}>
							<View style={{ width: "100%", alignItems: "center" }}>{brandBlock}</View>
							<View
								style={[
									{
										width: "100%",
										flex: shouldCenterSingleLayoutCluster ? 1 : 0,
										justifyContent: shouldCenterSingleLayoutCluster ? "center" : "flex-start",
										alignItems: "center",
										paddingTop: usesShortHeightSingleLayout ? 0 : isTallSingleLayout ? 4 : 0,
									},
								]}
							>
								{heroBlock}
								{copyBlock}
							</View>
							{shouldDockSingleActionBlock ? null : (
								<View style={{ width: "100%", justifyContent: "flex-end" }}>{actionBlock}</View>
							)}
						</View>
					)}
				</Animated.View>
			</ScrollView>
			{shouldDockSingleActionBlock ? (
				<View
					pointerEvents="box-none"
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: browserInsetBottom,
					}}
				>
					<LinearGradient
						pointerEvents="box-none"
						colors={
							isDarkMode
								? ["rgba(11,17,28,0)", "rgba(11,17,28,0.78)", colors.backgroundBase]
								: ["rgba(250,246,245,0)", "rgba(250,246,245,0.88)", colors.backgroundBase]
						}
						start={{ x: 0.5, y: 0 }}
						end={{ x: 0.5, y: 1 }}
						style={{
							paddingTop: Math.max(24, sharedMetrics.insets.largeGap + 4),
							paddingBottom: metrics?.bottomPadding || 0,
							paddingHorizontal: sharedMetrics.insets.horizontal,
						}}
					>
						<View
							style={{
								width: "100%",
								maxWidth: metrics?.contentWidth || viewport.entryStageMaxWidth || width,
								alignSelf: "center",
							}}
						>
							<View
								style={[
									styles.actionWell,
									{
										marginTop: 0,
										minHeight: 0,
										flexGrow: 0,
									},
								]}
							>
								{actionContent}
							</View>
						</View>
					</LinearGradient>
				</View>
			) : null}
		</LinearGradient>
	);
}
