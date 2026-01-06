"use client";

/**
 * LoginInputModal
 * Handles complete login flow with forgot/reset password support
 * Mirrors AuthInputModal structure with enhanced error handling
 */

import { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	Modal,
	Animated,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	Dimensions,
	Keyboard,
	ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LOGIN_STEPS, useLogin } from "../../contexts/LoginContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../constants/colors";
import { loginUserAPI, updateUserAPI } from "../../api/auth";

import PhoneInputField from "../register/PhoneInputField";
import EmailInputField from "../register/EmailInputField";
import OTPInputCard from "../register/OTPInputCard";
import PasswordInputField from "../register/PasswordInputField";
import ForgotPasswordCard from "./ForgotPasswordCard";
import ResetPasswordCard from "./ResetPasswordCard";
import SetPasswordCard from "./SetPasswordCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginInputModal({ visible, onClose, type }) {
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const { showToast } = useToast();

	const {
		currentStep,
		loginData,
		updateLoginData,
		nextStep,
		previousStep,
		goToStep,
		resetLoginFlow,
	} = useLogin();

	const { login: authLogin } = useAuth();
	const { isDarkMode } = useTheme();

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					tension: 50,
					friction: 9,
					useNativeDriver: true,
				}),
				Animated.timing(bgOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();

			if (currentStep === LOGIN_STEPS.METHOD_SELECTION) {
				updateLoginData({ method: type });
				goToStep(
					type === "phone" ? LOGIN_STEPS.PHONE_INPUT : LOGIN_STEPS.EMAIL_INPUT
				);
			}
		}
	}, [visible]);

	useEffect(() => {
		setError(null);
	}, [currentStep]);

	const handleDismiss = () => {
		Keyboard.dismiss();
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		Animated.parallel([
			Animated.timing(slideAnim, {
				toValue: SCREEN_HEIGHT,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(bgOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
		]).start(() => {
			resetLoginFlow();
			setError(null);
			onClose();
		});
	};

	const handleGoBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setError(null);
		if (currentStep === LOGIN_STEPS.RESET_PASSWORD) {
			goToStep(LOGIN_STEPS.FORGOT_PASSWORD);
		} else if (currentStep === LOGIN_STEPS.FORGOT_PASSWORD) {
			goToStep(
				type === "phone" ? LOGIN_STEPS.PHONE_INPUT : LOGIN_STEPS.EMAIL_INPUT
			);
		} else {
			previousStep();
		}
	};

	const handleInputSubmit = async (value) => {
		if (!value) {
			setError(
				"Please enter a valid " +
					(type === "phone" ? "phone number" : "email address")
			);
			return;
		}
		setLoading(true);
		setError(null);

		try {
			await new Promise((r) => setTimeout(r, 1200));
			updateLoginData({
				method: type,
				phoneNumber: type === "phone" ? value : null,
				email: type === "email" ? value : null,
			});
			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast(
				type === "phone" ? "Phone number accepted" : "Email address accepted",
				"success"
			);
		} catch (err) {
			const errorMsg =
				err.message ||
				"Failed to process " + (type === "phone" ? "phone" : "email");
			setError(errorMsg);
			showToast(errorMsg, "error");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	const handleOTPSubmit = async (otp) => {
		if (!otp) {
			setError("Please enter a valid OTP");
			return;
		}
		setLoading(true);
		setError(null);

		try {
			await new Promise((r) => setTimeout(r, 800));
			updateLoginData({ otp });
			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("OTP verified successfully", "success");
		} catch (err) {
			const errorMsg = err.message || "OTP verification failed";
			setError(errorMsg);
			showToast(errorMsg, "error");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordSubmit = async (password) => {
		if (!password) {
			setError("Please enter your password");
			return;
		}
		setLoading(true);
		setError(null);

		try {
			updateLoginData({ password });

			const credentials = {
				email: loginData.email,
				phone: loginData.phoneNumber,
				password,
				otp: loginData.otp,
			};

			const { data } = await loginUserAPI(credentials);
			await authLogin(data);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Login successful", "success");

			handleDismiss();
		} catch (err) {
			const errorMsg = err.message || "Login failed";

			if (errorMsg.includes("No password set")) {
				goToStep(LOGIN_STEPS.SET_PASSWORD);
				showToast("Please set a password to continue", "info");
			} else {
				setError(errorMsg);
				showToast(errorMsg, "error");
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleSetPassword = async (password) => {
		if (!password || password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			await updateUserAPI({ password });

			const credentials = {
				email: loginData.email,
				phone: loginData.phoneNumber,
				password,
				otp: loginData.otp,
			};

			const { data } = await loginUserAPI(credentials);
			await authLogin(data);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Password set and logged in successfully", "success");

			handleDismiss();
		} catch (err) {
			const errorMsg = err.message || "Failed to set password";
			setError(errorMsg);
			showToast(errorMsg, "error");
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	const handleResetInitiated = (email, resetToken) => {
		updateLoginData({ resetEmail: email, resetToken });
		goToStep(LOGIN_STEPS.RESET_PASSWORD);
	};

	const handlePasswordReset = () => {
		showToast("Password reset successful. Please login", "success");
		handleDismiss();
	};

	const isInputStep =
		currentStep === LOGIN_STEPS.PHONE_INPUT ||
		currentStep === LOGIN_STEPS.EMAIL_INPUT;
	const isOTPStep = currentStep === LOGIN_STEPS.OTP_VERIFICATION;
	const isPasswordStep = currentStep === LOGIN_STEPS.PASSWORD_INPUT;
	const isForgotPasswordStep = currentStep === LOGIN_STEPS.FORGOT_PASSWORD;
	const isResetPasswordStep = currentStep === LOGIN_STEPS.RESET_PASSWORD;
	const isSetPasswordStep = currentStep === LOGIN_STEPS.SET_PASSWORD;

	const getStepNumber = () => {
		if (isInputStep) return 1;
		if (isOTPStep) return 2;
		if (isPasswordStep) return type === "phone" ? 3 : 2;
		return 1;
	};

	const getTotalSteps = () => (type === "phone" ? 3 : 2);

	const getHeaderTitle = () => {
		if (isInputStep) return type === "phone" ? "Phone Number" : "Email Address";
		if (isOTPStep) return "Verification";
		if (isPasswordStep) return "Enter Password";
		if (isForgotPasswordStep) return "Forgot Password";
		if (isResetPasswordStep) return "Reset Password";
		if (isSetPasswordStep) return "Set Password";
		return "Login";
	};

	const colors = {
		bg: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
	};

	return (
		<Modal visible={visible} transparent animationType="none">
			<View className="flex-1 justify-end">
				<Animated.View
					style={{ opacity: bgOpacity }}
					className="absolute inset-0 bg-black/60"
				>
					<Pressable className="flex-1" onPress={handleDismiss} />
				</Animated.View>

				<Animated.View
					style={{
						transform: [{ translateY: slideAnim }],
						backgroundColor: colors.bg,
						height: SCREEN_HEIGHT * 0.85,
					}}
					className="rounded-t-[40px] px-8 pt-4 shadow-2xl"
				>
					<View className="w-12 h-1.5 bg-gray-500/20 rounded-full self-center mb-6" />

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						keyboardVerticalOffset={
							Platform.OS === "ios" ? insets.bottom + 90 : insets.bottom + 24
						}
						className="flex-1"
					>
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: insets.bottom + 120,
							}}
							keyboardShouldPersistTaps="handled"
						>
							{/* Header */}
							<View className="flex-row items-start mb-8">
								{!isInputStep && (
									<Pressable
										onPress={handleGoBack}
										className="p-2 bg-gray-500/10 rounded-full mr-4"
									>
										<Ionicons name="arrow-back" size={20} color={colors.text} />
									</Pressable>
								)}

								<View className="flex-1">
									{!isForgotPasswordStep &&
										!isResetPasswordStep &&
										!isSetPasswordStep && (
											<Text
												className="text-[10px] tracking-[3px] mb-2 uppercase font-black"
												style={{ color: COLORS.brandPrimary }}
											>
												Step {getStepNumber()} of {getTotalSteps()}
											</Text>
										)}
									<Text
										className="text-3xl font-black tracking-tighter"
										style={{ color: colors.text }}
									>
										{getHeaderTitle()}
									</Text>
								</View>

								<Pressable
									onPress={handleDismiss}
									className="p-2 bg-gray-500/10 rounded-full"
								>
									<Ionicons name="close" size={20} color={colors.text} />
								</Pressable>
							</View>

							{/* Content */}
							{isInputStep &&
								(type === "phone" ? (
									<PhoneInputField
										initialValue={loginData.phoneNumber}
										onSubmit={handleInputSubmit}
									/>
								) : (
									<EmailInputField
										initialValue={loginData.email}
										onSubmit={handleInputSubmit}
									/>
								))}

							{isOTPStep && (
								<OTPInputCard
									method={loginData.method}
									contact={loginData.phoneNumber || loginData.email}
									onVerified={handleOTPSubmit}
								/>
							)}

							{isPasswordStep && (
								<View>
									<PasswordInputField onSubmit={handlePasswordSubmit} />
									<Pressable
										onPress={() => goToStep(LOGIN_STEPS.FORGOT_PASSWORD)}
										className="mt-4 py-2"
									>
										<Text
											className="text-center text-sm font-bold"
											style={{ color: COLORS.brandPrimary }}
										>
											Forgot Password?
										</Text>
									</Pressable>
								</View>
							)}

							{isForgotPasswordStep && (
								<ForgotPasswordCard onResetInitiated={handleResetInitiated} />
							)}

							{isResetPasswordStep && (
								<ResetPasswordCard
									email={loginData.resetEmail}
									onPasswordReset={handlePasswordReset}
								/>
							)}

							{isSetPasswordStep && (
								<SetPasswordCard onPasswordSet={handleSetPassword} />
							)}

							{error && !isInputStep && (
								<View
									className="mt-6 p-4 rounded-2xl bg-opacity-10"
									style={{ backgroundColor: COLORS.error }}
								>
									<View className="flex-row items-start">
										<Ionicons
											name="alert-circle"
											size={20}
											color={COLORS.error}
											style={{ marginRight: 12 }}
										/>
										<Text
											className="flex-1 text-sm font-medium"
											style={{ color: COLORS.error }}
										>
											{error}
										</Text>
									</View>
								</View>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
