// components/login/LoginInputModal.jsx
/**
 * components/login/LoginInputModal.jsx
 * Production-ready login modal using View-Hook pattern
 */

import {
	View,
	Text,
	Modal,
	Animated,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useLoginInputModalLogic } from "../../hooks/auth/useLoginInputModalLogic";
import { LOGIN_STEPS, LOGIN_AUTH_METHODS } from "../../contexts/LoginContext";
import { COLORS } from "../../constants/colors";
import { styles } from "./LoginInputModal.styles";

import LoginAuthMethodCard from "./LoginAuthMethodCard";
import LoginContactCard from "./LoginContactCard";
import PhoneInputField from "../register/PhoneInputField";
import EmailInputField from "../register/EmailInputField";
import OTPInputCard from "../register/OTPInputCard";
import PasswordInputField from "../register/PasswordInputField";
import SetPasswordCard from "./SetPasswordCard";
import ForgotPasswordCard from "./ForgotPasswordCard";
import ResetPasswordCard from "./ResetPasswordCard";
import SmartContactInput from "../auth/SmartContactInput";

export default function LoginInputModal({ visible, onClose, onSwitchToSignUp }) {
	const { state, animations, actions } = useLoginInputModalLogic({ 
        visible, 
        onClose, 
        onSwitchToSignUp 
    });

	const {
		currentStep,
		loginData,
		error,
		loading,
		showSignUpOption,
		mockOtp,
		resetEmail,
		resetToken,
		modalHeight,
		keyboardHeight,
		colors,
		isTransitioning,
	} = state;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={actions.handleDismiss}
			statusBarTranslucent={true}
		>
			<View
				style={[styles.container, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}
			>
				<Animated.View
					style={[styles.overlay, { opacity: animations.bgOpacity }]}
				>
					<Pressable style={styles.pressableOverlay} onPress={actions.handleDismiss} />
				</Animated.View>

				<Animated.View
					style={[
                        styles.modalContainer,
						{
							transform: [{ translateY: animations.slideAnim }],
							backgroundColor: colors.bg,
							height: modalHeight,
						}
                    ]}
				>
					<View style={styles.handleBar} />

					<KeyboardAvoidingView {...actions.getKeyboardAvoidingViewProps()}>
						<ScrollView {...actions.getScrollViewProps()}>
							{/* Header */}
							<View style={styles.headerRow}>
								{currentStep !== LOGIN_STEPS.AUTH_METHOD && currentStep !== LOGIN_STEPS.SMART_CONTACT && (
									<Pressable
										onPress={actions.handleGoBack}
										style={styles.backButton}
									>
										<Ionicons name="arrow-back" size={20} color={colors.text} />
									</Pressable>
								)}

								<View style={styles.headerContent}>
									<Text style={styles.stepText}>
										Step {actions.getStepNumber()} of 2
									</Text>
									<Text style={[styles.headerTitle, { color: colors.text }]}>
										{actions.getHeaderTitle()}
									</Text>
								</View>

								<Pressable
									onPress={actions.handleDismiss}
									style={styles.closeButton}
								>
									<Ionicons name="close" size={20} color={colors.text} />
								</Pressable>
							</View>

							{/* Error Display */}
							{error && (
								<View
									style={[
                                        styles.errorContainer,
                                        {
                                            backgroundColor: showSignUpOption
                                                ? `${COLORS.brandPrimary}15`
                                                : `${COLORS.error}15`,
                                        }
                                    ]}
								>
									<View style={styles.errorRow}>
										<Ionicons
											name={showSignUpOption ? "person-add" : "alert-circle"}
											size={22}
											color={showSignUpOption ? COLORS.brandPrimary : COLORS.error}
											style={styles.errorIcon}
										/>
										<Text
											style={[
                                                styles.errorText,
                                                {
                                                    color: showSignUpOption
                                                        ? COLORS.brandPrimary
                                                        : COLORS.error,
                                                }
                                            ]}
										>
											{error}
										</Text>
									</View>

									{/* Sign Up Button when account not found */}
									{showSignUpOption && onSwitchToSignUp && (
										<Pressable
											onPress={actions.handleSwitchToSignUp}
											style={styles.signUpButton}
										>
											<Ionicons
												name="person-add"
												size={18}
												color="white"
												style={styles.signUpIcon}
											/>
											<Text style={styles.signUpText}>
												CREATE ACCOUNT
											</Text>
										</Pressable>
									)}
								</View>
							)}

							{/* Content */}
							{currentStep === LOGIN_STEPS.SMART_CONTACT && (
								<SmartContactInput
									onSubmit={actions.handleSmartContactSubmit}
									loading={loading}
									initialValue={loginData.contact || ""}
								/>
							)}

							{currentStep === LOGIN_STEPS.AUTH_METHOD && (
								<LoginAuthMethodCard
									onSelect={actions.handleAuthMethodSelect}
									disabled={isTransitioning}
								/>
							)}

							{currentStep === LOGIN_STEPS.CONTACT_TYPE && (
								<LoginContactCard
									authMethod={loginData.authMethod}
									onSelect={actions.handleContactTypeSelect}
									disabled={isTransitioning}
								/>
							)}

							{currentStep === LOGIN_STEPS.CONTACT_INPUT &&
								loginData.contactType === "phone" && (
									<PhoneInputField
										initialValue={loginData.phone}
										onSubmit={actions.handleContactSubmit}
										loading={loading}
									/>
								)}

							{currentStep === LOGIN_STEPS.CONTACT_INPUT &&
								loginData.contactType === "email" && (
									<EmailInputField
										initialValue={loginData.email}
										onSubmit={actions.handleContactSubmit}
										loading={loading}
									/>
								)}

							{currentStep === LOGIN_STEPS.OTP_VERIFICATION && (
								<View>
									<OTPInputCard
										method={loginData.contactType}
										contact={loginData.contact}
										onVerified={actions.handleOTPSubmit}
										onResend={() => actions.handleResendOtpLogin(loginData.contact)}
										loading={loading}
									/>
									{/* OTP Fallback/Help */}
									<View style={styles.otpFallbackContainer}>
										<Text style={styles.otpFallbackText}>
											Didn't receive the code?
										</Text>
										<Pressable
											onPress={() => actions.handleResendOtpLogin(loginData.contact)}
											style={styles.resendButton}
										>
											<Text style={styles.resendText}>
												Resend Code
											</Text>
										</Pressable>
									</View>
								</View>
							)}

							{currentStep === LOGIN_STEPS.PASSWORD_INPUT && (
								<View>
									<PasswordInputField
										onSubmit={actions.handlePasswordSubmit}
										loading={loading}
									/>
									
									<View style={styles.passwordOptionsRow}>
										<Pressable 
											onPress={() => actions.handleForgotPasswordInitiated(loginData.email)}
											style={styles.forgotPasswordButton}
										>
											<Text style={styles.forgotPasswordText}>
												Forgot Password?
											</Text>
										</Pressable>

										{/* Option to switch to OTP login if available */}
										<Pressable 
											onPress={actions.handleSwitchToOtpLogin}
											style={styles.switchAuthButton}
										>
											<Text style={styles.switchAuthText}>
												Use OTP instead
											</Text>
										</Pressable>
									</View>
								</View>
							)}

							{currentStep === LOGIN_STEPS.SET_PASSWORD && (
								<SetPasswordCard
									onSubmit={actions.handleSetPassword}
									loading={loading}
								/>
							)}

							{currentStep === LOGIN_STEPS.FORGOT_PASSWORD && (
								<ForgotPasswordCard
									onInitiated={actions.handleForgotPasswordInitiated}
								/>
							)}

							{currentStep === LOGIN_STEPS.RESET_PASSWORD && (
								<ResetPasswordCard
									email={resetEmail}
									token={resetToken}
									onSubmit={actions.handlePasswordReset}
								/>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</Animated.View>
			</View>
		</Modal>
	);
}
