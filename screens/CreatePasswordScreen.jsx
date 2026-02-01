"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	Animated,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import { useChangePassword } from "../hooks/auth";
import { useAuth } from "../contexts/AuthContext";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import SetPasswordCard from "../components/login/SetPasswordCard";

export default function CreatePasswordScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { syncUserData, user, login } = useAuth();
	// Re-using the change password hook, but we will ignore 'currentPassword' for setPassword
	const { setPassword, isLoading: isSaving, error: hookError } = useChangePassword();

	const [error, setError] = useState(null);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

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
				tension: 50,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const backButton = useCallback(() => <HeaderBackButton />, []);
	const closeButton = useCallback(
		() => (
			<Pressable
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					router.back();
				}}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				style={{ paddingHorizontal: 12, paddingVertical: 6 }}
			>
				<Ionicons name="close" size={22} color="#FFFFFF" />
			</Pressable>
		),
		[router]
	);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Create Password",
				subtitle: "SECURITY",
				icon: <Ionicons name="key" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: closeButton(),
			});
		}, [backButton, closeButton, resetHeader, resetTabBar, setHeaderState])
	);

	const backgroundColors = useMemo(
		() =>
			isDarkMode
				? ["#121826", "#0B0F1A", "#121826"]
				: ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
		[isDarkMode]
	);

	const colors = useMemo(
		() => ({
			text: isDarkMode ? "#FFFFFF" : "#0F172A",
			textMuted: isDarkMode ? "#94A3B8" : "#64748B",
			card: isDarkMode ? "#121826" : "#FFFFFF", // More distinct card color
			inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
		}),
		[isDarkMode]
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const handleSubmit = useCallback(async (password) => {
		if (isSaving) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		setError(null);
		try {
			// For creating a password where none exists, we don't need current password
			const result = await setPassword({ newPassword: password });

			if (result.success) {
				// Directly update auth context with the new user object (which includes hasPassword: true)
				// This avoids the race condition where fetching from Supabase immediately might return old metadata
				await login(result.data.user);
				router.back();
			} else {
				throw new Error(result.error);
			}
		} catch (e) {
			const msg = e?.message?.split("|")?.[1] || e?.message || "Unable to set password";
			setError(msg);
		}
	}, [isSaving, router, login, setPassword]);

	if (user?.hasPassword) {
		return (
			<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
				<ScrollView
					contentContainerStyle={[
						styles.content,
						{ paddingTop: topPadding, paddingBottom: bottomPadding }
					]}
				>
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.title, { color: colors.text }]}>
							Password Already Set
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							You already have a password. You can update it instead.
						</Text>
						<Pressable
							onPress={() => router.replace("/(user)/(stacks)/change-password")}
							style={({ pressed }) => ({
								marginTop: 12,
								height: 54,
								borderRadius: 22,
								backgroundColor: COLORS.brandPrimary,
								opacity: pressed ? 0.92 : 1,
								alignItems: "center",
								justifyContent: "center",
							})}
						>
							<Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15 }}>
								Go to Change Password
							</Text>
						</Pressable>
					</View>
				</ScrollView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.title, { color: colors.text }]}>
						Secure your account
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Create a password to enable easier login on other devices.
					</Text>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					{error ? (
						<View style={styles.errorRow}>
							<Ionicons name="alert-circle" size={18} color={COLORS.error} />
							<Text style={[styles.errorText, { color: COLORS.error }]}>{error}</Text>
						</View>
					) : null}

					<SetPasswordCard
						onPasswordSet={handleSubmit}
						loading={isSaving}
					// No "switch to OTP" option needed here as they are already logged in
					/>
				</View>
			</Animated.ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 30,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	title: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
	subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '400' },
	errorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
	errorText: { fontSize: 13, fontWeight: "500", flex: 1 },
});
