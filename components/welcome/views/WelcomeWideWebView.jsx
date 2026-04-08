import React, { useEffect, useRef } from "react";
import {
	Animated,
	Easing,
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
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import EntryActionButton from "../../entry/EntryActionButton";
import WelcomeAmbientGlows from "../WelcomeAmbientGlows";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import useWelcomeWebSurfaceChrome from "../hooks/useWelcomeWebSurfaceChrome";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function WelcomeWideWebView({
	onRequestHelp,
	onFindHospitalBed,
	onSignIn,
	primaryActionLabel,
	isRequestOpening = false,
	createTheme,
	animation = {},
}) {
	const { isDarkMode } = useTheme();
	const { height, width } = useWindowDimensions();
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;
	const heroMotion = useRef(new Animated.Value(0)).current;
	const pulseMotion = useRef(new Animated.Value(0)).current;
	const {
		duration = 240,
		tension = 50,
		friction = 10,
	} = animation;

	useWelcomeWebSurfaceChrome(isDarkMode);

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

		const driftLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(heroMotion, {
					toValue: 1,
					duration: 2200,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(heroMotion, {
					toValue: 0,
					duration: 2200,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseMotion, {
					toValue: 1,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulseMotion, {
					toValue: 0,
					duration: 800,
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
	}, [duration, tension, friction, entranceOpacity, entranceTranslate, heroMotion, pulseMotion]);

	const { colors, metrics, styles } = createTheme({
		viewportHeight: height,
		viewportWidth: width,
		isDarkMode,
	});

	const headlineDisplayStyle = {
		fontSize: Math.round((metrics?.headlineSize || 56) * 1.12),
		lineHeight: Math.round((metrics?.headlineLineHeight || 60) * 1.24),
		paddingBottom: 8,
		maxWidth: Math.max(metrics?.leftColumnWidth || 560, 560),
	};

	const helperDisplayStyle = {
		marginTop: Math.max(metrics?.stageSpacing?.headlineToHelper || 14, 14),
		maxWidth: Math.max(metrics?.helperMaxWidth || 520, 520),
		fontSize: Math.max(13, (metrics?.helperSize || 16) - 2),
		lineHeight: Math.max(18, (metrics?.helperLineHeight || 22) - 4),
		opacity: isDarkMode ? 0.74 : 0.66,
		letterSpacing: 0.1,
	};

	const elevatedActionsMarginTop = Math.max((metrics?.stageSpacing?.chipToActions || 22) + 10, 30);
	const heroTranslateX = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [-3, 4],
	});
	const trailTranslateX = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [-10, 8],
	});
	const trailOpacity = heroMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [isDarkMode ? 0.18 : 0.1, isDarkMode ? 0.3 : 0.18],
	});
	const ringScale = pulseMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [0.98, 1.04],
	});
	const ringOpacity = pulseMotion.interpolate({
		inputRange: [0, 1],
		outputRange: [isDarkMode ? 0.46 : 0.28, isDarkMode ? 0.74 : 0.46],
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

	return (
		<LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
			<WelcomeAmbientGlows
				topGlowStyle={styles.topGlow}
				bottomGlowStyle={styles.bottomGlow}
			/>

			<ScrollView
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
					<View style={styles.leftColumn}>
						<View style={[styles.brandBlock, { opacity: 0.88 }]}>
							<Image
								source={require("../../../assets/logo.png")}
								resizeMode="contain"
								style={[styles.logo, { transform: [{ scale: 0.88 }] }]}
							/>
							<Text style={[styles.brandText, { opacity: 0.84 }]}> 
								iVisit
								<Text style={styles.brandDot}>.</Text>
							</Text>
						</View>

						<View style={styles.copyBlock}>
							{premiumHeadline}
							<Text style={[styles.helper, helperDisplayStyle]}>{WELCOME_COPY.helper}</Text>
							{WELCOME_COPY.chip ? (
								<View style={styles.chip}>
									<Text style={styles.chipText}>{WELCOME_COPY.chip}</Text>
								</View>
							) : null}
						</View>

						<View style={[styles.actions, { marginTop: elevatedActionsMarginTop }]}>
							{WELCOME_INTENTS.map((intent) => (
								<View
									key={intent.key}
									style={
										intent.variant === "primary"
											? styles.primaryActionSlot
											: styles.secondaryActionSlot
									}
								>
									<EntryActionButton
										label={
											intent.key === "emergency" && primaryActionLabel
												? primaryActionLabel
												: intent.label
										}
										variant={intent.variant}
										disabled={isRequestOpening && intent.key === "emergency"}
										height={
											intent.variant === "primary"
												? Math.max(metrics.primaryActionHeight, 60)
												: metrics.secondaryActionHeight
										}
										onPress={
											intent.key === "emergency"
												? onRequestHelp
												: onFindHospitalBed
										}
									/>
								</View>
							))}
						</View>

						{WELCOME_COPY.ctaFootnote ? (
							<Text
								style={[
									styles.helper,
									{
										marginTop: 12,
										fontSize: Math.max(12, (metrics?.helperSize || 16) - 4),
										lineHeight: Math.max(18, (metrics?.helperLineHeight || 22) - 8),
										opacity: isDarkMode ? 0.7 : 0.62,
									},
								]}
							>
								{WELCOME_COPY.ctaFootnote}
							</Text>
						) : null}

						{/* <Pressable
							onPress={onSignIn}
							style={[styles.signInPressable, { opacity: 0.88 }]}
						>
							<Text style={[styles.signInText, { opacity: isDarkMode ? 0.68 : 0.6 }]}> 
								{WELCOME_COPY.resumeLabel || "Resume Visit"}
							</Text>
						</Pressable> */}
					</View>

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
									height: 22,
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
							source={require("../../../assets/hero/speed.png")}
							resizeMode="contain"
							style={[
								styles.heroImage,
								{ transform: [{ translateX: heroTranslateX }, { translateY: -8 }, { scale: 0.94 }] },
							]}
						/>
					</View>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}
