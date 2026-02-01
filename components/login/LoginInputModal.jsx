// components/login/LoginInputModal.jsx
/**
 * components/login/LoginInputModal.jsx
 * Production-ready login modal using new service layer
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
import useLoginHook from "../../hooks/auth/useLogin";
import { useAuth } from "../../contexts/AuthContext";
import { database, StorageKeys } from "../../database";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";
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

export default function LoginInputModal({ visible, onClose, onSwitchToSignUp }) {
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const { modalHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
		useAndroidKeyboardAwareModal({ defaultHeight: SCREEN_HEIGHT * 0.85 });

	const [resetEmail, setResetEmail] = useState(null);
	const [resetToken, setResetToken] = useState(null); // DEV: Store mock reset token
	const [userInfo, setUserInfo] = useState(null); // Store user validation info
	const [mockOtp, setMockOtp] = useState(null); // DEV: Display mock OTP for testing
	const [showSignUpOption, setShowSignUpOption] = useState(false); // Show sign up option when account not found

	const router = useRouter();
	const { showToast } = useToast();
	const { syncUserData, login: authLogin } = useAuth();
	const {
		currentStep,
		loginData,
		updateLoginData,
		nextStep,
		previousStep,
		goToStep,
		resetLoginFlow,
		isTransitioning,
		// Use context error/loading states
		error,
		setLoginError,
		clearError,
		isLoading: loading,
		startLoading,
		stopLoading,
	} = useLogin();
	const { isDarkMode } = useTheme();

	// Pass context state functions to hook
	const { loginWithPassword, requestOtp, verifyOtpLogin, setPassword } = useLoginHook({
		startLoading,
		stopLoading,
		setError: setLoginError,
		clearError,
	});

	useEffect(() => {
		if (visible) {
			clearError();
			setShowSignUpOption(false);
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
			setUserInfo(null);
			setShowSignUpOption(false);
			onClose();
		});
	};

	const handleSwitchToSignUp = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		// Close this modal and open sign up
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
			setUserInfo(null);
			setShowSignUpOption(false);
			onClose();

			// Call the onSwitchToSignUp callback if provided
			if (onSwitchToSignUp) {
				onSwitchToSignUp(loginData.contactType);
			}
		});
	};

	const handleGoBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		clearError();
		setShowSignUpOption(false);
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

	// Switch from password flow to OTP flow (for users without password)
	const handleSwitchToOtpLogin = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		clearError();

		// Update auth method to OTP
		updateLoginData({ authMethod: LOGIN_AUTH_METHODS.OTP });

		// Request OTP for the already-entered contact
		const contact = loginData.contact;
		if (!contact) {
			goToStep(LOGIN_STEPS.CONTACT_INPUT);
			return;
		}

		await handleResendOtpLogin(contact);

		goToStep(LOGIN_STEPS.OTP_VERIFICATION);
	};

	const handleResendOtpLogin = async (contactValue) => {
		const contact = contactValue || loginData.contact;
		if (!contact) return;

		startLoading();
		try {
			const otpResult = await requestOtp(
				loginData.contactType === "email" ? { email: contact } : { phone: contact }
			);

			if (!otpResult.success) {
				setLoginError(otpResult.error || "Unable to send verification code");
				showToast(otpResult.error || "Failed to send code", "error");
				return;
			}

			// DEV: Store mock OTP for display (Only if service returns it)
			if (otpResult.data?.otp) {
				setMockOtp(otpResult.data.otp);
			} else {
				setMockOtp(null);
			}

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast(
				`Verification code sent to your ${loginData.contactType}`,
				"success"
			);
		} catch (err) {
			console.error("LoginInputModal handleResendOtpLogin error:", err);
			const errorMessage = err.message || "Failed to send verification code";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			stopLoading();
		}
	};

	// Email validation helper
	const isValidEmail = (email) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	// Phone validation helper
	const isValidPhone = (phone) => {
		const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
		return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
	};

	const handleContactSubmit = async (value) => {
		if (!value) return;

		// Validate input format before API call
		if (loginData.contactType === "email" && !isValidEmail(value)) {
			const errorMessage = "Please enter a valid email address";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
			return;
		}

		if (loginData.contactType === "phone" && !isValidPhone(value)) {
			const errorMessage = "Please enter a valid phone number";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
			return;
		}

		startLoading();
		clearError();

		try {
			updateLoginData({
				contact: value,
				[loginData.contactType === "email" ? "email" : "phone"]: value,
			});

			if (loginData.authMethod === LOGIN_AUTH_METHODS.PASSWORD) {
				// SKIP unreliable pre-check (Supabase doesn't allow public user existence checks)
				// We proceed directly to password entry. The login attempt will validate existence.

				// Clear any previous user info since we are skipping the check
				setUserInfo(null);

				// Proceed to password step
				nextStep();
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			} else {
				// OTP flow - request OTP
				const otpResult = await requestOtp(
					loginData.contactType === "email"
						? { email: value }
						: { phone: value }
				);

				if (!otpResult.success) {
					setLoginError(otpResult.error || "Unable to send verification code");
					showToast(otpResult.error || "Failed to send code", "error");
					stopLoading();
					return;
				}

				// DEV: Store mock OTP for display
				if (otpResult.data?.otp) {
					setMockOtp(otpResult.data.otp);
				} else {
					setMockOtp(null);
				}

				nextStep();
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast(
					`Verification code sent to your ${loginData.contactType}`,
					"success"
				);
			}
		} catch (err) {
			console.error("LoginInputModal handleContactSubmit error:", err);
			const errorMessage =
				(err.message?.includes("|") ? err.message.split("|")[1] : err.message) ||
				"Unable to proceed. Please try again.";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			stopLoading();
		}
	};

	const handleOTPSubmit = async (otp) => {
		if (!otp || otp.length < 6) return; // Allow 6 or more digits (Supabase default is 6, but configurable)

		updateLoginData({ otp });

		const result = await verifyOtpLogin({
			email: loginData.email,
			phone: loginData.phone,
			otp,
		});

		if (result.success) {
			// Check if user is actually new (no profile)
			// But for OTP flow, Supabase creates user automatically if not exists
			// We should treat this as a successful login regardless.
			// If they need to complete profile, the MainLayout or AuthContext should handle that redirect.

			// Sync user data to ensure proper state update
			await syncUserData();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Welcome back to iVisit!", "success");

			// Close modal and let the root layout handle navigation
			handleDismiss();
		} else {
			// Check if user not found - show sign up option
			const errorLower = result.error?.toLowerCase() || "";
			if (
				errorLower.includes("not found") ||
				errorLower.includes("user_not_found") ||
				errorLower.includes("not_found")
			) {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
				setLoginError(
					"No account found with this " +
					loginData.contactType +
					". Would you like to create one?"
				);
				setShowSignUpOption(true);

				// Store pending registration using database layer
				await database.write(StorageKeys.PENDING_REGISTRATION, {
					email: loginData.email,
					phone: loginData.phone,
					contactType: loginData.contactType,
					verified: true,
				});
			} else {
				setLoginError(result.error || "Unable to verify code");
				showToast(result.error || "Unable to verify code", "error");
			}
		}
	};

	const handlePasswordSubmit = async (password) => {
		if (!password) return;

		// Basic password validation
		if (password.length < 6) {
			const errorMessage = "Password must be at least 6 characters";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
			return;
		}

		updateLoginData({ password });

		try {
			const result = await loginWithPassword({
				email: loginData.email,
				phone: loginData.phone,
				password,
			});

			if (result.success) {
				// Sync user data to ensure proper state update
				await syncUserData();

				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast("Welcome back to iVisit!", "success");

				// Close modal and let root layout handle navigation
				handleDismiss();
			} else {
				showToast(result.error || "Unable to sign in", "error");
			}
		} catch (err) {
			console.error("LoginInputModal handlePasswordSubmit error:", err);
			const errorMessage = err.message || "Unable to sign in. Please try again.";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
		}
	};

	const handleSetPassword = async (password) => {
		if (!password) return;

		// Basic password validation
		if (password.length < 6) {
			const errorMessage = "Password must be at least 6 characters";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
			return;
		}

		startLoading();
		clearError();

		try {
			const result = await setPassword({
				email: loginData.email,
				phone: loginData.phone,
				password,
			});

			if (result.success) {
				// Update AuthContext with user data after password is set
				const loginSuccess = await authLogin({
					...result.data.user,
					token: result.data.token,
				});

				if (!loginSuccess) {
					setLoginError("Password set but failed to save session");
					showToast("Password set but login failed. Please try again.", "error");
					stopLoading();
					return;
				}

				// Sync user data to ensure proper state update
				await syncUserData();

				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast("Password set successfully! Welcome to iVisit!", "success");

				// Close modal and let the root layout handle navigation
				handleDismiss();
			} else {
				setLoginError(result.error || "Unable to set password");
				showToast(result.error || "Unable to set password", "error");
			}
		} catch (err) {
			console.error("LoginInputModal handleSetPassword error:", err);
			const errorMessage = err.message || "Unable to set password. Please try again.";
			setLoginError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			stopLoading();
		}
	};

	const handleForgotPasswordInitiated = (email, token) => {
		setResetEmail(email);
		setResetToken(token); // DEV: Store mock reset token for display
		goToStep(LOGIN_STEPS.RESET_PASSWORD);
	};

	const handlePasswordReset = () => {
		showToast("Password reset successfully", "success");
		setResetEmail(null);
		setResetToken(null);
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
						height: modalHeight,
					}}
					className="rounded-t-[48px] px-8 pt-4 shadow-2xl"
				>
					<View className="w-12 h-1.5 bg-gray-500/10 rounded-full self-center mb-6" />

					<KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
						<ScrollView {...getScrollViewProps()}>
							{/* Header */}
							<View className="flex-row items-start mb-8">
								{currentStep !== LOGIN_STEPS.AUTH_METHOD && (
									<Pressable
										onPress={handleGoBack}
										className="p-3 bg-gray-500/5 rounded-2xl mr-4"
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
												className="text-[10px] mb-2 uppercase"
												style={{
													color: COLORS.brandPrimary,
													fontWeight: "800",
													letterSpacing: 1.5
												}}
											>
												{loginData.authMethod === LOGIN_AUTH_METHODS.OTP
													? "CODE VERIFICATION"
													: "PASSWORD ACCESS"}
											</Text>
										)}
									<Text
										className="text-3xl"
										style={{
											color: colors.text,
											fontWeight: "900",
											letterSpacing: -1.0
										}}
									>
										{getHeaderTitle()}
									</Text>
								</View>

								<Pressable
									onPress={handleDismiss}
									className="p-3 bg-gray-500/5 rounded-2xl"
								>
									<Ionicons name="close" size={20} color={colors.text} />
								</Pressable>
							</View>

							{/* Error Display */}
							{error && (
								<View
									style={{
										backgroundColor: showSignUpOption
											? `${COLORS.brandPrimary}15`
											: `${COLORS.error}15`,
										padding: 20,
										borderRadius: 24,
										marginBottom: 20,
									}}
								>
									<View style={{ flexDirection: "row", alignItems: "center" }}>
										<Ionicons
											name={showSignUpOption ? "person-add" : "alert-circle"}
											size={22}
											color={showSignUpOption ? COLORS.brandPrimary : COLORS.error}
											style={{ marginRight: 12 }}
										/>
										<Text
											style={{
												color: showSignUpOption
													? COLORS.brandPrimary
													: COLORS.error,
												fontSize: 15,
												fontWeight: '600',
												flex: 1,
											}}
										>
											{error}
										</Text>
									</View>

									{/* Sign Up Button when account not found */}
									{showSignUpOption && onSwitchToSignUp && (
										<Pressable
											onPress={handleSwitchToSignUp}
											style={{
												backgroundColor: COLORS.brandPrimary,
												paddingVertical: 14,
												paddingHorizontal: 24,
												borderRadius: 24,
												marginTop: 16,
												flexDirection: "row",
												alignItems: "center",
												justifyContent: "center",
												shadowColor: COLORS.brandPrimary,
												shadowOffset: { width: 0, height: 4 },
												shadowOpacity: 0.3,
												shadowRadius: 8,
											}}
										>
											<Ionicons
												name="person-add"
												size={18}
												color="white"
												style={{ marginRight: 8 }}
											/>
											<Text
												style={{
													color: "white",
													fontSize: 15,
													fontWeight: "900",
													letterSpacing: -0.5
												}}
											>
												CREATE ACCOUNT
											</Text>
										</Pressable>
									)}
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
								<View>
									{/* DEV: Show mock OTP for testing - remove in production */}
									{/* {mockOtp && (
										<View
											className="mb-4 p-3 rounded-xl"
											style={{
												backgroundColor: isDarkMode
													? "rgba(34, 197, 94, 0.15)"
													: "rgba(34, 197, 94, 0.1)",
												borderWidth: 1,
												borderColor: isDarkMode
													? "rgba(34, 197, 94, 0.3)"
													: "rgba(34, 197, 94, 0.2)",
											}}
										>
											<Text
												className="text-xs text-center mb-1"
												style={{
													color: isDarkMode ? "#86efac" : "#166534",
												}}
											>
												🔐 DEV MODE - Your test OTP:
											</Text>
											<Text
												className="text-2xl font-bold text-center tracking-[8px]"
												style={{
													color: isDarkMode ? "#4ade80" : "#15803d",
												}}
											>
												{mockOtp}
											</Text>
										</View>
									)} */}
									<OTPInputCard
										method={loginData.contactType}
										contact={loginData.contact}
										onVerified={handleOTPSubmit}
										onResend={() => handleResendOtpLogin(loginData.contact)}
										loading={loading}
									/>
								</View>
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
									onSwitchToOtp={handleSwitchToOtpLogin}
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
									mockResetToken={resetToken}
								/>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
