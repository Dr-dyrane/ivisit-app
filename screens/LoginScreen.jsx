// screens/LoginScreen.jsx

/**
 * LoginScreen - iVisit UI/UX
 * Simplified: Single modal for complete login flow
 * Refactored to VHS pattern
 */

import { useCallback } from "react";
import { View, Text, Animated, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLoginScreenLogic } from "../hooks/auth/useLoginScreenLogic";
import { COLORS } from "../constants/colors";
import { styles } from "./LoginScreen.styles";

import LoginInputModal from "../components/login/LoginInputModal";
import SocialAuthRow from "../components/auth/SocialAuthRow";
import SlideButton from "../components/ui/SlideButton";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import SwitchAuthButton from "../components/navigation/SwitchAuthButton";

export default function LoginScreen() {
    const { state, animations, actions } = useLoginScreenLogic();
    const { modalVisible, topPadding, colors } = state;
    const { fadeAnim, slideAnim } = animations;

    useFocusEffect(
        useCallback(() => {
            actions.init();
            actions.resetHeader();
            actions.setHeaderState({
                title: "Login",
                subtitle: "SECURE ACCESS",
                icon: <Ionicons name="lock-closed" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: <HeaderBackButton />,
                rightComponent: <SwitchAuthButton target="signup" />,
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
                    contentContainerStyle={[
                        styles.scrollViewContent, 
                        { paddingTop: topPadding }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.mainContent,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <Text
                            style={[styles.headerText, { color: colors.text }]}
                        >
                            Access Your{"\n"}
                            <Text style={{ color: COLORS.brandPrimary }}>Care Portal</Text>
                        </Text>

                        <Text
                            style={[styles.subtitleText, { color: colors.subtitle }]}
                        >
                            Sign in to access emergency response, medical records, and 24/7 care.
                        </Text>

                        <SlideButton
                            onPress={actions.openLoginModal}
                            icon={(color) => <Ionicons name="log-in" size={24} color={color} />}
                        >
                            LOGIN NOW
                        </SlideButton>

                        <View style={styles.dividerContainer}>
                            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                            <Text
                                style={[styles.dividerText, { color: colors.subtitle }]}
                            >
                                CONNECT QUICKLY
                            </Text>
                            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                        </View>

                        <SocialAuthRow />

                        <Pressable onPress={() => actions.handleSwitchToSignUp()} style={styles.signupLinkContainer}>
                            <Text style={[styles.signupLinkText, { color: colors.subtitle }]}>
                                Need care for the first time?{" "}
                                <Text style={styles.signupLinkHighlight}>
                                    Create Account
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

            <LoginInputModal
                visible={modalVisible}
                onClose={() => actions.setModalVisible(false)}
                onSwitchToSignUp={actions.handleSwitchToSignUp}
            />
        </LinearGradient>
    );
}
