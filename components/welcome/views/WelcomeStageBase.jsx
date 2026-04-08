import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Image,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import useAuthViewport from "../../../hooks/ui/useAuthViewport";
import EntryActionButton from "../../entry/EntryActionButton";
import WelcomeAmbientGlows from "../WelcomeAmbientGlows";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import useWelcomeWebSurfaceChrome from "../hooks/useWelcomeWebSurfaceChrome";

const LOGO = require("../../../assets/logo.png");
const HERO = require("../../../assets/hero/speed.png");

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
	const { height, width } = useWindowDimensions();
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;
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
	}, [duration, tension, friction, entranceOpacity, entranceTranslate]);

	const themeContext = useMemo(
		() => ({
			height,
			width,
			insetsTop: insets?.top || 0,
			insetsBottom: insets?.bottom || 0,
			isDarkMode,
			viewport,
		}),
		[
			height,
			insets?.bottom,
			insets?.top,
			isDarkMode,
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
				horizontalPadding: viewport.horizontalPadding,
				bodyTextSize: viewport.bodyTextSize,
				bodyTextLineHeight: viewport.bodyTextLineHeight,
				entryPrimaryActionHeight: viewport.entryPrimaryActionHeight,
				viewportHeight: height,
				viewportWidth: width,
				height,
				width,
				insetsTop: insets?.top || 0,
				insetsBottom: insets?.bottom || 0,
				...(typeof resolveThemeOverrides === "function"
					? resolveThemeOverrides(themeContext)
					: null),
			}),
		[
			createTheme,
			height,
			insets?.bottom,
			insets?.top,
			isDarkMode,
			resolveThemeOverrides,
			themeContext,
			viewport.bodyTextLineHeight,
			viewport.bodyTextSize,
			viewport.entryPrimaryActionHeight,
			viewport.horizontalPadding,
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
						? Math.max(metrics.primaryActionHeight, 60)
						: metrics.secondaryActionHeight
				}
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
		fontSize: Math.round((metrics?.headlineSize || 44) * 1.08),
		lineHeight: Math.round((metrics?.headlineLineHeight || 50) * 1.16),
		paddingBottom: 6,
		maxWidth:
			layout === "split"
				? Math.max(metrics?.helperMaxWidth || 520, 520)
				: 360,
	};

	const helperDisplayStyle = {
		marginTop: Math.max(metrics?.stageSpacing?.headlineToHelper || 12, 12),
		maxWidth:
			layout === "split"
				? Math.max(metrics?.helperMaxWidth || 520, 520)
				: 336,
	};

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
					marginTop: 12,
					fontSize: Math.max(12, (metrics?.helperSize || 16) - 3),
					lineHeight: Math.max(18, (metrics?.helperLineHeight || 22) - 6),
					opacity: isDarkMode ? 0.7 : 0.62,
					maxWidth: 280,
				},
			]}
		>
			{WELCOME_COPY.ctaFootnote}
		</Text>
	) : null;

	const actionBlock =
		actionContainer === "well" ? (
			<View style={[styles.actionWell, { marginTop: actionsMarginTop }]}>
				<View style={styles.actions}>{actionButtons}</View>
				{ctaFootnote}
				{signInPressable}
			</View>
		) : (
			<>
				<View style={[styles.actions, { marginTop: actionsMarginTop }]}>
					{actionButtons}
				</View>
				{ctaFootnote}
				{signInPressable}
			</>
		);

	const brandBlock = (
		<View style={[styles.brandBlock, { opacity: 0.88 }]}> 
			<Image source={LOGO} resizeMode="contain" style={[styles.logo, { transform: [{ scale: 0.88 }] }]} />
			<Text style={[styles.brandText, { opacity: 0.84 }]}>
				iVisit
				<Text style={styles.brandDot}>.</Text>
			</Text>
		</View>
	);

	const copyBlock = (
		<View style={styles.copyBlock}>
			{premiumHeadline}
			<Text style={[styles.helper, helperDisplayStyle]}>{WELCOME_COPY.helper}</Text>

			{showChip ? (
				<View style={styles.chip}>
					<Text style={styles.chipText}>{WELCOME_COPY.chip}</Text>
				</View>
			) : null}
		</View>
	);

	const heroBlock =
		layout === "split" ? (
			<View style={styles.heroPanel}>
				<View
					pointerEvents="none"
					style={[
						styles.heroRing,
						{ backgroundColor: isDarkMode ? "rgba(134,16,14,0.16)" : "rgba(134,16,14,0.08)" },
					]}
				/>
				<Image
					source={HERO}
					resizeMode="contain"
					style={[styles.heroImage, { transform: [{ translateY: -8 }, { scale: 0.94 }] }]}
				/>
			</View>
		) : (
			<View style={styles.heroBlock}>
				<Image
					source={HERO}
					resizeMode="contain"
					style={[styles.heroImage, { transform: [{ translateY: -8 }, { scale: 0.94 }] }]}
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
				contentContainerStyle={styles.scrollContent}
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
						<>
							{brandBlock}
							{heroBlock}
							{copyBlock}
							{actionBlock}
						</>
					)}
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}
