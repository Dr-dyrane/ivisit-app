// screens/WelcomeScreen.js

import React, { useCallback } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import SlideButton from "../components/ui/SlideButton";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";

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
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();

	useFocusEffect(
		useCallback(() => {
			resetHeader();
			setHeaderState({
				hidden: true,
			});
		}, [resetHeader, setHeaderState])
	);

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
		router.push("login");
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
			className="flex-1 justify-between items-center px-6 pt-24 pb-12"
		>
			{/* Logo & Brand Name */}
			<View className="flex items-center w-full mt-4">
				<Image
					source={require("../assets/logo.png")}
					className="w-14 h-14"
					resizeMode="contain"
					style={{ borderRadius: 14 }}
				/>
				<Text
					className={`text-4xl mt-2`}
					// TODO: Make this dynamic based on theme
					style={{ 
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
						fontWeight: "900",
						letterSpacing: -1.0
					}}
				>
					iVisit
					<Text style={{ color: COLORS.brandPrimary, fontSize: 42 }}>.</Text>
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
					className={`text-[38px] text-center leading-[42px]`}
					style={{ 
						color: headlineColor,
						fontWeight: "900",
						letterSpacing: -1.0
					}}
				>
					Skip the wait.{"\n"}
					<Text style={{ color: PRIMARY_RED }}>Get care now.</Text>
				</Text>

				<Text
					className="text-lg mt-5 text-center leading-6"
					style={{ color: subTextColor, fontWeight: "500" }}
				>
					Book a bed. Get an ambulance. See a doctor.{"\n"}
					<Text style={{ fontWeight: "800", letterSpacing: 0.5 }}>Right when you need it.</Text>
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
