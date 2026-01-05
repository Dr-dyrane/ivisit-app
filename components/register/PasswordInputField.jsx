// components/register/PasswordInputField.jsx
"use client";

import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

/**
 * PasswordInputField - iVisit Registration
 *
 * Allows users to set a password or skip for now
 * Includes inline validation for minimum length
 */
export default function PasswordInputField({
	initialValue = "",
	onSubmit,
	onSkip,
}) {
	const { isDarkMode } = useTheme();
	const inputRef = useRef(null);

	const [password, setPassword] = useState(initialValue);
	const [isPasswordVisible, setPasswordVisible] = useState(false);
	const [error, setError] = useState(null);

	const MIN_LENGTH = 6;

	const handleChange = (text) => {
		setPassword(text);
		if (text.length >= MIN_LENGTH) setError(null);
	};

	const handleContinue = () => {
		if (!password || password.length < MIN_LENGTH) {
			setError(`Password must be at least ${MIN_LENGTH} characters`);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		onSubmit?.(password);
	};

	const colors = {
		inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
		text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
	};

	return (
		<View>
			{/* Password Input */}
			<View
				className="flex-row items-center rounded-2xl px-5 h-[72px]"
				style={{ backgroundColor: colors.inputBg }}
			>
				<Ionicons
					name="key-outline"
					size={24}
					color={COLORS.textMuted}
					style={{ marginRight: 12 }}
				/>

				<TextInput
					ref={inputRef}
					className="flex-1 text-xl font-bold"
					style={{ color: colors.text }}
					placeholder="Create a password"
					placeholderTextColor={COLORS.textMuted}
					secureTextEntry={!isPasswordVisible}
					autoCapitalize="none"
					autoCorrect={false}
					autoFocus
					value={password}
					onChangeText={handleChange}
					selectionColor={COLORS.brandPrimary}
					returnKeyType="done"
					onSubmitEditing={handleContinue}
				/>

				<Pressable
					onPress={() => setPasswordVisible((v) => !v)}
					className="px-2"
				>
					<Ionicons
						name={isPasswordVisible ? "eye" : "eye-off"}
						size={20}
						color={colors.text}
					/>
				</Pressable>
			</View>

			{/* Inline error */}
			{error && (
				<Text
					className="mt-2 text-xs text-red-500"
					style={{ color: COLORS.error }}
				>
					{error}
				</Text>
			)}

			{/* Continue Button */}
			<View className="mt-6">
				<Pressable
					onPress={handleContinue}
					className="h-16 rounded-2xl items-center justify-center"
					style={{ backgroundColor: COLORS.brandPrimary }}
				>
					<Text
						className="text-base font-black tracking-[2px]"
						style={{ color: COLORS.bgLight }}
					>
						SET PASSWORD
					</Text>
				</Pressable>
			</View>

			{/* Skip */}
			<View className="mt-5 items-center">
				<Pressable onPress={() => onSkip?.()} className="py-2 px-4">
					<Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
						Skip for now
					</Text>
				</Pressable>
				<Text
					className="mt-1 text-xs text-center"
					style={{ color: COLORS.textMuted }}
				>
					Password must be at least {MIN_LENGTH} characters. You can change it
					later in settings.
				</Text>
			</View>
		</View>
	);
}
