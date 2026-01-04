"use client";

// components/register/AuthInputModal.jsx
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import PhoneInputField from "./PhoneInputField";
import EmailInputField from "./EmailInputField";
import OTPInputCard from "./OTPInputCard";
import ProfileForm from "./ProfileForm";
import PasswordInputField from "./PasswordInputField";
import * as Haptics from "expo-haptics";
import {
	useRegistration,
	REGISTRATION_STEPS,
} from "../../contexts/RegistrationContext";
import { signUpUserAPI } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AuthInputModal({ visible, type, onClose }) {
	const { isDarkMode } = useTheme();
	const [loading, setLoading] = useState(false);

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const {
		currentStep: registrationStep,
		updateRegistrationData,
		nextStep,
		previousStep,
		registrationData,
		goToStep,
	} = useRegistration();

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

			// Ensure registration context is aligned with this modal's input type
			if (registrationStep === REGISTRATION_STEPS.METHOD_SELECTION) {
				// set the method in the context and navigate to the correct input step
				updateRegistrationData({ method: type });
				if (type === "phone") goToStep(REGISTRATION_STEPS.PHONE_INPUT);
				else goToStep(REGISTRATION_STEPS.EMAIL_INPUT);
			}
		} else {
			setLoading(false);
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
			onClose();
		});
	};

	const handleGoBack = () => {
		console.log("[v0] Back pressed - Current step:", registrationStep);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		previousStep();
	};

	const handleInputSubmit = async (value) => {
		if (!value) return;

		setLoading(true);
		console.log("[v0] Input submitted:", value, "Type:", type);

		try {
			await new Promise((resolve) => setTimeout(resolve, 1200));

			updateRegistrationData({
				method: type,
				phoneNumber: type === "phone" ? value : null,
				email: type === "email" ? value : null,
			});
			nextStep();
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (error) {
			console.error("[v0] OTP send error:", error);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	const handleOTPSubmit = async (otp) => {
		if (!otp) return;
		setLoading(true);
		console.log("[v0] OTP submitted:", otp);

		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			updateRegistrationData({ otp });
			nextStep();
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (error) {
			console.error("[v0] OTP verify error:", error);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		} finally {
			setLoading(false);
		}
	};

	const handleProfileSubmit = async (profileData) => {
		setLoading(true);
		console.log("[v0] Profile submitted:", profileData);

		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			updateRegistrationData({ profile: profileData, profileComplete: true });
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			handleDismiss();
		} catch (error) {
			console.error("[v0] Profile submit error:", error);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	const isInputStep =
		registrationStep === REGISTRATION_STEPS.PHONE_INPUT ||
		registrationStep === REGISTRATION_STEPS.EMAIL_INPUT;
	const isOTPStep = registrationStep === REGISTRATION_STEPS.OTP_VERIFICATION;
	const isProfileStep = registrationStep === REGISTRATION_STEPS.PROFILE_FORM;
	const isPasswordStep = registrationStep === REGISTRATION_STEPS.PASSWORD_SETUP;

	const getStepNumber = () => {
		if (isInputStep) return 1;
		if (isOTPStep) return 2;
		if (isProfileStep) return 3;
		if (isPasswordStep) return 4;
		return 1;
	};

	const getHeaderTitle = () => {
		if (isInputStep) return type === "phone" ? "Phone Number" : "Email Address";
		if (isOTPStep) return "Verification";
		if (isProfileStep) return "Profile Setup";
		if (isPasswordStep) return "Create Password";
		return "Sign Up";
	};

	const getSubtitle = () => {
		if (isInputStep) {
			return type === "phone"
				? "Enter your phone number to continue"
				: "Enter your email address to continue";
		}
		if (isPasswordStep) {
			return "Create a secure password for your account. You can change it later.";
		}
		return null;
	};

	const colors = {
		bg: isDarkMode ? "#0D1117" : "#FFFFFF",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
	};

	const canGoBack = !isInputStep;

	const { login } = useAuth();

	const handlePasswordSubmit = async (password) => {
		if (!password) return;
		setLoading(true);
		try {
			updateRegistrationData({ password });
			// Build payload for sign-up
			const payload = {
				username:
					registrationData.username || registrationData.profile?.username ||
					(registrationData.email ? registrationData.email.split("@")[0] : `user${Date.now()}`),
				email: registrationData.email || undefined,
				phone: registrationData.phoneNumber || undefined,
				password,
				firstName: registrationData.profile?.firstName || undefined,
				lastName: registrationData.profile?.lastName || undefined,
				avatar: registrationData.profile?.avatar || undefined,
			};

			const { data } = await signUpUserAPI(payload);
			// Auto-login using returned user object (contains token)
			await login(data);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			// Close the modal after successful signup/login
			handleDismiss();
		} catch (err) {
			console.error("[v0] Final signup error:", err);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleDismiss}
		>
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
					<View className="w-12 h-1.5 bg-gray-500/20 rounded-full self-center mb-8" />

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						className="flex-1"
					>
						<View className="flex-row justify-between items-start mb-8">
							{canGoBack && (
								<Pressable
									onPress={handleGoBack}
									className="p-2 bg-gray-500/10 rounded-full mr-4"
								>
									<Ionicons name="arrow-back" size={20} color={colors.text} />
								</Pressable>
							)}

							<View className="flex-1">
								<Text className="text-[10px] font-black tracking-[3px] mb-2 uppercase text-red-800">
									Step {getStepNumber()} of 4
								</Text>
								<Text
									className="text-3xl font-black tracking-tighter"
									style={{ color: colors.text }}
								>
									{getHeaderTitle()}
								</Text>
								{getSubtitle() && (
									<Text className="text-sm font-medium mt-2 text-gray-500">
										{getSubtitle()}
									</Text>
								)}
							</View>

							<Pressable
								onPress={handleDismiss}
								className="p-2 bg-gray-500/10 rounded-full"
							>
								<Ionicons name="close" size={20} color={colors.text} />
							</Pressable>
						</View>

						<View className="flex-1">
																					{isInputStep && (
																							<>
																								{type === "phone" ? (
																									<PhoneInputField
																										initialValue={registrationData.phoneNumber || null}
																										onValidChange={(val) => updateRegistrationData({ phoneNumber: val })}
																										onSubmit={handleInputSubmit}
																									/>
																								) : (
																									<EmailInputField
																										initialValue={registrationData.email || ""}
																										onValidChange={(val) => updateRegistrationData({ email: val })}
																										onSubmit={handleInputSubmit}
																									/>
																								)}
																							</>
																						)}

							{isOTPStep && (
								<OTPInputCard
									method={registrationData.method}
									contact={
										registrationData.phoneNumber || registrationData.email
									}
									onVerified={handleOTPSubmit}
								/>
							)}

							{isProfileStep && (
								<ProfileForm onComplete={() => {}} />
							)}

							{isPasswordStep && (
								<PasswordInputField
									initialValue={registrationData.password || ""}
									onSubmit={handlePasswordSubmit}
								/>
							)}
						</View>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
