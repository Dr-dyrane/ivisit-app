// screens/WelcomeScreen.js

import React from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

const WelcomeScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	return (
		<LinearGradient
			colors={
				isDarkMode
					? ["#0B0F1A", "#0D121D", "#121826"] // Dark mode gradient with smoother transition
					: ["#fff", "#F3E7E7", "#FFFAFA"]
			}
			className="flex-1 min-h-screen justify-between items-center px-6 py-12 w-full"
		>
			{/* Logo and Title */}
			<View className="flex items-center w-full space-y-3">
				<Image
					source={require("../assets/logo.png")}
					className="w-14 h-14"
					resizeMode="contain"
				/>
				<Text
					className={`text-4xl font-bold tracking-wide ${
						isDarkMode ? "text-white" : "text-red-600"
					}`}
				>
					iVisit
				</Text>

				{/* SOS Button - Absolute Top Right */}
				<Pressable
					className="bg-destructive w-auto absolute right-0 flex-row px-6 py-4 rounded-full items-center justify-center space-x-3 shadow-lg active:scale-95"
					onPress={() => router.push("onboarding")}
					style={{
						shadowColor: isDarkMode ? "#000" : "#B91C1C",
						shadowOpacity: isDarkMode ? 0.3 : 0.2,
						shadowRadius: isDarkMode ? 12 : 10,
					}}
				>
					<MaterialCommunityIcons name="ambulance" size={28} color="white" />
					<Text className="text-white text-lg font-bold">SOS</Text>
				</Pressable>
			</View>

			{/* Hero Image */}
			<Image
				source={require("../assets/hero/speed.png")}
				className="w-full max-w-[340px] mt-8"
				resizeMode="contain"
				style={{
					width: 340,
					height: 340 / (1047 / 687), // Maintains aspect ratio
				}}
			/>

			{/* Feature Text */}
			<View className="w-full items-center px-6 text-center">
				<Text
					className={`text-4xl font-extrabold text-center leading-snug ${
						isDarkMode ? "text-white" : "text-primary"
					}`}
				>
					Skip the wait.
					<Text className="text-red-500"> Get care now.</Text>
				</Text>
				<Text
					className={`text-lg mt-4 text-center leading-relaxed ${
						isDarkMode ? "text-gray-400" : "text-gray-700"
					}`}
				>
					Book a bed. Get an ambulance. See a doctor.
					<Text className="font-semibold"> Right when you need it.</Text>
				</Text>
			</View>

			{/* CTA Button */}
			<View className="w-full px-6 mt-8">
				<Pressable
					className="bg-primary w-full flex-row px-6 py-5 rounded-3xl items-center justify-center space-x-3 shadow-lg active:scale-95"
					onPress={() => router.push("onboarding")}
					style={{
						shadowColor: isDarkMode ? "#000" : "#B91C1C",
						shadowOpacity: isDarkMode ? 0.3 : 0.2,
						shadowRadius: isDarkMode ? 12 : 10,
					}}
				>
					<Text className="text-white text-lg font-bold">Find Care Now</Text>
					<Fontisto name="helicopter-ambulance" size={28} color="white" />
				</Pressable>
			</View>

			{/* Login Prompt */}
			<Text
				className={`mt-8 text-lg text-center ${
					isDarkMode ? "text-gray-400" : "text-gray-600"
				}`}
			>
				Already have an account?
				<Text
					className={`font-semibold ${
						isDarkMode ? "text-red-400" : "text-red-600"
					}`}
					onPress={() => router.push("login")}
				>
					{" "}
					Login
				</Text>
			</Text>
		</LinearGradient>
	);
};

export default WelcomeScreen;
