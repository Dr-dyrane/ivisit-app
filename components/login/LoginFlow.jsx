import React, { useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import * as Haptics from "expo-haptics";
import LoginModal from "./LoginModal";
import PhoneInputField from "../register/PhoneInputField";
import EmailInputField from "../register/EmailInputField";
import PasswordInputField from "../register/PasswordInputField";
import OTPInputCard from "../register/OTPInputCard";
import SignUpMethodCard from "../register/SignUpMethodCard";
import { REGISTRATION_STEPS } from "../../constants/registrationSteps";
import { useLogin } from "../../contexts/LoginContext";
import { COLORS } from "../../constants/colors";
import SlideButton from "../ui/SlideButton";

const generateToken = () => {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(2);
};

export default function LoginFlow({ visible, onClose }) {
  const {
    currentStep,
    method,
    contact,
    loading,
    reset,
    goBack,
    selectMethod,
    socialSignIn,
    submitPhone,
    submitEmail,
    submitPassword,
    verifyOTP,
    resendOTP,
  } = useLogin();

  const step = currentStep;

  const handleBack = () => {
    if (step === REGISTRATION_STEPS.METHOD_SELECTION) return onClose?.();
    goBack();
  };

  const handleMethodSelect = (m) => selectMethod(m);

  const handleGoogleSignIn = async () => {
    const ok = await socialSignIn("Google", { name: "Google User", email: "google.user@example.com" });
    if (ok) onClose && onClose();
  };

  const handleAppleSignIn = async () => {
    const ok = await socialSignIn("Apple", { name: "Apple User", email: "apple.user@example.com" });
    if (ok) onClose && onClose();
  };

  const handlePhoneSubmit = async (e164) => {
    await submitPhone(e164);
  };

  const handleEmailSubmit = async (email) => {
    await submitEmail(email);
  };

  const handlePasswordSubmit = async (password) => {
    const ok = await submitPassword(password);
    if (ok) onClose && onClose();
  };

  const handleOTPVerified = async (otp) => {
    const ok = await verifyOTP(otp);
    if (ok) onClose && onClose();
  };

  const titleForStep = () => {
    if (step === REGISTRATION_STEPS.METHOD_SELECTION) return "Login";
    if (step === REGISTRATION_STEPS.PHONE_INPUT) return "Phone Login";
    if (step === REGISTRATION_STEPS.EMAIL_INPUT) return method === "password" ? "Email for Password" : "Email Login";
    if (step === REGISTRATION_STEPS.OTP_VERIFICATION) return "Verification";
    if (step === REGISTRATION_STEPS.PASSWORD_SETUP) return "Enter Password";
    return "Login";
  };

  const getStepNumber = () => {
    if (step === REGISTRATION_STEPS.PHONE_INPUT || step === REGISTRATION_STEPS.EMAIL_INPUT) return 1;
    if (step === REGISTRATION_STEPS.OTP_VERIFICATION) return 2;
    if (step === REGISTRATION_STEPS.PASSWORD_SETUP) return 2;
    return null;
  };

  const totalSteps = method === "password" ? 2 : 3;
  const stepText = getStepNumber() ? `Step ${getStepNumber()} of ${totalSteps}` : null;

  const keyboardOffsetExtra = (() => {
    switch (step) {
      case REGISTRATION_STEPS.METHOD_SELECTION:
        return 20;
      case REGISTRATION_STEPS.SOCIAL_SELECTION:
        return 40;
      case REGISTRATION_STEPS.PHONE_INPUT:
      case REGISTRATION_STEPS.EMAIL_INPUT:
        return 90;
      case REGISTRATION_STEPS.OTP_VERIFICATION:
        return 140;
      case REGISTRATION_STEPS.PASSWORD_SETUP:
        return 90;
      default:
        return 90;
    }
  })();

  /* Small shared SocialIcon used in signup/login screens */
  const { isDarkMode } = useTheme();
  const { width } = Dimensions.get("window");
  const SocialIcon = ({ name }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.94, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      if (name === "logo-apple") handleAppleSignIn();
      if (name === "logo-google") handleGoogleSignIn();
      if (name === "logo-x") socialSignInCommon("X", { name: "X User", email: "x.user@example.com" });
    };

    return (
      <Pressable onPress={handlePress}>
        <Animated.View
          style={{
            backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
            width: width * 0.28,
            height: 64,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            transform: [{ scale }],
          }}
        >
          <Ionicons name={name} size={24} color={isDarkMode ? COLORS.bgLight : COLORS.textPrimary} />
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <LoginModal
      visible={visible}
      onClose={() => {
        reset();
        onClose && onClose();
      }}
      onBack={handleBack}
      showBack={step !== REGISTRATION_STEPS.METHOD_SELECTION}
      title={titleForStep()}
      stepText={stepText}
      keyboardOffsetExtra={keyboardOffsetExtra}
    >
      <View>
        {step === REGISTRATION_STEPS.METHOD_SELECTION && (
          <View className="mb-6">
            <SignUpMethodCard onSelect={handleMethodSelect} />

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-gray-500/10" />
              <Text className="px-4 text-[10px] font-black tracking-[3px] text-gray-400">CONNECT QUICKLY</Text>
              <View className="flex-1 h-[1px] bg-gray-500/10" />
            </View>

            <View className="flex-row justify-between">
              <SocialIcon name="logo-apple" />
              <SocialIcon name="logo-google" />
              <SocialIcon name="logo-x" />
            </View>
          </View>
        )}

        {step === REGISTRATION_STEPS.SOCIAL_SELECTION && (
          <View className="space-y-3">
            <SlideButton onPress={handleGoogleSignIn}>Continue with Google</SlideButton>
            <SlideButton onPress={handleAppleSignIn}>Continue with Apple</SlideButton>
            <Pressable onPress={() => reset()} className="mt-2 items-center">
              <Text style={{ color: COLORS.brandPrimary }}>Back to methods</Text>
            </Pressable>
          </View>
        )}

        {step === REGISTRATION_STEPS.PHONE_INPUT && (
          <PhoneInputField initialValue={contact || null} onSubmit={handlePhoneSubmit} />
        )}

        {step === REGISTRATION_STEPS.EMAIL_INPUT && (
          <EmailInputField initialValue={contact || ""} onSubmit={handleEmailSubmit} />
        )}

        {step === REGISTRATION_STEPS.OTP_VERIFICATION && (
          <OTPInputCard
            method={method}
            contact={contact}
            onVerified={handleOTPVerified}
            onResend={() => {
              resendOTP();
            }}
            onEdit={() => {
              goBack();
            }}
          />
        )}

        {step === REGISTRATION_STEPS.PASSWORD_SETUP && (
          <PasswordInputField initialValue={""} onSubmit={handlePasswordSubmit} />
        )}

        {loading && <ActivityIndicator size="small" color={COLORS.brandPrimary} className="mt-4" />}
      </View>
    </LoginModal>
  );
}
