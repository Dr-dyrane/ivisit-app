// components/register/AuthInputModal.jsx

"use client";

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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUserAPI } from "../../api/auth";
import { signUpUserAPI } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import PhoneInputField from "./PhoneInputField"; // Import PhoneInputField
import EmailInputField from "./EmailInputField"; // Import EmailInputField
import OTPInputCard from "./OTPInputCard"; // Import OTPInputCard
import ProfileForm from "./ProfileForm"; // Import ProfileForm
import PasswordInputField from "./PasswordInputField"; // Import PasswordInputField

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AuthInputModal({ visible, onClose, type }) {
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const { showToast } = useToast();

	const {
		currentStep,
		registrationData,
		updateRegistrationData,
		nextStep,
		previousStep,
		goToStep,
	} = useRegistration();

	const { login } = useAuth();
	const { isDarkMode } = useTheme();

	/* ------------------ Animations ------------------ */
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

			if (currentStep === REGISTRATION_STEPS.METHOD_SELECTION) {
				updateRegistrationData({ method: type });
				goToStep(
					type === "phone"
						? REGISTRATION_STEPS.PHONE_INPUT
						: REGISTRATION_STEPS.EMAIL_INPUT
				);
			}
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
			setError(null);
			onClose();
		});
	};

	const handleGoBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setError(null);
		previousStep();
	};

	const handleInputSubmit = async (value) => {
		if (!value) return;
		setLoading(true);
		setError(null);

		try {
			await new Promise((r) => setTimeout(r, 1200));
			updateRegistrationData({
				method: type,
				phone: type === "phone" ? value : null,
				email: type === "email" ? value : null,
			});
			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast(
				type === "phone" ? "Phone number accepted" : "Email address accepted",
				"success"
			);
		} catch (err) {
			const errorMessage =
				err.message?.split("|")[1] || "Failed to process. Please try again.";
			setError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleOTPSubmit = async (otp) => {
		if (!otp) return;
		setLoading(true);
		setError(null);

		try {
			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			const existingUser = users.find(
				(user) =>
					(registrationData.email &&
						user.email?.trim().toLowerCase() ===
							registrationData.email.trim().toLowerCase()) ||
					(registrationData.phone && user.phone === registrationData.phone)
			);

			if (existingUser) {
				// User already exists - auto-login them
				const credentials = {
					email: registrationData.email,
					phone: registrationData.phone,
					otp,
				};

				const { data } = await loginUserAPI(credentials);
				await login(data);

				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
				showToast("Welcome back! Logged you in automatically.", "success");

				handleDismiss();
				return;
			}

			// User doesn't exist - continue registration flow
			await new Promise((r) => setTimeout(r, 800));
			updateRegistrationData({ otp });
			nextStep();

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("OTP verified successfully", "success");
		} catch (err) {
			const errorMessage =
				err.message?.split("|")[1] || "OTP verification failed.";
			setError(errorMessage);
			showToast(errorMessage, "error");
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordSubmit = async (password) => {
		if (!password) return;
		setLoading(true);
		setError(null);

		try {
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

			const { data } = await signUpUserAPI(payload);
			await login(data);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Registration successful!", "success");

			handleDismiss();
		} catch (err) {
			const [errorCode, errorMessage] = err.message?.split("|") || [];
			const displayMessage =
				errorMessage || "Registration failed. Please try again.";

			setError(displayMessage);
			showToast(displayMessage, "error");

			if (errorCode === "EMAIL_EXISTS" || errorCode === "PHONE_EXISTS") {
				setTimeout(() => {
					showToast("Try logging in instead", "info");
				}, 2000);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleSkipPassword = async () => {
		setLoading(true);
		setError(null);

		try {
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

			const { data } = await signUpUserAPI(payload);
			await login(data);

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast("Registered successfully", "info");

			handleDismiss();
		} catch (err) {
			const [errorCode, errorMessage] = err.message?.split("|") || [];
			const displayMessage = errorMessage || "Registration failed.";

			setError(displayMessage);
			showToast(displayMessage, "error");

			if (errorCode === "EMAIL_EXISTS" || errorCode === "PHONE_EXISTS") {
				setTimeout(() => {
					showToast("Try logging in instead", "info");
				}, 2000);
			}
		} finally {
			setLoading(false);
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
								<OTPInputCard
									method={registrationData.method}
									contact={registrationData.phone || registrationData.email}
									onVerified={handleOTPSubmit}
									loading={loading}
								/>
							)}

							{isProfileStep && <ProfileForm />}

							{isPasswordStep && (
								<PasswordInputField
									onSubmit={handlePasswordSubmit}
									onSkip={handleSkipPassword}
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
