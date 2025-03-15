// screens/OnboardingScreen.js

import React, { useState, useRef } from "react";
import {
	View,
	Text,
	Pressable,
	PanResponder,
	Animated,
	Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import useSwipeGesture from "../utils/useSwipeGesture";

import welcome from "../assets/features/welcome.png";
import transaction from "../assets/features/transaction.png";
import bill from "../assets/features/bill.png";
import secure from "../assets/features/secure.png";

const onboardingData = [
	{
		title: "Welcome to SwitchPay",
		description:
			"Empowering agents with efficient fund management solutions at their fingertips.",
		icon: "cash-outline",
		image: welcome,
		colorHex: "#d268cc",
	},
	{
		title: "Effortless Transaction Management",
		description:
			"Manage customer deposits and withdrawals quickly and securely.",
		icon: "arrow-redo-outline",
		image: transaction,
		colorHex: "#96a6da",
	},
	{
		title: "Simple Bill Payments",
		description: "Help your customers pay bills effortlessly and on time.",
		icon: "wallet-outline",
		image: bill,
		colorHex: "#d268cc",
	},
	{
		title: "Secure Services",
		description:
			"Ensure customer data is protected with advanced encryption technologies.",
		icon: "shield-checkmark-outline",
		image: secure,
		colorHex: "#4caf50",
	},
];

const OnboardingScreen = () => {
	const router = useRouter();
	const [currentIndex, setCurrentIndex] = useState(0);

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

	return (
		<LinearGradient
			colors={["#fff", onboardingData[currentIndex].colorHex + "20", "#fff"]}
			className="flex-1 justify-between items-center p-6"
			{...panResponder}
		>
			<Animated.View className="flex-1 justify-center items-center">
				<Image
					source={onboardingData[currentIndex].image}
					resizeMode="contain"
					className="w-[360px] h-[400px]"
				/>
			</Animated.View>

			<Animated.View className="flex justify-center items-center mb-20">
				<View className="flex flex-row space-x-4 justify-center items-center">
					{/* Icon container with dynamic color */}
					<View
						style={{
							borderColor: onboardingData[currentIndex].colorHex + "50", // Slightly transparent border
							backgroundColor: onboardingData[currentIndex].colorHex + "20", // Light background based on colorHex
						}}
						className="border-2 rounded-full p-3"
					>
						<Ionicons
							name={onboardingData[currentIndex].icon}
							size={60}
							color={onboardingData[currentIndex].colorHex}
						/>
					</View>

					{/* Text container */}
					<View className="flex flex-col items-start justify-start flex-shrink">
						<Text
							style={{ color: onboardingData[currentIndex].colorHex }}
							className="text-3xl font-bold text-start mb-2"
						>
							{onboardingData[currentIndex].title}
						</Text>
						<Text className="text-lg text-slate-800 text-start">
							{onboardingData[currentIndex].description}
						</Text>
					</View>
				</View>
			</Animated.View>

			<View className="flex-row justify-between mb-5 w-full">
				{/* Back Button */}
				<Pressable
					onPress={() => handleSwipeRight()}
					className={`flex-1 py-2.5 mx-2 rounded-lg ${
						currentIndex === 0 ? "bg-gray-400/10" : "bg-gray-600/10"
					}`}
					disabled={currentIndex === 0}
					style={{ opacity: currentIndex === 0 ? 0.5 : 1 }} // Opacity for disabled state
				>
					<Text
						style={{ color: currentIndex === 0 ? "#a0aec0" : "black" }} // Use current hex color
						className="font-bold text-center"
					>
						Back
					</Text>
				</Pressable>

				{/* Indicator Dots */}
				<View className="flex-row items-center flex-1 justify-center">
					{onboardingData.map((_, index) => (
						<View
							key={index}
							className={`w-2.5 h-2.5 rounded-full mx-1 ${
								currentIndex === index ? "bg-green-400" : "bg-gray-300"
							}`}
							style={{
								backgroundColor:
									currentIndex === index
										? onboardingData[index].colorHex
										: "gray",
							}} // Use colorHex for active indicator
						/>
					))}
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
					className={`flex-1 py-2.5 mx-2 rounded-lg ${
						currentIndex === onboardingData.length - 1
							? "bg-primary/10"
							: "bg-green-500/10"
					}`}
					style={{
						backgroundColor:
							currentIndex === onboardingData.length - 1
								? onboardingData[currentIndex].colorHex + "80" // Use colorHex for Register button
								: onboardingData[currentIndex].colorHex + "80", // Use colorHex for Next button
					}}
				>
					<Text
						style={{
							color: "black",
						}} // Use current hex color for text
						className="font-bold text-center"
					>
						{currentIndex === onboardingData.length - 1 ? "Register" : "Next"}
					</Text>
				</Pressable>
			</View>
		</LinearGradient>
	);
};

export default OnboardingScreen;
