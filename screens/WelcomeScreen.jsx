// screens/WelcomeScreen.js

"use client";

import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import SlideButton from "../components/ui/SlideButton";

/**
 * Primary brand color.
 */
// use brand color from constants
const PRIMARY_RED = COLORS.brandPrimary;

/**
 * WelcomeScreen
 *
 * The initial landing screen for the iVisit app.
 * Features:
 * - Brand logo & name
 * - Hero illustration
 * - Value proposition copy
 * - CTA to start booking care
 * - Login prompt for existing users
 *
 * Apple-style emphasis:
 * - Minimalist layout
 * - Clear hierarchy
 * - Generous padding & spacing
 * - Easy-to-read typography
 */
const WelcomeScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	// Gradient background based on theme
	const backgroundColors = isDarkMode
		? ["#0B0F1A", "#0D121D", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFAFA"];

	// Text colors
	const headlineColor = isDarkMode ? "#FFFFFF" : "#1F2937";
	const subTextColor = isDarkMode ? "#9CA3AF" : "#64748B";
	const loginTextColor = isDarkMode ? "#AAAAAA" : "#6B7280";

	/**
	 * Navigate to login screen
	 */
	const handleLoginPress = () => {
		// router.push("login");
	};

	/**
	 * Navigate to onboarding/booking flow
	 */
	const handleCTA = () => {
		router.push("onboarding");
	};

	return (
		<LinearGradient
			colors={backgroundColors}
			className="flex-1 justify-between items-center px-6 py-12"
		>
			{/* Logo & Brand Name */}
			<View className="flex items-center w-full mt-4">
				<Image
					source={require("../assets/logo.png")}
					className="w-14 h-14"
					resizeMode="contain"
				/>
				<Text
					className={`text-4xl font-bold tracking-tighter mt-2`}
					style={{ color: isDarkMode ? "#FFFFFF" : PRIMARY_RED }}
				>
					iVisit
				</Text>
			</View>

			{/* Hero Illustration */}
			<View className="w-full items-center">
				<Image
					source={require("../assets/hero/speed.png")}
					style={{ width: 340, height: 240 }}
					resizeMode="contain"
				/>
			</View>

			{/* Value Proposition */}
			<View className="w-full items-center px-4">
				<Text
					className={`text-[38px] font-black text-center leading-[42px] tracking-tight`}
					style={{ color: headlineColor }}
				>
					Skip the wait.{"\n"}
					<Text style={{ color: PRIMARY_RED }}>Get care now.</Text>
				</Text>

				<Text
					className="text-lg mt-5 text-center leading-6"
					style={{ color: subTextColor }}
				>
					Book a bed. Get an ambulance. See a doctor.{"\n"}
					<Text className="font-semibold">Right when you need it.</Text>
				</Text>
			</View>

			{/* Call-to-Action */}
			<View className="w-full px-4 mb-4">
				<SlideButton
					onPress={handleCTA}
					icon={(color) => (
						<Fontisto name="helicopter-ambulance" size={32} color={color} />
					)}
				>
					FIND CARE NOW
				</SlideButton>
			</View>

			{/* Login Prompt */}
			<Pressable onPress={handleLoginPress} className="items-center mb-2">
				<Text className="text-center" style={{ color: loginTextColor }}>
					Have an account? <Text className="font-bold text-red-600">Login</Text>
				</Text>
			</Pressable>
		</LinearGradient>
	);
};

export default WelcomeScreen;
