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

import { useAuthInputModalLogic } from "../../hooks/auth/useAuthInputModalLogic";
import { COLORS } from "../../constants/colors";
import { styles } from "./AuthInputModal.styles";

import PhoneInputField from "./PhoneInputField";
import EmailInputField from "./EmailInputField";
import OTPInputCard from "./OTPInputCard";
import ProfileForm from "./ProfileForm";
import PasswordInputField from "./PasswordInputField";
import SmartContactInput from "../auth/SmartContactInput";

export default function AuthInputModal({ visible, onClose, type }) {
    const { state, animations, actions } = useAuthInputModalLogic({ visible, onClose, type });
    const {
        currentStep,
        registrationData,
        error,
        loading,
        isInputStep,
        isOTPStep,
        isProfileStep,
        isPasswordStep,
        colors,
        modalHeight,
        keyboardHeight,
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
								{!isInputStep && (
									<Pressable
										onPress={actions.handleGoBack}
										style={styles.backButton}
									>
										<Ionicons name="arrow-back" size={20} color={colors.text} />
									</Pressable>
								)}

								<View style={styles.headerContent}>
									<Text style={styles.stepText}>
										Step {actions.getStepNumber()} of 3
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

							{error && (
								<View style={styles.errorContainer}>
									<View style={styles.errorRow}>
										<Ionicons
											name="alert-circle"
											size={20}
											color={COLORS.error}
											style={styles.errorIcon}
										/>
										<Text style={styles.errorText}>
											{error}
										</Text>
									</View>
								</View>
							)}

							{/* Content */}
							{isInputStep && (
								<SmartContactInput
									onSubmit={actions.handleSmartInputSubmit}
									loading={loading}
									initialValue={registrationData.phone || registrationData.email || ""}
								/>
							)}

							{isOTPStep && (
								<View>
									<OTPInputCard
										method={registrationData.method}
										contact={registrationData.phone || registrationData.email}
										onVerified={actions.handleOTPSubmit}
										onResend={actions.handleResendOtp}
										loading={loading}
									/>
								</View>
							)}

							{isProfileStep && (
								<ProfileForm 
									onSubmit={actions.handleProfileSubmit} 
									loading={loading} 
									initialValues={registrationData}
								/>
							)}

							{isPasswordStep && (
								<PasswordInputField
									onSubmit={actions.handlePasswordSubmit}
									onSkip={actions.handleSkipPassword}
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
