// screens/WelcomeScreen.js

"use client";
import React from "react";
import { View, Text, Image } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import SlideButton from "../components/ui/SlideButton";

const PRIMARY_RED = "#86100E";

const WelcomeScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	return (
		<LinearGradient
			colors={
				isDarkMode
					? ["#0B0F1A", "#0D121D", "#121826"]
					: ["#fff", "#F3E7E7", "#FFFAFA"]
			}
			className="flex-1 justify-between items-center px-6 py-12"
		>
			{/* Logo */}
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

			{/* Hero */}
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

			{/* CTA */}
			<View className="w-full px-4 mb-4">
				<SlideButton
					onPress={() => router.push("onboarding")}
					icon={(color) => (
						<Fontisto name="helicopter-ambulance" size={22} color={color} />
					)}
				>
					FIND CARE NOW
				</SlideButton>
			</View>

			{/* Login */}
			<Text className="text-center text-gray-500">
				Already have an account?
				<Text
					className="font-bold text-red-600"
					// onPress={() => router.push("login")}
				>
					{" "}
					Login
				</Text>
			</Text>
		</LinearGradient>
	);
};

export default WelcomeScreen;
