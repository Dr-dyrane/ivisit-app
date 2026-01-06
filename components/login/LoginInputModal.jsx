// components/login/LoginInputModal.jsx

/**
 * components/login/LoginInputModal.jsx
 * Production-ready login modal with comprehensive validation
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
import { useRouter } from "expo-router";
import {
	LOGIN_STEPS,
	LOGIN_AUTH_METHODS,
	useLogin,
} from "../../contexts/LoginContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { COLORS } from "../../constants/colors";
import useLoginMutation from "../../hooks/mutations/useLoginMutation";
import { useAuth } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginAuthMethodCard from "./LoginAuthMethodCard";
import LoginContactCard from "./LoginContactCard";
import PhoneInputField from "../register/PhoneInputField";
import EmailInputField from "../register/EmailInputField";
import OTPInputCard from "../register/OTPInputCard";
import PasswordInputField from "../register/PasswordInputField";
import SetPasswordCard from "./SetPasswordCard";
import ForgotPasswordCard from "./ForgotPasswordCard";
import ResetPasswordCard from "./ResetPasswordCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginInputModal({ visible, onClose }) {
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [resetEmail, setResetEmail] = useState(null);
	const [userInfo, setUserInfo] = useState(null); // Store user validation info

	const router = useRouter();
	const { showToast } = useToast();
	const { syncUserData } = useAuth();
	const { loginUser, checkUserExists, setPassword } = useLoginMutation();
	const {
		currentStep,
		loginData,
		updateLoginData,
		nextStep,
		previousStep,
		goToStep,
		resetLoginFlow,
		isTransitioning,
	} = useLogin();
	const { isDarkMode } = useTheme();

	useEffect(() => {
		if (visible) {
			setError(null);
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
		}
	}, [visible]);

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
			setUserInfo(null);
			onClose();
		});
	};

	const handleGoBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setError(null);
		previousStep();
	};

	const handleAuthMethodSelect = (method) => {
		updateLoginData({ authMethod: method });
		nextStep();
	};

	const handleContactTypeSelect = (type) => {
		updateLoginData({ contactType: type });
		nextStep();
	};

	const handleContactSubmit = async (value) => {
		if (!value) return;
		setLoading(true);
		setError(null);

		try {
			await new Promise((r) => setTimeout(r, 1200));

			updateLoginData({
				contact: value,
				[loginData.contactType === "email" ? "email" : "phone"]: value,
			});

			if (loginData.authMethod === LOGIN_AUTH_METHODS.PASSWORD) {
				try {
					const credentials =
						loginData.contactType === "email"
							? { email: value }
							: { phone: value };
					const userCheck = await checkUserExists(credentials);
					setUserInfo(userCheck);

					if (!userCheck.hasPassword) {
						Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
						showToast("No password set for this account", "info");
						setError(
							"You haven't set a password yet. Please set one below or use OTP login instead."
						);
						goToStep(LOGIN_STEPS.SET_PASSWORD);
						return;
					}
				} catch (err) {
					const [errorCode, errorMessage] = err.message?.split("|") || [];
					setError(errorMessage || "Unable to find account");
					showToast(errorMessage || "Account not found", "error");

					if (errorCode === "USER_NOT_FOUND") {
						setTimeout(() => {
							showToast("Please create an account first", "info");
						}, 2000);
					}
					setLoading(false);
					return;
				}
			}

			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast(
				loginData.authMethod === LOGIN_AUTH_METHODS.OTP
					? `Verification code sent to your ${loginData.contactType}`
					: "Ready to sign in",
				"success"
			);
		} catch (err) {
			const errorMessage =
				err.message?.split("|")[1] || "Unable to proceed. Please try again.";
			setError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleOTPSubmit = async (otp) => {
		if (!otp || otp.length !== 6) return;
		setLoading(true);
		setError(null);

		try {
			await new Promise((r) => setTimeout(r, 800));

			updateLoginData({ otp });

			const credentials = {
				email: loginData.email,
				phone: loginData.phone,
				otp,
			};

			try {
				await loginUser(credentials);

				// Sync user data to ensure proper state update
				await syncUserData();

				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast("Welcome back to iVisit!", "success");

				// Close modal and let the root layout handle navigation
				handleDismiss();
			} catch (err) {
				const [errorCode] = err.message?.split("|") || [];

				if (errorCode === "USER_NOT_FOUND") {
					Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
					showToast("No account found. Let's create one for you!", "info");

					await AsyncStorage.setItem(
						"pendingRegistration",
						JSON.stringify({
							email: loginData.email,
							phone: loginData.phone,
							contactType: loginData.contactType,
							verified: true,
						})
					);

					setTimeout(() => {
						handleDismiss();
					}, 1500);
				} else {
					throw err;
				}
			}
		} catch (err) {
			const [, errorMessage] = err.message?.split("|") || [];
			const displayMessage =
				errorMessage || "Unable to sign in. Please try again.";

			setError(displayMessage);
			showToast(displayMessage, "error");
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordSubmit = async (password) => {
		if (!password) return;
		setLoading(true);
		setError(null);

		try {
			updateLoginData({ password });

			const credentials = {
				email: loginData.email,
				phone: loginData.phone,
				password,
			};

			await loginUser(credentials);

			// Sync user data to ensure proper state update
			await syncUserData();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Welcome back to iVisit!", "success");

			// Close modal and let the root layout handle navigation
			handleDismiss();
		} catch (err) {
			const [, errorMessage] = err.message?.split("|") || [];
			const displayMessage =
				errorMessage || "Unable to sign in. Please try again.";

			setError(displayMessage);
			showToast(displayMessage, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleSetPassword = async (password) => {
		if (!password) return;
		setLoading(true);
		setError(null);

		try {
			const credentials = {
				email: loginData.email,
				phone: loginData.phone,
				password,
			};

			await setPassword(credentials);

			// Sync user data to ensure proper state update
			await syncUserData();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Password set successfully! Welcome to iVisit!", "success");

			// Close modal and let the root layout handle navigation
			handleDismiss();
		} catch (err) {
			const [, errorMessage] = err.message?.split("|") || [];
			const displayMessage =
				errorMessage || "Unable to set password. Please try again.";

			setError(displayMessage);
			showToast(displayMessage, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPasswordInitiated = (email) => {
		setResetEmail(email);
		goToStep(LOGIN_STEPS.RESET_PASSWORD);
	};

	const handlePasswordReset = () => {
		showToast("Password reset successfully", "success");
		setResetEmail(null);
		goToStep(LOGIN_STEPS.PASSWORD_INPUT);
	};

	const getHeaderTitle = () => {
		if (currentStep === LOGIN_STEPS.AUTH_METHOD) return "Sign In";
		if (currentStep === LOGIN_STEPS.CONTACT_TYPE) return "Contact Method";
		if (currentStep === LOGIN_STEPS.CONTACT_INPUT) {
			return loginData.contactType === "email"
				? "Email Address"
				: "Phone Number";
		}
		if (currentStep === LOGIN_STEPS.OTP_VERIFICATION) return "Verify Code";
		if (currentStep === LOGIN_STEPS.PASSWORD_INPUT) return "Enter Password";
		if (currentStep === LOGIN_STEPS.SET_PASSWORD) return "Set Password";
		if (currentStep === LOGIN_STEPS.FORGOT_PASSWORD) return "Reset Password";
		if (currentStep === LOGIN_STEPS.RESET_PASSWORD)
			return "Create New Password";
		return "Sign In";
	};

	const colors = {
		bg: isDarkMode ? "#0D1117" : "#FFFFFF",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		error: COLORS.error,
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
								{currentStep !== LOGIN_STEPS.AUTH_METHOD && (
									<Pressable
										onPress={handleGoBack}
										className="p-2 bg-gray-500/10 rounded-full mr-4"
									>
										<Ionicons name="arrow-back" size={20} color={colors.text} />
									</Pressable>
								)}

								<View className="flex-1">
									{currentStep !== LOGIN_STEPS.AUTH_METHOD &&
										currentStep !== LOGIN_STEPS.CONTACT_TYPE &&
										currentStep !== LOGIN_STEPS.CONTACT_INPUT &&
										currentStep !== LOGIN_STEPS.FORGOT_PASSWORD && (
											<Text
												className="text-[10px] tracking-[3px] mb-2 uppercase font-black"
												style={{ color: COLORS.brandPrimary }}
											>
												{loginData.authMethod === LOGIN_AUTH_METHODS.OTP
													? "CODE VERIFICATION"
													: "PASSWORD ACCESS"}
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

							{/* Error Display */}
							{error && (
								<View
									style={{
										backgroundColor: `${COLORS.error}15`,
										padding: 16,
										borderRadius: 12,
										marginBottom: 16,
										borderLeftWidth: 4,
										borderLeftColor: COLORS.error,
									}}
								>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										<Ionicons
											name="alert-circle"
											size={20}
											color={COLORS.error}
											style={{ marginRight: 8 }}
										/>
										<Text
											style={{
												color: COLORS.error,
												fontSize: 14,
												fontWeight: "600",
												flex: 1,
											}}
										>
											{error}
										</Text>
									</View>
								</View>
							)}

							{/* Content */}
							{currentStep === LOGIN_STEPS.AUTH_METHOD && (
								<LoginAuthMethodCard
									onSelect={handleAuthMethodSelect}
									disabled={isTransitioning}
								/>
							)}

							{currentStep === LOGIN_STEPS.CONTACT_TYPE && (
								<LoginContactCard
									authMethod={loginData.authMethod}
									onSelect={handleContactTypeSelect}
									disabled={isTransitioning}
								/>
							)}

							{currentStep === LOGIN_STEPS.CONTACT_INPUT &&
								loginData.contactType === "phone" && (
									<PhoneInputField
										initialValue={loginData.phone}
										onSubmit={handleContactSubmit}
										loading={loading}
									/>
								)}

							{currentStep === LOGIN_STEPS.CONTACT_INPUT &&
								loginData.contactType === "email" && (
									<EmailInputField
										initialValue={loginData.email}
										onSubmit={handleContactSubmit}
										loading={loading}
									/>
								)}

							{currentStep === LOGIN_STEPS.OTP_VERIFICATION && (
								<OTPInputCard
									method={loginData.contactType}
									contact={loginData.contact}
									onVerified={handleOTPSubmit}
									loading={loading}
								/>
							)}

							{currentStep === LOGIN_STEPS.PASSWORD_INPUT && (
								<PasswordInputField
									onSubmit={handlePasswordSubmit}
									loading={loading}
									showForgotPassword
									onForgotPassword={() => goToStep(LOGIN_STEPS.FORGOT_PASSWORD)}
								/>
							)}

							{currentStep === LOGIN_STEPS.SET_PASSWORD && (
								<SetPasswordCard
									onPasswordSet={handleSetPassword}
									loading={loading}
								/>
							)}

							{currentStep === LOGIN_STEPS.FORGOT_PASSWORD && (
								<ForgotPasswordCard
									onResetInitiated={handleForgotPasswordInitiated}
								/>
							)}

							{currentStep === LOGIN_STEPS.RESET_PASSWORD && (
								<ResetPasswordCard
									email={resetEmail}
									onPasswordReset={handlePasswordReset}
								/>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
