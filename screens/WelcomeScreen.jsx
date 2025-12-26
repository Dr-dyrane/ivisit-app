"use client";
import React, { useRef, useState } from "react";
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
	
	// Dynamic width tracking to ensure the 5% hint and text alignment are pixel-perfect
	const [buttonWidth, setButtonWidth] = useState(0);

	// Animation Value
	const fillAnim = useRef(new Animated.Value(0)).current;

	const handlePress = () => {
		if (Platform.OS !== "web") {
			// Using Medium impact for a more "tactile mechanical" feel than Success
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		}

		// Modern "AI" Curve: Starts extremely fast (responsive) and settles smoothly
		Animated.timing(fillAnim, {
			toValue: 1,
			duration: 450,
			easing: Easing.bezier(0.16, 1, 0.3, 1), 
			useNativeDriver: false,
		}).start(() => {
			router.push("onboarding");
			setTimeout(() => fillAnim.setValue(0), 500);
		});
	};

	// The Intentional 5% Hint
	const fillWidth = fillAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["5%", "100%"],
	});

	// Brand Colors Logic
	const PRIMARY_RED = "#86100E";
	const BUTTON_BG = isDarkMode ? "#161B22" : "#F3E7E7"; // Deeper dark for AI look
	const BASE_TEXT = isDarkMode ? "#FFFFFF" : PRIMARY_RED;
	const ACTIVE_TEXT = "#FFFFFF";
	const SLIDE_BG = PRIMARY_RED;

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
					className={`text-4xl font-bold tracking-tighter mt-2 ${
						isDarkMode ? "text-white" : "text-red-700"
					}`}
				>
					iVisit
				</Text>
			</View>

			{/* Hero Image - Slightly larger for modern feel */}
			<View className="w-full items-center">
				<Image
					source={require("../assets/hero/speed.png")}
					style={{ width: 340, height: 240 }}
					resizeMode="contain"
				/>
			</View>

			{/* Feature Text */}
			<View className="w-full items-center px-4">
				<Text
					className={`text-[38px] font-black text-center leading-[42px] tracking-tight ${
						isDarkMode ? "text-white" : "text-slate-900"
					}`}
				>
					Skip the wait.{"\n"}
					<Text style={{ color: PRIMARY_RED }}>Get care now.</Text>
				</Text>
				<Text
					className={`text-lg mt-5 text-center leading-6 ${
						isDarkMode ? "text-gray-400" : "text-gray-600"
					}`}
				>
					Book a bed. Get an ambulance. See a doctor.{"\n"}
					<Text className="font-semibold">Right when you need it.</Text>
				</Text>
			</View>

			{/* ANIMATED CTA BUTTON */}
			<View className="w-full px-4 mb-4">
				<Pressable 
					onPress={handlePress} 
					onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
					style={[styles.btnContainer, { backgroundColor: BUTTON_BG }]}
				>
					{/* LAYER 1: Stationary Base */}
					<View style={styles.contentLayer}>
						<Text style={[styles.btnText, { color: BASE_TEXT }]}>
							FIND CARE NOW
						</Text>
						<Fontisto
							name="helicopter-ambulance"
							size={22}
							color={BASE_TEXT}
						/>
					</View>

					{/* LAYER 2: Sliding Wipe (The Intentional 5%) */}
					<Animated.View
						style={[
							styles.slidingOverlay,
							{ width: fillWidth, backgroundColor: SLIDE_BG },
						]}
					>
						{/* CRITICAL FIX: We use the dynamic buttonWidth so text never "shifts" */}
						<View style={[styles.contentLayer, { width: buttonWidth }]}>
							<Text style={[styles.btnText, { color: ACTIVE_TEXT }]}>
								FIND CARE NOW
							</Text>
							<Fontisto
								name="helicopter-ambulance"
								size={22}
								color={ACTIVE_TEXT}
							/>
						</View>
					</Animated.View>
				</Pressable>
			</View>

			{/* Login Prompt */}
			<Text
				className={`text-center ${
					isDarkMode ? "text-gray-500" : "text-gray-500"
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
		height: 68,
		borderRadius: 24, // More rounded for modern AI feel
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
		...Platform.select({
			ios: {
				shadowColor: "#86100E",
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.15,
				shadowRadius: 12,
			},
			android: { elevation: 4 },
		}),
	},
	contentLayer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
	},
	btnText: {
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: 2,
		marginRight: 12,
	},
	slidingOverlay: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		overflow: "hidden",
	},
});

export default WelcomeScreen;