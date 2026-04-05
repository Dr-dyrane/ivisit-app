import React, { useEffect, useRef } from "react";
import {
	Animated,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../contexts/ThemeContext";
import EntryActionButton from "../../entry/EntryActionButton";
import WelcomeAmbientGlows from "../WelcomeAmbientGlows";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import useWelcomeWebSurfaceChrome from "../hooks/useWelcomeWebSurfaceChrome";
import createWelcomeWebMdTheme from "../welcomeWebMd.styles";

export default function WelcomeWebMdView({
	onRequestHelp,
	onFindHospitalBed,
	onSignIn,
}) {
	const { isDarkMode } = useTheme();
	const { height, width } = useWindowDimensions();
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;

	useWelcomeWebSurfaceChrome(isDarkMode);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(entranceOpacity, {
				toValue: 1,
				duration: 240,
				useNativeDriver: true,
			}),
			Animated.spring(entranceTranslate, {
				toValue: 0,
				tension: 52,
				friction: 10,
				useNativeDriver: true,
			}),
		]).start();
	}, [entranceOpacity, entranceTranslate]);

	const { colors, metrics, styles } = createWelcomeWebMdTheme({
		viewportHeight: height,
		isDarkMode,
		horizontalPadding: width >= 960 ? 40 : 32,
	});
	const actionsMarginTop = metrics.showChip
		? metrics.stageSpacing.chipToActions
		: Math.max(metrics.stageSpacing.chipToActions - metrics.stageSpacing.helperToChip + 8, 20);

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
					<View style={styles.brandBlock}>
						<Image
							source={require("../../../assets/logo.png")}
							resizeMode="contain"
							style={styles.logo}
						/>
						<Text style={styles.brandText}>
							iVisit
							<Text style={styles.brandDot}>.</Text>
						</Text>
					</View>

					<View style={styles.heroBlock}>
						<Image
							source={require("../../../assets/features/emergency.png")}
							resizeMode="contain"
							style={styles.heroImage}
						/>
					</View>

					<View style={styles.copyBlock}>
						<Text style={styles.headline}>{WELCOME_COPY.headline}</Text>
						<Text style={styles.helper}>{WELCOME_COPY.helper}</Text>

						{metrics.showChip ? (
							<View style={styles.chip}>
								<Text style={styles.chipText}>{WELCOME_COPY.chip}</Text>
							</View>
						) : null}
					</View>

					<View style={[styles.actions, { marginTop: actionsMarginTop }]}>
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
									label={intent.label}
									variant={intent.variant}
									height={
										intent.variant === "primary"
											? metrics.primaryActionHeight
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

					<Pressable onPress={onSignIn} style={styles.signInPressable}>
						<Text style={styles.signInText}>Sign in</Text>
					</Pressable>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}
