"use client"

// components/register/AuthInputContent.jsx
import { useState, useRef } from "react"
import { View, Text, TextInput, Pressable, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../contexts/ThemeContext"
import PhoneInput from "./PhoneInput"
import * as Haptics from "expo-haptics"

export default function AuthInputContent({ type, inputValue, setInputValue, buttonScale, onSubmit, loading }) {
  const { isDarkMode } = useTheme()
  const [emailError, setEmailError] = useState("")
  const shakeAnim = useRef(new Animated.Value(0)).current

  const colors = {
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    primary: "#86100E",
  }

  const validateEmail = (email) => {
    if (!email) return { valid: false, error: "" }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (email.length < 3) {
      return { valid: false, error: "" }
    }

    if (!emailRegex.test(email)) {
      return { valid: false, error: "Please enter a valid email address" }
    }

    return { valid: true, error: "" }
  }

  const handleEmailChange = (text) => {
    setInputValue(text)
    const { error } = validateEmail(text)
    setEmailError(error)
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

  const handleEmailSubmit = () => {
    const { valid, error } = validateEmail(inputValue)

    if (!valid) {
      setEmailError(error || "Please enter a valid email address")
      triggerShake()
      return
    }

    // Medium haptic for primary action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit()
  }

  // Render phone input
  if (type === "phone") {
    return <PhoneInput value={inputValue} onChange={setInputValue} onSubmit={onSubmit} loading={loading} />
  }

  // Render email input
  const { valid: isEmailValid } = validateEmail(inputValue)

  return (
    <View>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={{ backgroundColor: colors.inputBg }} className="flex-row items-center rounded-2xl px-5 h-[72px]">
          <Ionicons name="mail-outline" size={22} color={colors.primary} />
          <TextInput
            autoFocus
            selectionColor={colors.primary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@ivisit.com"
            placeholderTextColor="#666"
            value={inputValue}
            onChangeText={handleEmailChange}
            onSubmitEditing={handleEmailSubmit}
            returnKeyType="done"
            className="flex-1 text-xl font-bold ml-4"
            style={{ color: colors.text }}
          />
          {inputValue.length > 0 && (
            <Ionicons
              name={isEmailValid ? "checkmark-circle" : "close-circle"}
              size={24}
              color={isEmailValid ? "#10B981" : "#EF4444"}
            />
          )}
        </View>
      </Animated.View>

      {/* Error Message */}
      {emailError && inputValue.length > 0 && (
        <Text className="mt-3 text-xs text-center" style={{ color: "#EF4444" }}>
          {emailError}
        </Text>
      )}

      {/* Continue Button */}
      <Pressable
        onPress={handleEmailSubmit}
        disabled={!isEmailValid || loading}
        className="mt-6 h-16 rounded-2xl items-center justify-center"
        style={{
          backgroundColor: isEmailValid ? colors.primary : isDarkMode ? "#1F2937" : "#E5E7EB",
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text className="text-white text-base font-black tracking-[2px]" style={{ opacity: isEmailValid ? 1 : 0.5 }}>
          CONTINUE
        </Text>
      </Pressable>
    </View>
  )
}
