import React, { useEffect, useRef } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../contexts/ThemeContext";
import EntryActionButton from "../../entry/EntryActionButton";
import WelcomeAmbientGlows from "../WelcomeAmbientGlows";
import { WELCOME_COPY, WELCOME_INTENTS } from "../welcomeContent";
import useWelcomeWebSurfaceChrome from "../hooks/useWelcomeWebSurfaceChrome";
import createWelcomeWebSmWideTheme from "../welcomeWebSmWide.styles";

const WELCOME_WEB_SM_WIDE_SCROLLBAR_STYLE_ID =
	"welcome-web-sm-wide-scrollbar-style";

export default function WelcomeWebSmWideView({
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

		let styleElement = document.getElementById(
			WELCOME_WEB_SM_WIDE_SCROLLBAR_STYLE_ID,
		);
		let created = false;

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = WELCOME_WEB_SM_WIDE_SCROLLBAR_STYLE_ID;
			styleElement.textContent = `
				#welcome-web-sm-wide-scroll,
				#welcome-web-sm-wide-scroll > div {
					scrollbar-width: none;
					-ms-overflow-style: none;
				}

				#welcome-web-sm-wide-scroll::-webkit-scrollbar,
				#welcome-web-sm-wide-scroll > div::-webkit-scrollbar {
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
	}, []);

	const { colors, metrics, styles } = createWelcomeWebSmWideTheme({
		viewportHeight: height,
		viewportWidth: width,
		isDarkMode,
	});
	const actionWellMarginTop = metrics.showChip
		? metrics.stageSpacing.chipToActionWell
		: Math.max(metrics.stageSpacing.chipToActionWell - metrics.stageSpacing.helperToChip + 8, 20);

	return (
		<LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
			<WelcomeAmbientGlows
				topGlowStyle={styles.topGlow}
				bottomGlowStyle={styles.bottomGlow}
			/>

			<ScrollView
				nativeID="welcome-web-sm-wide-scroll"
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

					<View style={[styles.actionWell, { marginTop: actionWellMarginTop }]}>
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
							<Text style={styles.signInText}>Sign in</Text>
						</Pressable>
					</View>
				</Animated.View>
			</ScrollView>
		</LinearGradient>
	);
}
