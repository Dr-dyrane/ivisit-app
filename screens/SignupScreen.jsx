// screens/SignupScreen.jsx
/**
 * SignupScreen - iVisit Registration Entry
 * Presents primary signup methods and social auth
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Animated, Pressable, Linking, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { useRegistration } from "../contexts/RegistrationContext";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING, AUTH_LAYOUT } from "../constants/layout"; // [LAYOUT-REFACTOR] Centralized spacing tokens
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthInputModal from "../components/register/AuthInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import SlideButton from "../components/ui/SlideButton";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import SwitchAuthButton from "../components/navigation/SwitchAuthButton";
import useAuthViewport from "../hooks/ui/useAuthViewport";

export default function SignupScreen() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const { isDarkMode } = useTheme();
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();
	const { checkAndApplyPendingRegistration, resetRegistration, updateRegistrationData } = useRegistration();

	const [modalVisible, setModalVisible] = useState(false);
	const [authType, setAuthType] = useState(null);
	const insets = useSafeAreaInsets();
	const { horizontalPadding, authPanelMaxWidth, authTitleSize, authTitleLineHeight, bodyTextSize, bodyTextLineHeight, legalMaxWidth, ctaMaxWidth, isDesktop, isTablet } = useAuthViewport();

	// Dynamic padding matching stack pages
	// [ACCESSIBILITY-FIX] Dynamic top padding for scroll-aware headers and safe areas
	const topPadding = STACK_TOP_PADDING + (insets?.top || 0) + 20;

	useFocusEffect(
		useCallback(() => {
			const init = async () => {
				const hasPending = await checkAndApplyPendingRegistration();
				if (!hasPending) {
					resetRegistration();

					// Handle initial method hint from login screen (both old and new param names)
					const methodHint = params.initialMethod || params.preferredMethod;
					if (methodHint) {
						updateRegistrationData({ method: methodHint });
						setModalVisible(true);
					}
				} else {
					// Pending found, auto-open
					setModalVisible(true);
				}
			};
			init();
			resetHeader();
			setHeaderState({
				title: "Create Account",
				subtitle: "CONTINUE",
				icon: <Ionicons name="person-add" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: <HeaderBackButton />,
				rightComponent: <SwitchAuthButton target="login" />,
				hidden: false,
			});
		}, [resetHeader, setHeaderState, params.initialMethod])
	);

	const methodAnim = useRef(new Animated.Value(30)).current;
	const socialAnim = useRef(new Animated.Value(30)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	const colors = {
		background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
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

	const openAuthModal = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setAuthType(null); // Let the smart input handle it
		setModalVisible(true);
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
						style={{ opacity, transform: [{ translateY: methodAnim }] }}
						className="pb-4"
					>
						<View
							style={{
								width: "100%",
								maxWidth: authPanelMaxWidth,
								alignSelf: "center",
								paddingHorizontal: horizontalPadding,
							}}
						>
							<Text
								style={{
									fontSize: authTitleSize,
									fontWeight: "900",
									lineHeight: authTitleLineHeight,
									marginBottom: 12,
									color: colors.text,
									letterSpacing: -1.5,
								}}
							>
								Create your{"\n"}
								<Text style={{ color: COLORS.brandPrimary }}>account.</Text>
							</Text>

							<Text
								style={{
									fontSize: bodyTextSize,
									marginBottom: 48,
									color: colors.subtitle,
									lineHeight: bodyTextLineHeight,
								}}
							>
								Use your phone, email, or a trusted sign-in to continue.
							</Text>

							<View style={{ width: "100%", maxWidth: ctaMaxWidth, alignSelf: isDesktop || isTablet ? "flex-start" : "stretch" }}>
								<SlideButton
									onPress={openAuthModal}
									icon={(color) => <Ionicons name="person-add" size={24} color={color} />}
								>
									Create Account
								</SlideButton>
							</View>

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
									OR CONTINUE WITH
								</Text>
								<View className="flex-1 h-2 rounded-full" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
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
						</View>
					</Animated.View>

					{/* [LAYOUT-REFACTOR] Using standardized sectionGap token instead of hardcoded mt-16 */}
					<View
						style={{
							marginTop: AUTH_LAYOUT.sectionGap,
							paddingBottom: 32,
							paddingHorizontal: horizontalPadding,
							width: "100%",
							maxWidth: legalMaxWidth + horizontalPadding * 2,
							alignSelf: "center",
						}}
					>
						<Text className="text-center text-[10px] justify-center text-gray-500">
							By continuing, you agree to our{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/terms")}>Terms</Text>,{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/privacy")}>Privacy</Text>,{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/medical-disclaimer")}>Medical Disclaimer</Text>, &{" "}
							<Text className="font-black underline" onPress={() => handleLinkPress("https://ivisit.ng/health-data-consent")}>Health Data Consent</Text>
						</Text>
						<Text className="text-center text-[10px] text-gray-500 mt-1">
							Allow{" "}
							<Text style={{ color: COLORS.brandPrimary, fontWeight: "900" }}>
								Location Access
							</Text>{" "}
							so responders can find you faster.
						</Text>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			<AuthInputModal
				visible={modalVisible}
				type={authType}
				onClose={() => setModalVisible(false)}
			/>
		</LinearGradient>
	);
}
