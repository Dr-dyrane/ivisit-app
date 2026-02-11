"use client";

import { useCallback } from "react";
import {
	View,
	Text,
	Animated,
	Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS } from "../constants/colors";
import { useChangePasswordScreenLogic } from "../hooks/auth/useChangePasswordScreenLogic";
import { styles } from "./ChangePasswordScreen.styles";
import ChangePasswordForm from "../components/auth/ChangePasswordForm";

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

                <ChangePasswordForm
                    currentPassword={currentPassword}
                    setCurrentPassword={setCurrentPassword}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    showCurrent={showCurrent}
                    setShowCurrent={setShowCurrent}
                    showNew={showNew}
                    setShowNew={setShowNew}
                    showConfirm={showConfirm}
                    setShowConfirm={setShowConfirm}
                    error={error}
                    setError={setError}
                    isValid={isValid}
                    isSaving={isSaving}
                    shakeAnim={shakeAnim}
                    buttonScale={buttonScale}
                    handleSubmit={handleSubmit}
                    colors={colors}
                />
			</Animated.ScrollView>
		</LinearGradient>
	);
}
