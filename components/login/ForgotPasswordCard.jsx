// components/login/ForgotPasswordCard.jsx

/**
 * ForgotPasswordCard
 * Email input to initiate password reset - uses OTP for reset token
 */

import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useForgotPassword } from "../../hooks/auth/useForgotPassword";
import { useToast } from "../../contexts/ToastContext";

export default function ForgotPasswordCard({ onResetInitiated }) {
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const { forgotPassword, loading, resetToken: mockResetToken } =
		useForgotPassword();

	const inputRef = useRef(null);
	const [email, setEmail] = useState("");
	const [error, setError] = useState(null);
	const [showMockToken, setShowMockToken] = useState(false);
	const [localResetToken, setLocalResetToken] = useState(null);

	const shakeAnim = useRef(new Animated.Value(0)).current;
	const buttonScale = useRef(new Animated.Value(1)).current;

	const isValid = email.trim().length > 0 && email.includes("@");

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
			setError("Please enter a valid email address");
			triggerShake();
			return;
		}

		setError(null);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		const result = await forgotPassword(email.trim());

		if (result.success) {
			// DEV: Store reset token for display
			if (result.resetToken) {
				setLocalResetToken(result.resetToken);
				setShowMockToken(true);
			}

			showToast("Reset code sent to your email", "success");
			onResetInitiated?.(email.trim(), result.resetToken);
		} else {
			setError(result.error);
			showToast(result.error, "error");
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
				Enter your email and we'll send you a secure code to reset your
				password.
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
				<View
					className="flex-row items-center rounded-2xl px-5 h-[72px] mb-6"
					style={{ backgroundColor: colors.inputBg }}
				>
					<Ionicons
						name="mail-outline"
						size={24}
						color={COLORS.textMuted}
						style={{ marginRight: 12 }}
					/>

					<TextInput
						ref={inputRef}
						className="flex-1 text-xl font-bold"
						style={{ color: colors.text }}
						placeholder="your@email.com"
						placeholderTextColor={COLORS.textMuted}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						autoFocus
						value={email}
						onChangeText={(text) => {
							setEmail(text);
							if (error) setError(null);
						}}
						selectionColor={COLORS.brandPrimary}
						returnKeyType="done"
						onSubmitEditing={handleSubmit}
						editable={!loading}
					/>
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
						{loading ? "SENDING..." : "SEND RESET CODE"}
					</Text>
				</Pressable>
			</Animated.View>
		</View>
	);
}
