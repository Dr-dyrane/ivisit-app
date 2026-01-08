// screens/SignupScreen.jsx
/**
 * SignupScreen - iVisit Registration Entry
 * Presents primary signup methods and social auth
 */

import { useState, useRef, useEffect } from "react";
import { View, Text, Animated, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useRegistration } from "../contexts/RegistrationContext";
import { COLORS } from "../constants/colors";
import SignUpMethodCard from "../components/register/SignUpMethodCard";
import AuthInputModal from "../components/register/AuthInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import * as Haptics from "expo-haptics";

export default function SignupScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { checkAndApplyPendingRegistration } = useRegistration();
	const [modalVisible, setModalVisible] = useState(false);
	const [authType, setAuthType] = useState(null);

	const methodAnim = useRef(new Animated.Value(30)).current;
	const socialAnim = useRef(new Animated.Value(30)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	const colors = {
		background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
		text: isDarkMode ? "#FFFFFF" : "#1F2937",
		subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
	};

	useEffect(() => {
		// Check for pending verified registration (from login flow)
		const checkPending = async () => {
			const hasPending = await checkAndApplyPendingRegistration();
			if (hasPending) {
				// Auto-open modal if user came from login with verified OTP
				setModalVisible(true);
			}
		};
		checkPending();

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
		<LinearGradient colors={colors.background} className="flex-1">
			<Animated.View
				style={{ opacity, transform: [{ translateY: methodAnim }] }}
				className="flex-1 justify-center px-8"
			>
				<SignUpMethodCard onSelect={openAuthModal} />

				<View className="flex-row items-center my-10">
					<View className="flex-1 h-[1px] bg-gray-500/10" />
					<Text className="px-6 text-[10px] font-black tracking-[3px] text-gray-400">
						CONNECT QUICKLY
					</Text>
					<View className="flex-1 h-[1px] bg-gray-500/10" />
				</View>

				<Animated.View
					style={{ opacity, transform: [{ translateY: socialAnim }] }}
				>
					<SocialAuthRow />
				</Animated.View>

				<Pressable onPress={() => router.push("login")} className="mt-12">
					<Text className="text-center" style={{ color: colors.subtitle }}>
						Already have an account?{" "}
						<Text className="font-bold" style={{ color: COLORS.brandPrimary }}>
							Sign In
						</Text>
					</Text>
				</Pressable>
			</Animated.View>

			<View className="pb-8">
				<Text className="text-center text-[10px] text-gray-500">
					By continuing, you agree to iVisit's{" "}
					<Text className="font-black underline">Terms</Text> &{" "}
					<Text className="font-black underline">Privacy</Text>
				</Text>
				<Text className="text-center text-[10px] text-gray-500 mt-1">
					We require{" "}
					<Text style={{ color: COLORS.brandPrimary, fontWeight: "900" }}>
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
