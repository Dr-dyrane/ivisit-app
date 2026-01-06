// components/login/ResetPasswordCard.jsx

"use client";

import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import useResetPassword from "../../hooks/mutations/useResetPassword";
import { useToast } from "../../contexts/ToastContext";

/**
 * ResetPasswordCard
 * Enter reset token and new password
 */
export default function ResetPasswordCard({ email, onPasswordReset }) {
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const { resetPassword, loading } = useResetPassword();

	const tokenInputRef = useRef(null);
	const passwordInputRef = useRef(null);

	const [resetToken, setResetToken] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState(null);

	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;

	const isValid = resetToken.length === 6 && newPassword.length >= 6;

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

	const handleSubmit = async () => {
		if (!isValid) {
			triggerShake();
			setError("Please enter a valid 6-digit code and password");
			return;
		}

		setError(null);

		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			await resetPassword(resetToken, newPassword, email);

			showToast("Password reset successfully", "success");
			onPasswordReset?.();
		} catch (err) {
			const [errorCode, errorMessage] = err.message?.split("|") || [];
			const displayMessage = errorMessage || "Failed to reset password";

			setError(displayMessage);
			showToast(displayMessage, "error");
			triggerShake();
		}
	};

	const colors = {
		inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
	};

	return (
		<View>
			<Text
				className="text-sm font-medium mb-6"
				style={{ color: COLORS.textMuted }}
			>
				Enter the 6-digit code we sent to{" "}
				<Text className="font-black" style={{ color: colors.text }}>
					{email}
				</Text>
			</Text>

			{error && (
				<View
					style={{
						backgroundColor: `${COLORS.error}15`,
						padding: 12,
						borderRadius: 12,
						marginBottom: 16,
						borderLeftWidth: 4,
						borderLeftColor: COLORS.error,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<Ionicons
							name="alert-circle"
							size={18}
							color={COLORS.error}
							style={{ marginRight: 8 }}
						/>
						<Text
							style={{
								color: COLORS.error,
								fontSize: 13,
								fontWeight: "600",
								flex: 1,
							}}
						>
							{error}
						</Text>
					</View>
				</View>
			)}

			<Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
				{/* Reset Token Input */}
				<View
					className="flex-row items-center rounded-2xl px-5 h-[72px] mb-4"
					style={{ backgroundColor: colors.inputBg }}
				>
					<Ionicons
						name="key-outline"
						size={24}
						color={COLORS.textMuted}
						style={{ marginRight: 12 }}
					/>

					<TextInput
						ref={tokenInputRef}
						className="flex-1 text-xl font-bold tracking-widest"
						style={{ color: colors.text }}
						placeholder="000000"
						placeholderTextColor={COLORS.textMuted}
						keyboardType="number-pad"
						autoFocus
						value={resetToken}
						onChangeText={(text) => {
							setResetToken(text.slice(0, 6));
							if (error) setError(null);
						}}
						maxLength={6}
						selectionColor={COLORS.brandPrimary}
						returnKeyType="next"
						onSubmitEditing={() => passwordInputRef.current?.focus()}
						editable={!loading}
					/>
				</View>

				{/* New Password Input */}
				<View
					className="flex-row items-center rounded-2xl px-5 h-[72px] mb-6"
					style={{ backgroundColor: colors.inputBg }}
				>
					<Ionicons
						name="lock-closed-outline"
						size={24}
						color={COLORS.textMuted}
						style={{ marginRight: 12 }}
					/>

					<TextInput
						ref={passwordInputRef}
						className="flex-1 text-xl font-bold"
						style={{ color: colors.text }}
						placeholder="New password"
						placeholderTextColor={COLORS.textMuted}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						autoCorrect={false}
						value={newPassword}
						onChangeText={(text) => {
							setNewPassword(text);
							if (error) setError(null);
						}}
						selectionColor={COLORS.brandPrimary}
						returnKeyType="done"
						onSubmitEditing={handleSubmit}
						editable={!loading}
					/>

					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							setShowPassword(!showPassword);
						}}
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

			<Animated.View style={{ transform: [{ scale: buttonScale }] }}>
				<Pressable
					onPress={handleSubmit}
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
						{loading ? "RESETTING..." : "RESET PASSWORD"}
					</Text>
				</Pressable>
			</Animated.View>

			{!error && resetToken.length > 0 && resetToken.length < 6 && (
				<Text
					className="mt-3 text-xs text-center"
					style={{ color: COLORS.textMuted }}
				>
					Code must be 6 digits
				</Text>
			)}

			{!error && newPassword.length > 0 && newPassword.length < 6 && (
				<Text
					className="mt-3 text-xs text-center"
					style={{ color: COLORS.textMuted }}
				>
					Password must be at least 6 characters
				</Text>
			)}
		</View>
	);
}
