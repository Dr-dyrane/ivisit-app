// screens/WelcomeScreen.js

import React from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

const WelcomeScreen = () => {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	return (
		<LinearGradient
			colors={
				isDarkMode
					? ["#0D121D", "#86100E", "#121826"]
					: ["#fff", "#F3E7E7", "#FFFAFA"]
			}
			className="flex-1 min-h-screen justify-between items-center p-8 pb-16 pt-14 w-full relative"
		>
			{/* Theme Toggle for testing */}
			<View className="absolute top-12 right-6 z-10">
				<ThemeToggle size="sm" showLabel={false} />
			</View>

			<View className="flex flex-col items-center justify-center">
				<Image
					source={require("../assets/logo.png")}
					className="w-12 h-12 p-1"
					resizeMode="contain"
					style={{
						shadowColor: isDarkMode ? "#86100E" : "#FF7070",
						shadowOffset: { width: 0, height: 2 },
						shadowOpacity: 0.3,
						shadowRadius: 6,
					}}
				/>
				<Text
					className={`text-4xl font-bold ${
						isDarkMode ? "text-red-500" : "text-red-700"
					}`}
					style={{
						textShadowColor: "rgba(0, 0, 0, 0.25)",
						textShadowOffset: { width: 1, height: 1 },
						textShadowRadius: 2,
					}}
				>
					iVisit
				</Text>
			</View>
			<Image
				source={require("../assets/hero/speed.png")}
				className="object-contain w-[400px] h-[220px] mt-20 pb-3"
				resizeMode="contain"
				style={{
					shadowColor: "rgba(0, 0, 0, 0.5)",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.3,
					shadowRadius: 10,
				}}
			/>
			{/* Features Section */}
			<ScrollView
				className="flex-1 w-full"
				contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
			>
				<View className="text-left justify-end w-full">
					<Text
						className={`text-5xl md:text-6xl font-extrabold tracking-tight leading-tight ${
							isDarkMode ? "text-white" : "text-primary"
						}`}
						style={{
							textShadowColor: isDarkMode ? "#86100E" : "rgba(0, 0, 0, 0.15)",
							textShadowOffset: { width: 1, height: 2 },
							textShadowRadius: 4,
						}}
					>
						Urgent Care, Instantly.
					</Text>

					<Text
						className={`text-lg ${
							isDarkMode ? "text-gray-300" : "text-gray-600"
						}`}
					>
						Book a bed, get an ambulance, or see a doctor—right when you need
						it.
					</Text>
				</View>
			</ScrollView>
			<View>
				{/* Container for buttons */}
				<View className="flex-row mt-4 w-full">
					<Pressable
						style={{
							shadowColor: isDarkMode ? "#86100E" : "#F87171",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.3,
							shadowRadius: 6,
						}}
						className="bg-primary flex-1 flex-row px-6 py-4 rounded-xl items-center justify-between space-x-4"
						onPress={() => router.push("onboarding")}
					>
						<Text className="text-white text-xl font-bold text-center">
							Find Care Now
						</Text>
						<View className="w-8 h-8 bg-none border border-white rounded-full justify-center items-center">
							<Fontisto name="helicopter-ambulance" size={18} color="white" />
						</View>
					</Pressable>
				</View>

				{/* Prompt for existing users */}
				<Text
					className={`mt-4 text-lg text-center ${
						isDarkMode ? "text-gray-400" : "text-gray-500"
					}`}
				>
					Already have an account?
					{"  "}
					<Text
						className={`font-bold ${
							isDarkMode ? "text-red-500" : "text-primary"
						}`}
						onPress={() => router.push("login")}
					>
						Login
					</Text>
				</Text>
			</View>
		</LinearGradient>
	);
};

export default WelcomeScreen;
