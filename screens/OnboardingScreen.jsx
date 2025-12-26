// screens/OnboardingScreen.js

import React, { useState } from "react";
import { View, Text, Pressable, Animated, Image } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import useSwipeGesture from "../utils/useSwipeGesture";
import { useTheme } from "../contexts/ThemeContext";

// Images (keep import names, can swap later)
import emergency from "../assets/features/emergency.png";
import urgentCare from "../assets/features/urgent.png";
import bedBooking from "../assets/features/bed.png";
import checkup from "../assets/features/checkup.png";

const onboardingData = [
  {
    title: "Emergency Response",
    description: "24/7 rapid emergency medical response.",
    icon: "medkit-outline",
    image: emergency,
    colorHex: { 
      light: "#f43f5e", // vivid red for light mode
      dark: "#f87171",  // slightly muted/red for dark mode
    },
  },
  {
    title: "Urgent Care",
    description: "Immediate care for medical needs.",
    icon: "heart-outline",
    image: urgentCare,
    colorHex: { 
      light: "#96a6da", 
      dark: "#6366f1", 
    },
  },
  {
    title: "Bed Booking",
    description: "Reserve hospital beds in advance.",
    icon: "bed-outline",
    image: bedBooking,
    colorHex: { 
      light: "#d268cc", 
      dark: "#a855f7", 
    },
  },
  {
    title: "General Check-ups",
    description: "Comprehensive health assessments.",
    icon: "medkit-outline",
    image: checkup,
    colorHex: { 
      light: "#4caf50", 
      dark: "#22c55e", 
    },
  },
];


const OnboardingScreen = () => {
	const router = useRouter();
	const [currentIndex, setCurrentIndex] = useState(0);
	const { isDarkMode } = useTheme();

	const handleSwipeLeft = () => {
		if (currentIndex < onboardingData.length - 1) {
			setCurrentIndex(currentIndex + 1);
		}
	};

	const handleSwipeRight = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	const panResponder = useSwipeGesture(handleSwipeLeft, handleSwipeRight);

	const getColor = (colorObj) =>
		colorObj?.[isDarkMode ? "dark" : "light"] ?? "#cccccc";

	const currentFeature = onboardingData[currentIndex];
	const featureColor = getColor(currentFeature.colorHex);

	const gradientColors = isDarkMode
		? ["#0B0F1A", "#0D121D", "#121826"]
		: ["#ffffff", featureColor + "20", "#ffffff"];

	return (
		<LinearGradient
			colors={gradientColors}
			className="flex-1 justify-between items-center p-6"
			{...panResponder}
		>
			{/* Feature Image */}
			<Animated.View className="flex-1 justify-center items-center">
				<Image
					source={currentFeature.image}
					resizeMode="contain"
					className="w-[360px] h-[400px]"
				/>
			</Animated.View>

			{/* Feature Info */}
			<Animated.View className="flex justify-center items-center mb-20 w-full">
				<View className="flex flex-row space-x-4 justify-center items-center">
					{/* Icon container */}
					<View
						style={{
							borderColor: featureColor + "50",
							backgroundColor: featureColor + "20",
						}}
						className="border-2 rounded-full p-3"
					>
						<Ionicons
							name={currentFeature.icon}
							size={60}
							color={featureColor}
						/>
					</View>

					{/* Text container */}
					<View className="flex flex-col items-start justify-start flex-shrink">
						<Text
							style={{ color: featureColor }}
							className="text-3xl font-bold mb-2"
						>
							{currentFeature.title}
						</Text>
						<Text
							className={`text-lg ${
								isDarkMode ? "text-gray-400" : "text-gray-800"
							}`}
						>
							{currentFeature.description}
						</Text>
					</View>
				</View>
			</Animated.View>

			{/* Bottom Controls */}
			<View className="flex-row justify-between mb-5 w-full">
				{/* Back Button */}
				<Pressable
					onPress={handleSwipeRight}
					disabled={currentIndex === 0}
					className={`flex-1 py-2.5 mx-2 rounded-lg ${
						currentIndex === 0 ? "bg-gray-400/10" : "bg-gray-600/10"
					}`}
					style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
				>
					<Text
						style={{
							color:
								currentIndex === 0
									? isDarkMode
										? "#718096"
										: "#a0aec0" // disabled color
									: isDarkMode
									? "#ffffff"
									: "#000000", // active color
						}}
						className="font-bold text-center"
					>
						Back
					</Text>
				</Pressable>

				{/* Indicator Dots */}
				<View className="flex-row items-center flex-1 justify-center">
					{onboardingData.map((item, index) => {
						const dotColor =
							index === currentIndex ? getColor(item.colorHex) : "gray";
						return (
							<View
								key={index}
								className="w-2.5 h-2.5 rounded-full mx-1"
								style={{ backgroundColor: dotColor }}
							/>
						);
					})}
				</View>

				{/* Next/Register Button */}
				<Pressable
					onPress={() => {
						if (currentIndex === onboardingData.length - 1) {
							router.push("signup");
						} else {
							handleSwipeLeft();
						}
					}}
					className="flex-1 py-2.5 mx-2 rounded-lg"
					style={{
						backgroundColor: featureColor + "80",
					}}
				>
					<Text style={{ color: "black" }} className="font-bold text-center">
						{currentIndex === onboardingData.length - 1 ? "Register" : "Next"}
					</Text>
				</Pressable>
			</View>
		</LinearGradient>
	);
};

export default OnboardingScreen;
