import React, { useEffect, useRef } from "react";
import { Animated, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../contexts/ThemeContext";
import { getWelcomeRootBackground } from "../../../constants/welcomeTheme";
import EntryActionButton from "../../entry/EntryActionButton";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import createWelcomeWebMobileTheme from "../welcomeWebMobile.styles";

export default function WelcomeWebMobileView({
	onRequestHelp,
	onFindHospitalBed,
	onSignIn,
}) {
	const { isDarkMode } = useTheme();
	const { height } = useWindowDimensions();
	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(entranceOpacity, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.spring(entranceTranslate, {
				toValue: 0,
				tension: 54,
				friction: 10,
				useNativeDriver: true,
			}),
		]).start();
	}, [entranceOpacity, entranceTranslate]);

	useEffect(() => {
		if (Platform.OS !== "web" || typeof document === "undefined") {
			return undefined;
		}

		const previousHtmlBackground = document.documentElement.style.backgroundColor;
		const previousBodyBackground = document.body.style.backgroundColor;
		const rootElement = document.getElementById("root");
		const previousRootBackground = rootElement?.style.backgroundColor;

		const rootBackground = getWelcomeRootBackground(isDarkMode);
		document.documentElement.style.backgroundColor = rootBackground;
		document.body.style.backgroundColor = rootBackground;
		document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
		if (rootElement) {
			rootElement.style.backgroundColor = rootBackground;
		}

		return () => {
			document.documentElement.style.backgroundColor = previousHtmlBackground;
			document.body.style.backgroundColor = previousBodyBackground;
			document.documentElement.style.colorScheme = "";
			if (rootElement) {
				rootElement.style.backgroundColor = previousRootBackground || "";
			}
		};
	}, [isDarkMode]);

	const { colors, metrics, styles } = createWelcomeWebMobileTheme({
		viewportHeight: height,
		isDarkMode,
	});

	return (
		<LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
			<View pointerEvents="none" style={styles.topGlow} />
			<View pointerEvents="none" style={styles.bottomGlow} />

			<ScrollView
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

						<View style={styles.chip}>
							<Text style={styles.chipText}>{WELCOME_COPY.chip}</Text>
						</View>
					</View>

					<View style={styles.actionWell}>
						<View style={styles.actions}>
							{WELCOME_INTENTS.map((intent) => (
								<EntryActionButton
									key={intent.key}
									label={intent.label}
									variant={intent.variant}
									height={
										intent.variant === "primary"
											? metrics.primaryActionHeight
											: metrics.secondaryActionHeight
									}
									onPress={
										intent.key === "emergency" ? onRequestHelp : onFindHospitalBed
									}
								/>
							))}
						</View>

						<Pressable onPress={onSignIn} style={styles.signInPressable}>
							<Text style={styles.signInText}>Sign in</Text>
						</Pressable>
					</View>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}
