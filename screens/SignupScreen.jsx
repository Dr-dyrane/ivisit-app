// screens/SignupScreen.jsx
/**
 * SignupScreen - iVisit Registration Entry
 * Presents primary signup methods and social auth
 */

import { useCallback } from "react";
import { View, Text, Animated, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSignupScreenLogic } from "../hooks/auth/useSignupScreenLogic";
import { COLORS } from "../constants/colors";
import { styles } from "./SignupScreen.styles";

import AuthInputModal from "../components/register/AuthInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import SlideButton from "../components/ui/SlideButton";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import SwitchAuthButton from "../components/navigation/SwitchAuthButton";

export default function SignupScreen() {
    const { state, animations, actions } = useSignupScreenLogic();
    const { modalVisible, authType, topPadding, colors, isDarkMode } = state;
    const { methodAnim, socialAnim, opacity } = animations;

	useFocusEffect(
		useCallback(() => {
            actions.init();
			actions.resetHeader();
			actions.setHeaderState({
				title: "Sign Up",
				subtitle: "CREATE IDENTITY",
				icon: <Ionicons name="person-add" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: <HeaderBackButton />,
				rightComponent: <SwitchAuthButton target="login" />,
				hidden: false,
			});
		}, [actions])
	);

	return (
		<LinearGradient colors={colors.background} style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardAvoidingView}
			>
				<ScrollView
					contentContainerStyle={[styles.scrollViewContent, { paddingTop: topPadding }]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<Animated.View
						style={[
                            styles.mainContent,
                            { opacity, transform: [{ translateY: methodAnim }] }
                        ]}
					>
						<Text style={[styles.headerText, { color: colors.text }]}>
							Ready for{"\n"}
							<Text style={{ color: COLORS.brandPrimary }}>Better Care?</Text>
						</Text>

						<Text style={[styles.subtitleText, { color: colors.subtitle }]}>
							Create your account in seconds and unlock 24/7 medical access.
						</Text>

						<SlideButton
							onPress={actions.openAuthModal}
							icon={(color) => <Ionicons name="person-add" size={24} color={color} />}
						>
							START REGISTRATION
						</SlideButton>

						<View style={styles.dividerContainer}>
							<View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
							<Text style={[styles.dividerText, { color: colors.subtitle }]}>
								CONNECT QUICKLY
							</Text>
							<View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
						</View>

						<Animated.View
							style={{ opacity, transform: [{ translateY: socialAnim }] }}
						>
							<SocialAuthRow />
						</Animated.View>

						<Pressable onPress={actions.handleLoginPress} style={styles.loginLinkContainer}>
							<Text style={[styles.loginLinkText, { color: colors.subtitle }]}>
								Already have an account?{" "}
								<Text style={styles.loginLinkHighlight}>
									Sign In
								</Text>
							</Text>
						</Pressable>
					</Animated.View>

					<View style={styles.footerContainer}>
						<Text style={styles.footerText}>
							By continuing, you agree to our{" "}
							<Text style={styles.linkText} onPress={() => actions.handleLinkPress("https://ivisit.ng/terms")}>Terms</Text>,{" "}
							<Text style={styles.linkText} onPress={() => actions.handleLinkPress("https://ivisit.ng/privacy")}>Privacy</Text>,{" "}
							<Text style={styles.linkText} onPress={() => actions.handleLinkPress("https://ivisit.ng/medical-disclaimer")}>Medical Disclaimer</Text>, &{" "}
							<Text style={styles.linkText} onPress={() => actions.handleLinkPress("https://ivisit.ng/health-data-consent")}>Health Data Consent</Text>
						</Text>
						<Text style={styles.locationText}>
							We require{" "}
							<Text style={styles.locationHighlight}>
								Location Access
							</Text>{" "}
							for dispatch.
						</Text>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			<AuthInputModal
				visible={modalVisible}
				type={authType}
				onClose={actions.closeAuthModal}
			/>
		</LinearGradient>
	);
}
