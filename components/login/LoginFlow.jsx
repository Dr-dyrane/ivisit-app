import React, { useState, useRef } from "react";
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
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../../constants/colors";
import SlideButton from "../ui/SlideButton";

const generateToken = () => {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(2);
};

export default function LoginFlow({ visible, onClose }) {
  const [step, setStep] = useState(REGISTRATION_STEPS.METHOD_SELECTION);
  const [method, setMethod] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { login } = useAuth();

  const reset = () => {
    setStep(REGISTRATION_STEPS.METHOD_SELECTION);
    setMethod(null);
    setContact(null);
    setLoading(false);
  };

  const handleBack = () => {
    if (step === REGISTRATION_STEPS.METHOD_SELECTION) return onClose?.();
    if (step === REGISTRATION_STEPS.PHONE_INPUT || step === REGISTRATION_STEPS.EMAIL_INPUT) {
      setStep(REGISTRATION_STEPS.METHOD_SELECTION);
      setMethod(null);
      setContact(null);
      return;
    }
    if (step === REGISTRATION_STEPS.OTP_VERIFICATION) {
      // go back to input
      setStep(method === "phone" ? REGISTRATION_STEPS.PHONE_INPUT : REGISTRATION_STEPS.EMAIL_INPUT);
      return;
    }
    if (step === REGISTRATION_STEPS.PASSWORD_SETUP) {
      setStep(REGISTRATION_STEPS.EMAIL_INPUT);
      return;
    }
    setStep(REGISTRATION_STEPS.METHOD_SELECTION);
  };

  const handleMethodSelect = (m) => {
    setMethod(m);
    if (m === "phone") setStep(REGISTRATION_STEPS.PHONE_INPUT);
    else if (m === "email") setStep(REGISTRATION_STEPS.EMAIL_INPUT);
    else if (m === "password") setStep(REGISTRATION_STEPS.EMAIL_INPUT);
    else if (m === "social") {
      setStep(REGISTRATION_STEPS.SOCIAL_SELECTION);
      setMethod("social");
    }
  };

  const socialSignInCommon = async (provider, profile) => {
    setLoading(true);
    try {
      // simulate provider auth and user lookup/creation
      await new Promise((r) => setTimeout(r, 900));
      const usersData = await AsyncStorage.getItem("users");
      const users = usersData ? JSON.parse(usersData) : [];
      // try find by email
      let user = users.find((u) => u.email && profile.email && u.email.toLowerCase() === profile.email.toLowerCase());
      if (!user) {
        user = {
          id: `social_${provider}_${Date.now()}`,
          fullName: profile.name || `${provider} user`,
          email: profile.email || `${provider}_user_${Date.now()}@example.com`,
        };
        users.push(user);
      }
      const token = generateToken();
      const loggedUser = { ...user, token };
      const updated = users.map((u) =>
        u.email && loggedUser.email && u.email.toLowerCase() === loggedUser.email.toLowerCase() ? loggedUser : u
      );
      await AsyncStorage.setItem("users", JSON.stringify(updated));
      await AsyncStorage.setItem("token", token);
      await login(loggedUser);
      showToast(`Signed in with ${provider}`, "success");
      reset();
      onClose && onClose();
    } catch (err) {
      showToast(`Social sign-in failed: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    socialSignInCommon("Google", { name: "Google User", email: "google.user@example.com" });
  };

  const handleAppleSignIn = () => {
    socialSignInCommon("Apple", { name: "Apple User", email: "apple.user@example.com" });
  };

  const handlePhoneSubmit = async (e164) => {
    setLoading(true);
    try {
      // simulate sending OTP
      await new Promise((r) => setTimeout(r, 800));
      setContact(e164);
      setStep(REGISTRATION_STEPS.OTP_VERIFICATION);
      showToast("OTP sent", "success");
    } catch (err) {
      showToast("Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (email) => {
    setLoading(true);
    try {
      if (method === "password") {
        // email-first for password login
        setContact(email);
        setStep(REGISTRATION_STEPS.PASSWORD_SETUP);
      } else {
        // OTP via email
        await new Promise((r) => setTimeout(r, 800));
        setContact(email);
        setStep(REGISTRATION_STEPS.OTP_VERIFICATION);
        showToast("OTP sent to email", "success");
      }
    } catch (err) {
      showToast("Failed to continue", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (password) => {
    setLoading(true);
    try {
      // Attempt login with email + password via stored users
      const usersData = await AsyncStorage.getItem("users");
      const users = usersData ? JSON.parse(usersData) : [];
      const user = users.find((u) => u.email && u.email.toLowerCase() === contact.toLowerCase());
      if (!user) throw new Error("User not found");
      if (user.password !== password) throw new Error("Invalid credentials");
      // generate token and persist
      const token = generateToken();
      const loggedUser = { ...user, token };
      await AsyncStorage.setItem("token", token);
      // update users list with token
      const updated = users.map((u) => (u.email === user.email ? loggedUser : u));
      await AsyncStorage.setItem("users", JSON.stringify(updated));
      await login(loggedUser);
      showToast("Logged in", "success");
      reset();
      onClose && onClose();
    } catch (err) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = async (otp) => {
    setLoading(true);
    try {
      // For demo: find user by contact (phone or email) and log them in
      const usersData = await AsyncStorage.getItem("users");
      const users = usersData ? JSON.parse(usersData) : [];
      const user = users.find((u) => (method === "phone" ? u.phone === contact : u.email && u.email.toLowerCase() === contact.toLowerCase()));
      if (!user) throw new Error("User not found");
      const token = generateToken();
      const loggedUser = { ...user, token };
      const updated = users.map((u) => (u.email === user.email ? loggedUser : u));
      await AsyncStorage.setItem("users", JSON.stringify(updated));
      await AsyncStorage.setItem("token", token);
      await login(loggedUser);
      showToast("Logged in via OTP", "success");
      reset();
      onClose && onClose();
    } catch (err) {
      showToast(err.message || "OTP login failed", "error");
    } finally {
      setLoading(false);
    }
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
            <Pressable onPress={() => setStep(REGISTRATION_STEPS.METHOD_SELECTION)} className="mt-2 items-center">
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
              showToast("OTP resent", "info");
            }}
            onEdit={() => {
              setStep(method === "phone" ? REGISTRATION_STEPS.PHONE_INPUT : REGISTRATION_STEPS.EMAIL_INPUT);
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
