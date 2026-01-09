// components/register/AuthInputModal.jsx

/**
 * Registration Modal using new service layer
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
import { REGISTRATION_STEPS } from "../../constants/registrationSteps";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../contexts/AuthContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import useSignUp from "../../hooks/mutations/useSignup";
import PhoneInputField from "./PhoneInputField";
import EmailInputField from "./EmailInputField";
import OTPInputCard from "./OTPInputCard";
import ProfileForm from "./ProfileForm";
import PasswordInputField from "./PasswordInputField";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AuthInputModal({ visible, onClose, type }) {
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;
	const [mockOtp, setMockOtp] = useState(null); // DEV: Display mock OTP for testing

	const { showToast } = useToast();
	const {
		currentStep,
		registrationData,
		updateRegistrationData,
		nextStep,
		previousStep,
		goToStep,
		checkAndApplyPendingRegistration,
		// Use context error/loading states
		error,
		setRegistrationError,
		clearError,
		isLoading: loading,
		startLoading,
		stopLoading,
	} = useRegistration();

	// Pass context state functions to hook
	const { signUpUser, completeRegistration, requestRegistrationOtp, verifyRegistrationOtp } =
		useSignUp({
			startLoading,
			stopLoading,
			setError: setRegistrationError,
			clearError,
		});

	const { login, syncUserData } = useAuth();
	const { isDarkMode } = useTheme();

	/* ------------------ Animations ------------------ */
	useEffect(() => {
		if (visible) {
			clearError();
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

			// Check for pending verified registration (from login flow)
			const initModal = async () => {
				const hasPending = await checkAndApplyPendingRegistration();
				if (!hasPending && currentStep === REGISTRATION_STEPS.METHOD_SELECTION) {
					updateRegistrationData({ method: type });
					goToStep(
						type === "phone"
							? REGISTRATION_STEPS.PHONE_INPUT
							: REGISTRATION_STEPS.EMAIL_INPUT
					);
				}
			};
			initModal();
		}
	}, [visible]);

	/* ------------------ Handlers ------------------ */
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
			clearError();
			onClose();
		});
	};

	const handleGoBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		clearError();
		previousStep();
	};

	const handleInputSubmit = async (value) => {
		if (!value) return;

		startLoading();
		clearError();

		try {
			updateRegistrationData({
				method: type,
				phone: type === "phone" ? value : null,
				email: type === "email" ? value : null,
			});

			// Request OTP for verification
			const otpResult = await requestRegistrationOtp(
				type === "phone" ? { phone: value } : { email: value }
			);

			if (!otpResult.success) {
				setRegistrationError(otpResult.error);
				showToast(otpResult.error, "error");
				stopLoading();
				return;
			}

			// DEV: Store mock OTP for display (Only if service returns it, which it doesn't for real auth)
			if (otpResult.data?.otp) {
				setMockOtp(otpResult.data.otp);
			} else {
                setMockOtp(null);
            }

			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast(
				type === "phone"
					? "Verification code sent to your phone"
					: "Verification code sent to your email",
				"success"
			);
		} catch (err) {
			const errorMessage =
				err.message?.split("|")[1] || "Failed to process. Please try again.";
			setRegistrationError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			stopLoading();
		}
	};

    const handleResendOtp = async () => {
        startLoading();
        clearError();
        try {
            const contact = registrationData.phone || registrationData.email;
            const otpResult = await requestRegistrationOtp(
				type === "phone" ? { phone: contact } : { email: contact }
			);

            if (!otpResult.success) {
                showToast(otpResult.error || "Failed to resend code", "error");
            } else {
                 showToast("Code resent successfully", "success");
            }
        } catch (e) {
             showToast("Failed to resend code", "error");
        } finally {
            stopLoading();
        }
    };

	const handleOTPSubmit = async (otp) => {
		if (!otp) return;

		const result = await verifyRegistrationOtp({
			email: registrationData.email,
			phone: registrationData.phone,
			otp,
		});

		if (result.success) {
			// Check if user already has a profile (isExistingUser)
			if (result.data?.isExistingUser) {
				// User already exists and has profile - auto-login them
				await login({ ...result.data }); // result.data contains user + token
				await syncUserData();

				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast("Welcome back! Logged you in automatically.", "success");

				handleDismiss();
				return;
			}

			// User is new (no profile yet) - continue registration flow
            // Note: User is technically authenticated in Supabase/Storage now, 
            // but we don't call login() yet to keep them in the modal flow.
			updateRegistrationData({ otp });
			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("OTP verified successfully", "success");
		} else {
			showToast(result.error || "OTP verification failed", "error");
		}
	};

	const handlePasswordSubmit = async (password) => {
		// if (!password) return; // Password can be optional/empty if we treat it that way, but here we expect it if they didn't skip.

		updateRegistrationData({ password });

		const payload = {
			username:
				registrationData.username ||
				registrationData.email?.split("@")[0] ||
				`user${Date.now()}`,
			email: registrationData.email,
			phone: registrationData.phone,
			firstName: registrationData.firstName,
			lastName: registrationData.lastName,
			fullName: registrationData.fullName,
			imageUri: registrationData.imageUri,
			dateOfBirth: registrationData.dateOfBirth,
			password,
		};

		const result = await completeRegistration(payload);

		if (result.success) {
            // completeRegistration already calls login() internally
			await syncUserData();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Registration successful!", "success");

			handleDismiss();
		} else {
			showToast(result.error || "Registration failed", "error");
		}
	};

	const handleSkipPassword = async () => {
		const payload = {
			username:
				registrationData.username ||
				registrationData.email?.split("@")[0] ||
				`user${Date.now()}`,
			email: registrationData.email,
			phone: registrationData.phone,
			firstName: registrationData.firstName,
			lastName: registrationData.lastName,
			fullName: registrationData.fullName,
			imageUri: registrationData.imageUri,
			dateOfBirth: registrationData.dateOfBirth,
		};

		const result = await completeRegistration(payload);

		if (result.success) {
            // completeRegistration already calls login() internally
			await syncUserData();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Registered successfully", "info");

			handleDismiss();
		} else {
			showToast(result.error || "Registration failed", "error");
		}
	};

	/* ------------------ Step Helpers ------------------ */
	const isInputStep =
		currentStep === REGISTRATION_STEPS.PHONE_INPUT ||
		currentStep === REGISTRATION_STEPS.EMAIL_INPUT;
	const isOTPStep = currentStep === REGISTRATION_STEPS.OTP_VERIFICATION;
	const isProfileStep = currentStep === REGISTRATION_STEPS.PROFILE_FORM;
	const isPasswordStep = currentStep === REGISTRATION_STEPS.PASSWORD_SETUP;

	const getStepNumber = () =>
		isInputStep ? 1 : isOTPStep ? 2 : isProfileStep ? 3 : 4;

	const getHeaderTitle = () => {
		if (isInputStep) return type === "phone" ? "Phone Number" : "Email Address";
		if (isOTPStep) return "Verification";
		if (isProfileStep) return "Profile Setup";
		if (isPasswordStep) return "Create Password";
		return "Sign Up";
	};

	const colors = {
		bg: isDarkMode ? "#0D1117" : "#FFFFFF",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		error: COLORS.error,
	};

	/* ------------------ Render ------------------ */
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
									<Text
										className="text-[10px] tracking-[3px] mb-2 uppercase font-black"
										style={{ color: COLORS.brandPrimary }}
									>
										Step {getStepNumber()} of 4
									</Text>
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
							{isInputStep &&
								(type === "phone" ? (
									<PhoneInputField
										initialValue={registrationData.phone}
										onSubmit={handleInputSubmit}
										loading={loading}
									/>
								) : (
									<EmailInputField
										initialValue={registrationData.email}
										onSubmit={handleInputSubmit}
										loading={loading}
									/>
								))}

							{isOTPStep && (
								<View>
									{/* DEV: Show mock OTP for testing - remove in production */}
									{mockOtp && (
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
									)}
									<OTPInputCard
										method={registrationData.method}
										contact={registrationData.phone || registrationData.email}
										onVerified={handleOTPSubmit}
                                        onResend={handleResendOtp}
										loading={loading}
									/>
								</View>
							)}

							{isProfileStep && <ProfileForm />}

							{isPasswordStep && (
								<PasswordInputField
									onSubmit={handlePasswordSubmit}
									onSkip={handleSkipPassword}
									showSkipOption={true}
									loading={loading}
								/>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
