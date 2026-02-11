// components/login/ResetPasswordCard.jsx

/**
 * ResetPasswordCard
 * Enter reset token (OTP) and new password
 */

import React from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useResetPasswordCardLogic } from "../../hooks/auth/useResetPasswordCardLogic";
import { styles } from "./ResetPasswordCard.styles";

export default function ResetPasswordCard({
	email,
	onPasswordReset,
	mockResetToken,
}) {
	const { state, refs, actions } = useResetPasswordCardLogic({ email, onPasswordReset });
	const {
		resetToken,
		newPassword,
		showPassword,
		error,
		isValid,
		loading,
		colors,
	} = state;

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

			{/* DEV: Show mock reset token for testing */}
			{mockResetToken && (
				<View
					style={[
						styles.mockTokenContainer,
						{
							backgroundColor: colors.mockBg,
							borderColor: colors.mockBorder,
						},
					]}
				>
					<Text style={[styles.mockTokenLabel, { color: colors.mockLabel }]}>
						🔐 DEV MODE - Your reset code:
					</Text>
					<Text style={[styles.mockTokenValue, { color: colors.mockValue }]}>
						{mockResetToken}
					</Text>
				</View>
			)}

			{error && (
				<View style={styles.errorContainer}>
					<View style={styles.errorRow}>
						<Ionicons
							name="alert-circle"
							size={18}
							color={COLORS.error}
							style={styles.errorIcon}
						/>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				</View>
			)}

			<Animated.View style={{ transform: [{ translateX: refs.shakeAnim }] }}>
				{/* Reset Token Input */}
				<View
					style={[styles.inputRow, { backgroundColor: colors.inputBg }]}
				>
					<Ionicons
						name="key-outline"
						size={24}
						color={COLORS.textMuted}
						style={styles.inputIcon}
					/>

					<TextInput
						ref={refs.tokenInputRef}
						style={[styles.textInput, styles.tokenInput, { color: colors.text }]}
						placeholder="000000"
						placeholderTextColor={COLORS.textMuted}
						keyboardType="number-pad"
						autoFocus
						value={resetToken}
						onChangeText={actions.handleTokenChange}
						maxLength={6}
						selectionColor={COLORS.brandPrimary}
						returnKeyType="next"
						onSubmitEditing={() => refs.passwordInputRef.current?.focus()}
						editable={!loading}
					/>
				</View>

				{/* New Password Input */}
				<View
					style={[styles.inputRow, { backgroundColor: colors.inputBg }]}
				>
					<Ionicons
						name="lock-closed-outline"
						size={24}
						color={COLORS.textMuted}
						style={styles.inputIcon}
					/>

					<TextInput
						ref={refs.passwordInputRef}
						style={[styles.textInput, { color: colors.text }]}
						placeholder="New password"
						placeholderTextColor={COLORS.textMuted}
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						autoCorrect={false}
						value={newPassword}
						onChangeText={actions.handlePasswordChange}
						selectionColor={COLORS.brandPrimary}
						returnKeyType="done"
						onSubmitEditing={actions.handleSubmit}
						editable={!loading}
					/>

					<Pressable
						onPress={actions.toggleShowPassword}
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

			<Animated.View style={{ transform: [{ scale: refs.buttonScale }] }}>
				<Pressable
					onPress={actions.handleSubmit}
					onPressIn={actions.handlePressIn}
					onPressOut={actions.handlePressOut}
					disabled={!isValid || loading}
					style={[
						styles.submitButton,
						{ backgroundColor: colors.buttonBg }
					]}
				>
					<Text
						style={[
							styles.submitButtonText,
							{ color: colors.buttonText }
						]}
					>
						{loading ? "RESETTING..." : "RESET PASSWORD"}
					</Text>
				</Pressable>
			</Animated.View>

			{!error && resetToken.length > 0 && resetToken.length < 6 && (
				<Text style={styles.validationText}>
					Code must be 6 digits
				</Text>
			)}

			{!error && newPassword.length > 0 && newPassword.length < 6 && (
				<Text style={styles.validationText}>
					Password must be at least 6 characters
				</Text>
			)}
		</View>
	);
}
