"use client"

// components/register/AuthInputModal.jsx
import { useEffect, useRef, useState } from "react"
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
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../contexts/ThemeContext"
import PhoneInputField from "./PhoneInputField"
import EmailInputField from "./EmailInputField"
import OTPInputCard from "./OTPInputCard"
import ProfileForm from "./ProfileForm"
import * as Haptics from "expo-haptics"

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

export default function AuthInputModal({ visible, type, onClose }) {
  const { isDarkMode } = useTheme()
  const [validatedValue, setValidatedValue] = useState(null)
  const [step, setStep] = useState("input")
  const [loading, setLoading] = useState(false)

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const bgOpacity = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(0.8)).current

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
      ]).start()
    } else {
      setStep("input")
      setValidatedValue(null)
      setLoading(false)
    }
  }, [visible])

  const handleDismiss = () => {
    Keyboard.dismiss()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

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
      onClose()
    })
  }

  const handleInputSubmit = async (value) => {
    if (!value) return

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setValidatedValue(value)
      setLoading(false)
      setStep("otp")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error("[v0] OTP send error:", error)
      setLoading(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const handleOTPSubmit = async (otp) => {
    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setLoading(false)
      setStep("profile")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error("[v0] OTP verify error:", error)
      setLoading(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const handleProfileSubmit = async (profileData) => {
    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setLoading(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      handleDismiss()
    } catch (error) {
      console.error("[v0] Profile submit error:", error)
      setLoading(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const colors = {
    bg: isDarkMode ? "#0D1117" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View className="flex-1 justify-end">
        <Animated.View style={{ opacity: bgOpacity }} className="absolute inset-0 bg-black/60">
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

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
            <View className="flex-row justify-between items-start mb-8">
              <View className="flex-1">
                <Text className="text-[10px] font-black tracking-[3px] mb-2 uppercase text-red-800">
                  Step {step === "input" ? "1" : step === "otp" ? "2" : "3"} of 3
                </Text>
                <Text className="text-3xl font-black tracking-tighter" style={{ color: colors.text }}>
                  {step === "input" && (type === "phone" ? "Phone Number" : "Email Address")}
                  {step === "otp" && "Verification"}
                  {step === "profile" && "Profile Setup"}
                </Text>
                {step === "input" && (
                  <Text className="text-sm font-medium mt-2 text-gray-500">
                    {type === "phone" ? "Enter your phone number to continue" : "Enter your email address to continue"}
                  </Text>
                )}
              </View>

              <Pressable onPress={handleDismiss} className="p-2 bg-gray-500/10 rounded-full">
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View className="flex-1">
              {step === "input" && (
                <>
                  {type === "phone" ? (
                    <PhoneInputField onValidChange={setValidatedValue} onSubmit={handleInputSubmit} />
                  ) : (
                    <EmailInputField onValidChange={setValidatedValue} onSubmit={handleInputSubmit} />
                  )}
                </>
              )}

              {step === "otp" && (
                <OTPInputCard contactInfo={validatedValue} onSubmit={handleOTPSubmit} loading={loading} />
              )}

              {step === "profile" && <ProfileForm onSubmit={handleProfileSubmit} loading={loading} />}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  )
}
