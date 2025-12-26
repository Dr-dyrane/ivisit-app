import React, { useRef } from "react";
import {
	View,
	Text,
	Image,
	Pressable,
	Animated,
	Easing,
	StyleSheet,
	Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";

const WelcomeScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	// Animation Value
	const fillAnim = useRef(new Animated.Value(0)).current;

	const handlePress = () => {
		// 1. Trigger Haptics
		if (Platform.OS !== "web") {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		}

		// 2. Start the "Wipe" Animation
		Animated.timing(fillAnim, {
			toValue: 1,
			duration: 400,
			easing: Easing.bezier(0.33, 1, 0.68, 1), // Fast, smooth Bezier
			useNativeDriver: false, // Width/Clip don't support native driver
		}).start(() => {
			// 3. Navigate after animation
			router.push("onboarding");

			// Reset animation for when user comes back
			setTimeout(() => fillAnim.setValue(0), 500);
		});
	};

	// Interpolations
	const fillWidth = fillAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0%", "100%"],
	});

	// Colors based on your brand
	const PRIMARY_RED = "#86100E";
	const BUTTON_BG = isDarkMode ? "#1A1F2B" : "#F3E7E7";
	const BASE_TEXT = isDarkMode ? "#FFFFFF" : PRIMARY_RED;
	const ACTIVE_TEXT = isDarkMode ? PRIMARY_RED : "#FFFFFF";
	const SLIDE_BG = isDarkMode ? "#FFFFFF" : PRIMARY_RED;

	return (
		<LinearGradient
			colors={
				isDarkMode
					? ["#0B0F1A", "#0D121D", "#121826"]
					: ["#fff", "#F3E7E7", "#FFFAFA"]
			}
			className="flex-1 justify-between items-center px-6 py-12"
		>
			{/* Logo and Title */}
			<View className="flex items-center w-full mt-4">
				<Image
					source={require("../assets/logo.png")}
					className="w-14 h-14"
					resizeMode="contain"
				/>
				<Text
					className={`text-4xl font-bold tracking-wide mt-2 ${
						isDarkMode ? "text-white" : "text-red-600"
					}`}
				>
					iVisit
				</Text>
			</View>

			{/* Hero Image */}
			<Image
				source={require("../assets/hero/speed.png")}
				style={{ width: 320, height: 210 }}
				resizeMode="contain"
			/>

			{/* Feature Text */}
			<View className="w-full items-center px-4">
				<Text
					className={`text-4xl font-extrabold text-center leading-tight ${
						isDarkMode ? "text-white" : "text-slate-900"
					}`}
				>
					Skip the wait.{"\n"}
					<Text style={{ color: PRIMARY_RED }}>Get care now.</Text>
				</Text>
				<Text
					className={`text-lg mt-4 text-center leading-6 ${
						isDarkMode ? "text-gray-400" : "text-gray-700"
					}`}
				>
					Book a bed. Get an ambulance. See a doctor.{"\n"}
					<Text className="font-semibold">Right when you need it.</Text>
				</Text>
			</View>

			{/* ANIMATED CTA BUTTON */}
			<View className="w-full px-4 mb-4">
				<Pressable onPress={handlePress} style={styles.btnContainer}>
					<View style={[styles.buttonBase, { backgroundColor: BUTTON_BG }]}>
						{/* LAYER 1: The Stationary Base Text */}
						<View style={styles.textLayer}>
							<Text style={[styles.btnText, { color: BASE_TEXT }]}>
								FIND CARE NOW
							</Text>
							<Fontisto
								name="helicopter-ambulance"
								size={24}
								color={BASE_TEXT}
							/>
						</View>

						{/* LAYER 2: The Animated Sliding Mask */}
						<Animated.View
							style={[
								styles.slidingOverlay,
								{ width: fillWidth, backgroundColor: SLIDE_BG },
							]}
						>
							{/* This view MUST have the same width as the parent button to keep text aligned */}
							<View
								style={{
									width: 340,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Text style={[styles.btnText, { color: ACTIVE_TEXT }]}>
									FIND CARE NOW
								</Text>
								<Fontisto
									name="helicopter-ambulance"
									size={24}
									color={ACTIVE_TEXT}
								/>
							</View>
						</Animated.View>
					</View>
				</Pressable>
			</View>

			{/* Login Prompt */}
			<Text
				className={`text-center ${
					isDarkMode ? "text-gray-400" : "text-gray-600"
				}`}
			>
				Already have an account?
				<Text
					className="font-bold text-red-600"
					onPress={() => router.push("login")}
				>
					{" "}
					Login
				</Text>
			</Text>
		</LinearGradient>
	);
};

const styles = StyleSheet.create({
	btnContainer: {
		width: "100%",
		height: 64,
		borderRadius: 20,
		overflow: "hidden", // Crucial for the sliding effect
		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 8,
			},
			android: { elevation: 6 },
		}),
	},
	buttonBase: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	textLayer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	btnText: {
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: 1.5,
		marginRight: 10,
	},
	slidingOverlay: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		overflow: "hidden", // Acts as the mask for the second text layer
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start", // Keeps inner text anchored to the left
	},
});

export default WelcomeScreen;
