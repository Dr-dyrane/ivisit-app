// screens/SignupScreen.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import SignUpMethodCard from "../components/register/SignUpMethodCard";
import AuthInputModal from "../components/register/AuthInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import * as Haptics from "expo-haptics";

/**
 * SignupScreen — iVisit Registration Entry
 *
 * Responsibilities:
 * - Present primary signup methods (email / phone)
 * - Orchestrate social auth display (NOT logic)
 * - Control animation timing & layout
 *
 * Explicitly does NOT:
 * - Implement authentication logic
 * - Know provider internals
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

	return (
		<LinearGradient colors={colors.background} className="flex-1 px-8">
			{/* MAIN METHODS */}
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

				{/* SOCIAL AUTH */}
				<Animated.View
					style={{ opacity, transform: [{ translateY: socialAnim }] }}
				>
					<SocialAuthRow />
				</Animated.View>
			</Animated.View>

			{/* LEGAL */}
			<View className="pb-8">
				<Text className="text-center text-[10px] text-gray-500">
					By continuing, you agree to iVisit's
				</Text>
				<Text className="text-center text-[10px] text-gray-500 font-medium">
					<Text className="font-black underline">Terms</Text> &{" "}
					<Text className="font-black underline">Privacy</Text>
				</Text>
				<Text className="text-center text-[10px] text-gray-500">
					We require{" "}
					<Text style={{ color: PRIMARY_RED, fontWeight: "900" }}>
						Location Access
					</Text>{" "}
					for dispatch.
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
