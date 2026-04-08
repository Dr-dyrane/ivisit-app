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

export default function WelcomeWideWebView({
	onRequestHelp,
	onFindHospitalBed,
	onSignIn,
	createTheme,
	animation = {},
}) {
	const { isDarkMode } = useTheme();
	const { height, width } = useWindowDimensions();
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;
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
	}, [duration, tension, friction, entranceOpacity, entranceTranslate]);

	const { colors, metrics, styles } = createTheme({
		viewportHeight: height,
		viewportWidth: width,
		isDarkMode,
	});

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

						<View style={styles.copyBlock}>
							<Text style={styles.headline}>{WELCOME_COPY.headline}</Text>
							<Text style={styles.helper}>{WELCOME_COPY.helper}</Text>
							<View style={styles.chip}>
								<Text style={styles.chipText}>{WELCOME_COPY.chip}</Text>
							</View>
						</View>

						<View style={styles.actions}>
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
							<Text style={styles.signInText}>{WELCOME_COPY.resumeLabel || "Resume Visit"}</Text>
						</Pressable>
					</View>

					<View style={styles.heroPanel}>
						<View pointerEvents="none" style={styles.heroRing} />
						<Image
							source={require("../../../assets/features/emergency.png")}
							resizeMode="contain"
							style={styles.heroImage}
						/>
					</View>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}
