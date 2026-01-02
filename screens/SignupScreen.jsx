// screens/SignupScreen.js

"use client";

import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Text,
	Animated,
	SafeAreaView,
	Pressable,
	Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import SignUpMethodCard from "../components/SignUpMethodCard";
import AuthInputModal from "../components/register/AuthInputModal";

/**
 * SignupScreen
 *
 * Displays the signup options including:
 * - Main signup methods via SignUpMethodCard
 * - Social login buttons (Apple, Google, X)
 * - Legal footer
 * - Modal for detailed authentication input
 *
 * Responsibilities:
 * - Handles entrance animations for content and social buttons
 * - Opens AuthInputModal for selected method
 * - Uses theme context to dynamically style components
 */

const { width } = Dimensions.get("window");

export default function SignupScreen() {
	const { isDarkMode } = useTheme();
	const [modalVisible, setModalVisible] = useState(false);
	const [authType, setAuthType] = useState(null);

	// ------------------------
	// Animation refs
	// ------------------------
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

	// ------------------------
	// Entrance Animation
	// ------------------------
	useEffect(() => {
		Animated.stagger(150, [
			Animated.parallel([
				Animated.spring(headerAnim, {
					toValue: 0,
					friction: 8,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 600,
					useNativeDriver: true,
				}),
			]),
			Animated.spring(methodAnim, {
				toValue: 0,
				friction: 8,
				useNativeDriver: true,
			}),
			Animated.spring(socialAnim, {
				toValue: 0,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	// ------------------------
	// Handlers
	// ------------------------
	const openAuthModal = (type) => {
		setAuthType(type);
		setModalVisible(true);
	};

	// ------------------------
	// Render
	// ------------------------
	return (
		<LinearGradient colors={colors.background} className="flex-1 p-8">
			{/* MAIN SIGNUP METHODS */}
			<Animated.View
				style={{ opacity, transform: [{ translateY: methodAnim }] }}
				className="flex-1 justify-center"
			>
				<SignUpMethodCard onSelect={openAuthModal} />

				{/* DIVIDER */}
				<View className="flex-row items-center my-10">
					<View className="flex-1 h-[1px] bg-gray-500/10" />
					<Text className="px-6 text-[10px] font-black tracking-[3px] text-gray-400">
						CONNECT QUICKLY
					</Text>
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
					By continuing, you agree to iVisit's
				</Text>

				<Text className="text-center text-[10px] leading-4 text-gray-500 font-medium">
					<Text
						style={{
							fontWeight: "bold",
							borderBottomWidth: 1,
							borderBottomColor: colors.text,
						}}
					>
						Terms
					</Text>{" "}
					&{" "}
					<Text
						style={{
							fontWeight: "bold",
							borderBottomWidth: 1,
							borderBottomColor: colors.text,
						}}
					>
						Privacy
					</Text>
					.
				</Text>

				<Text className="text-center text-[10px] leading-4 text-gray-500 font-medium">
					We require{" "}
					<Text style={{ color: colors.primary, fontWeight: "900" }}>
						Location Access
					</Text>{" "}
					for dispatch.
				</Text>
			</View>

			{/* AUTH INPUT MODAL */}
			<AuthInputModal
				visible={modalVisible}
				type={authType}
				onClose={() => setModalVisible(false)}
			/>
		</LinearGradient>
	);
}

/**
 * SocialIcon
 *
 * Modular component for rendering social login buttons
 * Handles press animation and scales button on press
 *
 * Props:
 * - name: icon name for AntDesign
 * - color: icon color
 * - bg: background color for the button
 */
const SocialIcon = ({ name, color, bg }) => {
	const scale = useRef(new Animated.Value(1)).current;
	const { isDarkMode } = useTheme();

	const handlePress = () => {
		Animated.sequence([
			Animated.timing(scale, {
				toValue: 0.92,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(scale, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
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
					borderColor: isDarkMode ? "#222" : "#EEE",
					transform: [{ scale }],
				}}
			>
				<AntDesign name={name} size={24} color={color} />
			</Animated.View>
		</Pressable>
	);
};
