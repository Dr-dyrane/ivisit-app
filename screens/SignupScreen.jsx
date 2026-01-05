// screens/SignupScreen.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useRegistration } from "../contexts/RegistrationContext";
import SignUpMethodCard from "../components/register/SignUpMethodCard";
import AuthInputModal from "../components/register/AuthInputModal";
import * as Haptics from "expo-haptics";

/**
 * SignupScreen - iVisit Registration
 *
 * Design Philosophy:
 * - Minimal text to reduce stress during emergencies
 * - Clear, simple choices without overwhelming information
 * - Intentional medical red (#86100E) for emergency context
 * - Social login placeholders for future implementation
 */

const { width } = Dimensions.get("window");
const PRIMARY_RED = "#86100E";

export default function SignupScreen() {
	const { isDarkMode } = useTheme();
	const [modalVisible, setModalVisible] = useState(false);
	const [authType, setAuthType] = useState(null);

	// Animation refs
	const methodAnim = useRef(new Animated.Value(30)).current;
	const socialAnim = useRef(new Animated.Value(30)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	const colors = {
		background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
		card: isDarkMode ? "#121826" : "#F3E7E7",
		text: isDarkMode ? "#FFFFFF" : "#1F2937",
		subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
	};

	useEffect(() => {
		Animated.stagger(150, [
			Animated.parallel([
				Animated.spring(methodAnim, {
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
			Animated.spring(socialAnim, {
				toValue: 0,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const openAuthModal = (type) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setAuthType(type);
		setModalVisible(true);
	};

	const handleCloseModal = () => {
		setModalVisible(false);
		setAuthType(null);
	};

	return (
		<LinearGradient colors={colors.background} className="flex-1 px-8">
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

				{/* SOCIAL BUTTONS - Placeholders for future implementation */}
				<Animated.View
					style={{ opacity, transform: [{ translateY: socialAnim }] }}
					className="flex-row justify-between"
				>
					<SocialIcon name="logo-apple" color={colors.text} bg={colors.card} />
					<SocialIcon name="logo-google" color={colors.text} bg={colors.card} />
					<SocialIcon
						name="logo-x"
						color={colors.text}
						bg={colors.card}
					/>
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
					<Text style={{ color: PRIMARY_RED, fontWeight: "900" }}>
						Location Access
					</Text>{" "}
					for dispatch.
				</Text>
			</View>

			{/* AUTH INPUT MODAL */}
			<AuthInputModal
				visible={modalVisible}
				type={authType}
				onClose={handleCloseModal}
			/>
		</LinearGradient>
	);
}

/**
 * SocialIcon - Placeholder for social login
 * Will be implemented in future versions
 */
const SocialIcon = ({ name, color, bg }) => {
	const scale = useRef(new Animated.Value(1)).current;
	const { isDarkMode } = useTheme();
	const { socialSignUp } = useRegistration();

	const handlePress = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

		// Call registration social signup
		const provider = name.includes("apple") ? "apple" : name.includes("google") ? "google" : "x";
		const profile = {
			name: `${provider} user`,
			email: `${provider}_user_${Date.now()}@example.com`,
		};

		try {
			const ok = await socialSignUp(provider, profile);
			console.log("[v0] socialSignUp result:", ok);
		} catch (err) {
			console.warn("Social signup error:", err);
		}
	};

	return (
		<Pressable onPress={handlePress}>
			<Animated.View
				style={{
					backgroundColor: bg,
					width: width * 0.23,
					height: 64,
					borderRadius: 20,
					alignItems: "center",
					justifyContent: "center",
					borderWidth: 1,
					borderColor: isDarkMode ? "#222" : "#EEE",
					transform: [{ scale }],
				}}
			>
				<Ionicons name={name} size={24} color={color} />
			</Animated.View>
		</Pressable>
	);
};
