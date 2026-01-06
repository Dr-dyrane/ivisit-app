// screens/LoginScreen.jsx

"use client";

/**
 * LoginScreen - iVisit UI/UX
 * Simplified: Single modal for complete login flow
 */

import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/colors";
import LoginInputModal from "../components/login/LoginInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import SlideButton from "../components/ui/SlideButton";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const [modalVisible, setModalVisible] = useState(false);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	const colors = {
		background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
		text: isDarkMode ? "#FFFFFF" : "#1F2937",
		subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
	};

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const openLoginModal = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setModalVisible(true);
	};

	return (
		<LinearGradient colors={colors.background} className="flex-1">
			<Animated.View
				style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
				className="flex-1 justify-center px-8"
			>
				<Text
					style={{
						fontSize: 44,
						fontWeight: "900",
						lineHeight: 48,
						marginBottom: 12,
						color: colors.text,
						letterSpacing: -1.5,
					}}
				>
					Access Your{"\n"}
					<Text style={{ color: COLORS.brandPrimary }}>Care Portal</Text>
				</Text>

				<Text
					style={{
						fontSize: 16,
						marginBottom: 48,
						color: colors.subtitle,
						lineHeight: 24,
					}}
				>
					Sign in to access emergency response, medical records, and 24/7 care.
				</Text>

				<SlideButton
					onPress={openLoginModal}
					icon={(color) => <Ionicons name="log-in" size={24} color={color} />}
				>
					LOGIN NOW
				</SlideButton>

				<View className="flex-row items-center my-10">
					<View className="flex-1 h-[1px] bg-gray-500/10" />
					<Text className="px-6 text-[10px] font-black tracking-[3px] text-gray-400">
						CONNECT QUICKLY
					</Text>
					<View className="flex-1 h-[1px] bg-gray-500/10" />
				</View>

				<SocialAuthRow />

				<Pressable onPress={() => router.push("signup")} className="mt-12">
					<Text className="text-center" style={{ color: colors.subtitle }}>
						Need care for the first time?{" "}
						<Text className="font-bold" style={{ color: COLORS.brandPrimary }}>
							Create Account
						</Text>
					</Text>
				</Pressable>
			</Animated.View>

			<View className="pb-8">
				<Text className="text-center text-[10px] text-gray-500">
					Secure healthcare access • iVisit
				</Text>
			</View>

			<LoginInputModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
			/>
		</LinearGradient>
	);
}
