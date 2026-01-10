"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	TextInput,
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
import { useCreatePassword } from "../hooks/auth/useCreatePassword";
import { useAuth } from "../contexts/AuthContext";
import HeaderBackButton from "../components/navigation/HeaderBackButton";

export default function CreatePasswordScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { syncUserData, user } = useAuth();
	const { createPassword, isLoading: isSaving, error: hookError } = useCreatePassword();

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [error, setError] = useState(null);

	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;
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
				icon: <Ionicons name="lock-closed" size={26} color="#FFFFFF" />,
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
			card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
			inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
		}),
		[isDarkMode]
	);

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	const isValid = password.length >= 6 && password === confirmPassword;

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const shake = useCallback(() => {
		Animated.sequence([
			Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
			Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
		]).start();
	}, [shakeAnim]);

	const handleSubmit = useCallback(async () => {
		if (isSaving) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		if (!isValid) {
			setError("Passwords must match and be at least 6 characters.");
			shake();
			return;
		}

		setError(null);
		try {
			await createPassword({ password });
			await syncUserData();
			router.back();
		} catch (e) {
			const msg = e?.message?.split("|")?.[1] || e?.message || "Unable to create password";
			setError(msg);
			shake();
		}
	}, [isSaving, isValid, password, router, shake, syncUserData, createPassword]);

	if (user?.hasPassword) {
		return (
			<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
				<View style={[styles.content, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.title, { color: colors.text }]}>
							Password already set
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Use Change Password instead.
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
				</View>
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
						Add a password to your account
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						This lets you sign in without OTP when you want.
					</Text>
				</View>

				<View style={[styles.card, { backgroundColor: colors.card }]}>
					{error ? (
						<View style={styles.errorRow}>
							<Ionicons name="alert-circle" size={18} color={COLORS.error} />
							<Text style={[styles.errorText, { color: COLORS.error }]}>{error}</Text>
						</View>
					) : null}

					<Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
						<View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
							<Ionicons name="lock-closed-outline" size={22} color={COLORS.textMuted} />
							<TextInput
								value={password}
								onChangeText={(t) => {
									setPassword(t);
									if (error) setError(null);
								}}
								placeholder="New password"
								placeholderTextColor={COLORS.textMuted}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
								autoCorrect={false}
								style={[styles.input, { color: colors.text }]}
								selectionColor={COLORS.brandPrimary}
								editable={!isSaving}
							/>
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									setShowPassword((v) => !v);
								}}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Ionicons
									name={showPassword ? "eye-off-outline" : "eye-outline"}
									size={22}
									color={COLORS.textMuted}
								/>
							</Pressable>
						</View>

						<View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
							<Ionicons name="lock-closed-outline" size={22} color={COLORS.textMuted} />
							<TextInput
								value={confirmPassword}
								onChangeText={(t) => {
									setConfirmPassword(t);
									if (error) setError(null);
								}}
								placeholder="Confirm password"
								placeholderTextColor={COLORS.textMuted}
								secureTextEntry={!showConfirm}
								autoCapitalize="none"
								autoCorrect={false}
								style={[styles.input, { color: colors.text }]}
								selectionColor={COLORS.brandPrimary}
								editable={!isSaving}
							/>
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									setShowConfirm((v) => !v);
								}}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Ionicons
									name={showConfirm ? "eye-off-outline" : "eye-outline"}
									size={22}
									color={COLORS.textMuted}
								/>
							</Pressable>
						</View>
					</Animated.View>

					<Animated.View style={{ transform: [{ scale: buttonScale }] }}>
						<Pressable
							disabled={!isValid || isSaving}
							onPress={handleSubmit}
							onPressIn={() => {
								Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
							}}
							onPressOut={() => {
								Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
							}}
							style={{
								marginTop: 10,
								height: 54,
								borderRadius: 22,
								backgroundColor:
									isValid && !isSaving
										? COLORS.brandPrimary
										: isDarkMode
										? COLORS.bgDarkAlt
										: "#E5E7EB",
								alignItems: "center",
								justifyContent: "center",
								flexDirection: "row",
								gap: 10,
							}}
						>
							{isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
							<Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15 }}>
								Create Password
							</Text>
						</Pressable>
					</Animated.View>
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
	subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight:'400' },
	errorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
	errorText: { fontSize: 13, fontWeight: "500", flex: 1 },
	inputRow: {
		height: 64,
		borderRadius: 18,
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 10,
	},
	input: { flex: 1, fontSize: 15, fontWeight: "500" },
});
