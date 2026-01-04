"use client"

import { useState, useRef, useEffect } from "react"
import { View, Text, TextInput, Pressable, Animated } from "react-native"
import { useTheme } from "../../contexts/ThemeContext"
import * as Haptics from "expo-haptics"

const PRIMARY_RED = "#86100E"

/**
 * OTPInputCard
 *
 * Modular OTP input with auto-focus and validation
 * Handles 6-digit OTP with split input boxes
 *
 * Props:
 * - contactInfo: phone/email that OTP was sent to
 * - onSubmit: callback when OTP is complete
 * - loading: shows loading state
 */
export default function OTPInputCard({ contactInfo, onSubmit, loading }) {
  const { isDarkMode } = useTheme()
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputRefs = useRef([])

  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const colors = {
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  }

  useEffect(() => {
    // Auto-focus first input
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    // Auto-submit when all digits entered
    if (otp.every((digit) => digit !== "")) {
      handleSubmit()
    }
  }, [otp])

  const handleChange = (text, index) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, "")

    if (digit.length > 1) {
      // Handle paste
      const digits = digit.split("").slice(0, 6)
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d
        }
      })
      setOtp(newOtp)

      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
      setFocusedIndex(nextIndex)
      Haptics.selectionAsync()
      return
    }

    const newOtp = [...otp]
    newOtp[index] = digit

    setOtp(newOtp)

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
      setFocusedIndex(index + 1)
      Haptics.selectionAsync()
    }
  }

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setFocusedIndex(index - 1)
      Haptics.selectionAsync()
    }
  }

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  const handleSubmit = () => {
    const otpValue = otp.join("")

    if (otpValue.length !== 6) {
      triggerShake()
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit?.(otpValue)
  }

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()
  }

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()
  }

  const isComplete = otp.every((digit) => digit !== "")

  return (
    <View>
      {/* Info Text */}
      <Text className="text-sm font-medium text-gray-500 mb-6 text-center">
        We sent a 6-digit code to{"\n"}
        <Text className="font-black" style={{ color: colors.text }}>
          {contactInfo}
        </Text>
      </Text>

      {/* OTP Input Boxes */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }} className="flex-row justify-between mb-8">
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            maxLength={1}
            keyboardType="number-pad"
            selectionColor={PRIMARY_RED}
            className="text-2xl font-black text-center rounded-2xl"
            style={{
              width: 48,
              height: 64,
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderWidth: 2,
              borderColor: focusedIndex === index ? PRIMARY_RED : colors.border,
            }}
          />
        ))}
      </Animated.View>

      {/* Verify Button */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isComplete || loading}
          className="h-16 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: isComplete ? PRIMARY_RED : isDarkMode ? "#1F2937" : "#E5E7EB",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text className="text-white text-base font-black tracking-[2px]">
            {loading ? "VERIFYING..." : "VERIFY CODE"}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Resend Link */}
      <Pressable className="mt-6" disabled={loading}>
        <Text className="text-center text-sm font-medium" style={{ color: PRIMARY_RED }}>
          Didn't receive a code? Resend
        </Text>
      </Pressable>
    </View>
  )
}
