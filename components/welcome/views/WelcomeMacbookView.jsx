import React, { useEffect, useRef } from "react";
import { Animated, Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import useAuthViewport from "../../../hooks/ui/useAuthViewport";
import EntryActionButton from "../../entry/EntryActionButton";
import WelcomeAmbientGlows from "../WelcomeAmbientGlows";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import createWelcomeMacbookTheme from "../welcomeMacbook.styles";

export default function WelcomeMacbookView({
	onRequestHelp,
	onFindHospitalBed,
	onSignIn,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const {
		isShortHeight,
		isLargeMonitor,
		horizontalPadding,
		entryPrimaryActionHeight,
	} = useAuthViewport();

	const entranceOpacity = useRef(new Animated.Value(0)).current;
	const entranceTranslate = useRef(new Animated.Value(18)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(entranceOpacity, {
				toValue: 1,
				duration: 260,
				useNativeDriver: true,
			}),
			Animated.spring(entranceTranslate, {
				toValue: 0,
				tension: 48,
				friction: 10,
				useNativeDriver: true,
			}),
		]).start();
	}, [entranceOpacity, entranceTranslate]);

	const { colors, metrics, styles } = createWelcomeMacbookTheme({
		isDarkMode,
		isShortHeight,
		isLargeMonitor,
		horizontalPadding,
		insetsTop: insets?.top || 0,
		insetsBottom: insets?.bottom || 0,
		entryPrimaryActionHeight,
	});

	return (
		<LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
			<WelcomeAmbientGlows
				topGlowStyle={styles.topGlow}
				bottomGlowStyle={styles.bottomGlow}
			/>

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

						<Pressable
							onPress={onSignIn}
							style={[
								styles.signInPressable,
								Platform.OS === "web" ? { cursor: "pointer" } : null,
							]}
						>
							<Text style={styles.signInText}>Sign in</Text>
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
