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
					? ["#2C2C2C", "#86100E", "#2C2C2C"]
					: ["#fff", "#FCF5F5", "#fff"]
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
					className="ml-1 w-6 h-6"
					resizeMode="contain"
				/>
				<Text
					className={`text-2xl font-bold ${
						isDarkMode ? "text-red-500" : "text-red-700"
					}`}
					style={{
						textShadowColor: "rgba(0, 0, 0, 0.25)",
						textShadowOffset: { width: 1, height: 1 },
						textShadowRadius: 2,
						WebkitTextStroke: "1px black", // This works only on web
					}}
				>
					iVisit
				</Text>
			</View>
			<Image
				source={require("../assets/hero/speed.png")}
				className="object-contain w-[400px] h-[216px] mt-20"
				resizeMode="contain"
			/>
			{/* Features Section */}
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
			>
				<View className="text-left justify-end">
					<Text
						className={`text-6xl font-[900] mb-2 tracking-tighter ${
							isDarkMode ? "text-white" : "text-primary"
						}`}
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
