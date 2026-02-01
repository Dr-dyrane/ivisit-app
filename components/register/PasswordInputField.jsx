// components/register/PasswordInputField.jsx

import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

/**
 * PasswordInputField - iVisit
 * Reusable password input with toggle visibility
 * Used in both registration and login flows
 */
export default function PasswordInputField({
	onSubmit,
	onSkip = null,
	showSkipOption = false,
	showForgotPassword = false,
	onForgotPassword = null,
	showOtpOption = false,
	onOtpPress = null,
	loading = false, // [FIX] Added to resolve ReferenceError: 'loading' doesn't exist
}) {
	const { isDarkMode } = useTheme();
	const inputRef = useRef(null);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isFocused, setIsFocused] = useState(false);

	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;

	const isValid = password.length >= 6;

	const handlePasswordChange = (text) => {
		setPassword(text);
	};

	const togglePasswordVisibility = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setShowPassword(!showPassword);
	};

	const triggerShake = () => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		Animated.sequence([
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: -10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 0,
				duration: 50,
				useNativeDriver: true,
			}),
		]).start();
	};

	const handleContinue = () => {
		if (!isValid) {
			triggerShake();
			return;
		}

		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		onSubmit?.(password);
	};

	const handleSkipPress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSkip?.();
	};

	const colors = {
		// [AUTH_POLISH] Glassmorphism-inspired backgrounds
		inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
		border: isFocused ? COLORS.brandPrimary : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
	};

	return (
		<View>
			<Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
				<View
					className="flex-row items-center rounded-3xl px-6 h-[80px]"
					style={{
						backgroundColor: colors.inputBg,
						borderWidth: 1.5,
						borderColor: colors.border,
						// Subtle depth
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: isDarkMode ? 0.2 : 0.05,
						shadowRadius: 12,
					}}
				>
					<Ionicons
						name="lock-closed-outline"
						size={24}
						color={COLORS.textMuted}
						style={{ marginRight: 12 }}
					/>

					<TextInput
						ref={inputRef}
						className="flex-1 text-xl font-bold"
						style={{ color: colors.text }}
						placeholder="Enter password"
						placeholderTextColor={COLORS.textMuted}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						autoCorrect={false}
						autoFocus
						value={password}
						onChangeText={handlePasswordChange}
						selectionColor={COLORS.brandPrimary}
						returnKeyType="done"
						onSubmitEditing={handleContinue}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
					/>

					<Pressable
						onPress={togglePasswordVisibility}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					>
						<Ionicons
							name={showPassword ? "eye-off-outline" : "eye-outline"}
							size={24}
							color={COLORS.textMuted}
						/>
					</Pressable>
				</View>
			</Animated.View>

			{/* Continue Button */}
			<Animated.View
				style={{ transform: [{ scale: buttonScale }] }}
				className="mt-6"
			>
				<Pressable
					onPress={handleContinue}
					onPressIn={() => {
						Animated.spring(buttonScale, {
							toValue: 0.96,
							useNativeDriver: true,
						}).start();
					}}
					onPressOut={() => {
						Animated.spring(buttonScale, {
							toValue: 1,
							friction: 3,
							useNativeDriver: true,
						}).start();
					}}
					disabled={!isValid || loading}
					className="h-16 rounded-2xl items-center justify-center"
					style={{
						backgroundColor:
							isValid && !loading
								? COLORS.brandPrimary
								: isDarkMode
									? COLORS.bgDarkAlt
									: "#E5E7EB",
					}}
				>
					<Text
						className="text-base font-black tracking-[2px]"
						style={{
							color: isValid && !loading ? COLORS.bgLight : COLORS.textMuted,
						}}
					>
						{loading ? "SIGNING IN..." : "CONTINUE"}
					</Text>
				</Pressable>
			</Animated.View>

			{showForgotPassword && onForgotPassword && (
				<Pressable onPress={onForgotPassword} className="mt-4 py-3">
					<Text
						className="text-center text-sm font-bold"
						style={{ color: COLORS.brandPrimary }}
					>
						Forgot Password?
					</Text>
				</Pressable>
			)}

			{showOtpOption && onOtpPress && (
				<Pressable onPress={onOtpPress} className="mt-2 py-3">
					<Text
						className="text-center text-sm font-bold"
						style={{ color: COLORS.brandPrimary }}
					>
						Sign in with a login code instead
					</Text>
				</Pressable>
			)}

			{/* Skip Button (Optional) */}
			{showSkipOption && onSkip && (
				<Pressable onPress={handleSkipPress} className="mt-4 py-3">
					<Text
						className="text-center text-sm font-bold"
						style={{ color: COLORS.textMuted }}
					>
						Skip for now
					</Text>
				</Pressable>
			)}

			{/* Helper Text */}
			{password.length > 0 && !isValid && (
				<Text
					className="mt-3 text-xs text-center"
					style={{ color: COLORS.error }}
				>
					Password must be at least 6 characters
				</Text>
			)}

			{!showForgotPassword && (
				<Text
					className="mt-4 text-xs text-center leading-5"
					style={{ color: COLORS.textMuted }}
				>
					Create a strong password to protect your account and medical
					information.
				</Text>
			)}
		</View>
	);
}
