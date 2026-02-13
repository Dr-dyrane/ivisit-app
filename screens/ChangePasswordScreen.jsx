"use client";

import { useCallback } from "react";
import {
	View,
	Text,
	TextInput,
	Animated,
	ActivityIndicator,
	Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS } from "../constants/colors";
import { useChangePasswordScreenLogic } from "../hooks/auth/useChangePasswordScreenLogic";
import { styles } from "./ChangePasswordScreen.styles";

export default function ChangePasswordScreen() {
	const { state, actions } = useChangePasswordScreenLogic();
	const {
		user,
		currentPassword,
		newPassword,
		confirmPassword,
		showCurrent,
		showNew,
		showConfirm,
		error,
		isValid,
		isSaving,
		shakeAnim,
		buttonScale,
		fadeAnim,
		slideAnim,
		backgroundColors,
		colors,
		topPadding,
		bottomPadding,
	} = state;

	const {
		setCurrentPassword,
		setNewPassword,
		setConfirmPassword,
		setShowCurrent,
		setShowNew,
		setShowConfirm,
		setError,
		handleSubmit,
		handleScroll,
		backButton,
		resetHeader,
		resetTabBar,
		setHeaderState,
		router,
	} = actions;

	const closeButton = useCallback(
		() => (
			<Pressable
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					router.back();
				}}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				style={styles.closeButton}
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
				title: "Change Password",
				subtitle: "SECURITY",
				icon: <Ionicons name="key" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: closeButton(),
			});
		}, [backButton, closeButton, resetHeader, resetTabBar, setHeaderState])
	);

	if (!user?.hasPassword) {
		return (
			<LinearGradient colors={backgroundColors} style={styles.container}>
				<View style={[styles.content, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.title, { color: colors.text }]}>
							No password yet
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Create a password first, then you can change it any time.
						</Text>
						<Pressable
							onPress={() => router.replace("/(user)/(stacks)/create-password")}
							style={({ pressed }) => [
                                styles.noPasswordButton,
                                { opacity: pressed ? 0.92 : 1 }
                            ]}
						>
							<Text style={styles.noPasswordButtonText}>
								Go to Create Password
							</Text>
						</Pressable>
					</View>
				</View>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient colors={backgroundColors} style={styles.container}>
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
						Update your password
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						You’ll stay signed in after changing it.
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
								value={currentPassword}
								onChangeText={(t) => {
									setCurrentPassword(t);
									if (error) setError(null);
								}}
								placeholder="Current password"
								placeholderTextColor={COLORS.textMuted}
								secureTextEntry={!showCurrent}
								autoCapitalize="none"
								autoCorrect={false}
								style={[styles.input, { color: colors.text }]}
								selectionColor={COLORS.brandPrimary}
								editable={!isSaving}
							/>
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									setShowCurrent((v) => !v);
								}}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Ionicons
									name={showCurrent ? "eye-off-outline" : "eye-outline"}
									size={22}
									color={COLORS.textMuted}
								/>
							</Pressable>
						</View>

						<View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
							<Ionicons name="lock-closed-outline" size={22} color={COLORS.textMuted} />
							<TextInput
								value={newPassword}
								onChangeText={(t) => {
									setNewPassword(t);
									if (error) setError(null);
								}}
								placeholder="New password"
								placeholderTextColor={COLORS.textMuted}
								secureTextEntry={!showNew}
								autoCapitalize="none"
								autoCorrect={false}
								style={[styles.input, { color: colors.text }]}
								selectionColor={COLORS.brandPrimary}
								editable={!isSaving}
							/>
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									setShowNew((v) => !v);
								}}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<Ionicons
									name={showNew ? "eye-off-outline" : "eye-outline"}
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
								placeholder="Confirm new password"
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
							style={[
                                styles.submitButton,
                                {
                                    backgroundColor: isValid && !isSaving
                                        ? COLORS.brandPrimary
                                        : colors.inputBg === "#0B0F1A"
                                            ? COLORS.bgDarkAlt
                                            : "#E5E7EB",
                                }
                            ]}
						>
							{isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
							<Text style={styles.submitButtonText}>
								Change Password
							</Text>
						</Pressable>
					</Animated.View>
				</View>
			</Animated.ScrollView>
		</LinearGradient>
	);
}
