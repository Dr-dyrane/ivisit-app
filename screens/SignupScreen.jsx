// screens/SignupScreen.js
"use client";
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Animated, SafeAreaView, Pressable, Dimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import SignUpMethodCard from "../components/SignUpMethodCard";
import AuthInputModal from "../components/AuthInputModal";

const { width } = Dimensions.get("window");

export default function SignupScreen() {
	const { isDarkMode } = useTheme();
	const [modalVisible, setModalVisible] = useState(false);
	const [authType, setAuthType] = useState(null);

	// Entrance Animations
	const headerAnim = useRef(new Animated.Value(-20)).current;
	const methodAnim = useRef(new Animated.Value(30)).current;
	const socialAnim = useRef(new Animated.Value(30)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	const colors = {
		background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
		card: isDarkMode ? "#121826" : "#F3E7E7",
		text: isDarkMode ? "#FFFFFF" : "#1F2937",
		subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
		primary: "#86100E",
	};

	useEffect(() => {
		Animated.stagger(150, [
			Animated.parallel([
				Animated.spring(headerAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
			]),
			Animated.spring(methodAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
			Animated.spring(socialAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
		]).start();
	}, []);

	const openAuthModal = (type) => {
		setAuthType(type);
		setModalVisible(true);
	};

	return (
		<LinearGradient colors={colors.background} className="flex-1 p-8">
	

				{/* MAIN METHODS */}
				<Animated.View
					style={{ opacity, transform: [{ translateY: methodAnim }] }}
					className="flex-1 justify-center"
				>
					<SignUpMethodCard onSelect={openAuthModal} />

					{/* DIVIDER */}
					<View className="flex-row items-center my-10">
						<View className="flex-1 h-[1px] bg-gray-500/10" />
						<Text className="px-6 text-[10px] font-black tracking-[3px] text-gray-400">SOCIAL CONNECT</Text>
						<View className="flex-1 h-[1px] bg-gray-500/10" />
					</View>

					{/* SOCIAL BUTTONS */}
					<Animated.View
						style={{ opacity, transform: [{ translateY: socialAnim }] }}
						className="flex-row justify-between"
					>
						<SocialIcon name="apple" color={colors.text} bg={colors.card} />
						<SocialIcon name="google" color={colors.text} bg={colors.card} />
						<SocialIcon name="x" color={colors.text} bg={colors.card} />
					</Animated.View>
				</Animated.View>

				{/* LEGAL FOOTER */}
				<View className="pb-8">
					<Text className="text-center text-[10px] leading-4 text-gray-500 font-medium">
						By continuing, you agree to iVisit's{"\n"}
						<Text className="font-bold underline">Terms</Text> & <Text className="font-bold underline">Privacy</Text>.{"\n"}
						We require <Text style={{ color: colors.primary }} className="font-black">Location Access</Text> for dispatch.
					</Text>
				</View>

			<AuthInputModal
				visible={modalVisible}
				type={authType}
				onClose={() => setModalVisible(false)}
			/>
		</LinearGradient>
	);
}

const SocialIcon = ({ name, color, bg }) => {
	const scale = useRef(new Animated.Value(1)).current;
	const { isDarkMode } = useTheme();

	const handlePress = () => {
		Animated.sequence([
			Animated.timing(scale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
			Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
		]).start();
	};

	return (
		<Pressable onPressIn={handlePress}>
			<Animated.View
				style={{
					backgroundColor: bg,
					width: width * 0.23,
					height: 64,
					borderRadius: 20,
					alignItems: "center",
					justifyContent: "center",
					// borderWidth: 1,
					borderColor: isDarkMode ? "#222" : "#EEE",
					transform: [{ scale }]
				}}
			>
				<AntDesign name={name} size={24} color={color} />
			</Animated.View>
		</Pressable>
	);
};