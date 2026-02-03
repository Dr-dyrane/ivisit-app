// screens/LoginScreen.jsx

/**
 * LoginScreen - iVisit UI/UX
 * Simplified: Single modal for complete login flow
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Animated, Pressable, Linking, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useLogin } from "../contexts/LoginContext";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING, AUTH_LAYOUT } from "../constants/layout"; // [LAYOUT-REFACTOR] Centralized spacing tokens
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoginInputModal from "../components/login/LoginInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import SlideButton from "../components/ui/SlideButton";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import SwitchAuthButton from "../components/navigation/SwitchAuthButton";

export default function LoginScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();
	const { resetLoginFlow } = useLogin();
	const [modalVisible, setModalVisible] = useState(false);
	const insets = useSafeAreaInsets();

	// Dynamic padding matching stack pages
	// [ACCESSIBILITY-FIX] Dynamic top padding for scroll-aware headers and safe areas
	const topPadding = STACK_TOP_PADDING + (insets?.top || 0) + 20;

	useFocusEffect(
		useCallback(() => {
			resetLoginFlow();
			resetHeader();
			setHeaderState({
				title: "Login",
				subtitle: "SECURE ACCESS",
				icon: <Ionicons name="lock-closed" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: <HeaderBackButton />,
				rightComponent: <SwitchAuthButton target="signup" />,
				hidden: false,
			});
		}, [resetHeader, setHeaderState])
	);

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

	const handleSwitchToSignUp = (contactType) => {
		// Navigate to signup screen with the contact type preference
		router.push({
			pathname: "signup",
			params: contactType ? { initialMethod: contactType } : {},
		});
	};

	const handleLinkPress = (url) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Linking.openURL(url);
	};

	return (
		<LinearGradient colors={colors.background} className="flex-1">
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				className="flex-1"
			>
				<ScrollView
					// [ACCESSIBILITY-FIX] Scrollable content for large font compatibility
					contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: topPadding, paddingBottom: 20 }}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<Animated.View
						style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
						className="px-8 pb-4"
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
							<View className="flex-1 h-2 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
							<Text
								className="px-6 text-[10px] uppercase"
								style={{
									color: colors.subtitle,
									fontWeight: "800",
									letterSpacing: 1.5
								}}
							>
								CONNECT QUICKLY
							</Text>
							<View className="flex-1 h-2 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
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

					{/* [LAYOUT-REFACTOR] Using standardized sectionGap token instead of hardcoded mt-16 */}
					<View style={{ marginTop: AUTH_LAYOUT.sectionGap }} className="pb-8 px-8">
						<Text className="text-center text-[10px] justify-center text-gray-500">
							By continuing, you agree to our{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/terms")}>Terms</Text>,{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/privacy")}>Privacy</Text>,{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/medical-disclaimer")}>Medical Disclaimer</Text>, &{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/health-data-consent")}>Health Data Consent</Text>
						</Text>
						<Text className="text-center text-[10px] text-gray-500 mt-1">
							We require{" "}
							<Text style={{ color: COLORS.brandPrimary, fontWeight: "900" }}>
								Location Access
							</Text>{" "}
							for dispatch.
						</Text>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			<LoginInputModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSwitchToSignUp={handleSwitchToSignUp}
			/>
		</LinearGradient>
	);
}
