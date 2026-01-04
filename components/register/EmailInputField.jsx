"use client"

import { useRef } from "react"
import { View, Text, TextInput, Pressable, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"
import useEmailValidation from "../../hooks/useEmailValidation"

const PRIMARY_RED = "#86100E"

/**
 * EmailInputField
 *
 * Modular email input component
 * Uses custom hook for validation
 * Handles its own state and animations
 *
 * Props:
 * - onValidChange: callback when valid email changes
 * - onSubmit: callback when continue button pressed with valid email
 */
export default function EmailInputField({ onValidChange, onSubmit }) {
  const { isDarkMode } = useTheme()
  const { email, setEmail, isValid } = useEmailValidation()

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const handleEmailChange = (text) => {
    setEmail(text)
    if (onValidChange) {
      onValidChange(isValid ? text : null)
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

  const handleContinue = () => {
    if (!isValid) {
      triggerShake()
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit?.(email.trim())
  }

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start()
  }

  const colors = {
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
  }

  return (
    <View>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View className="flex-row items-center rounded-2xl px-5 h-[72px]" style={{ backgroundColor: colors.inputBg }}>
          {/* Email Icon */}
          <Ionicons name="mail-outline" size={24} color="#666" style={{ marginRight: 12 }} />

          {/* Email Input */}
          <TextInput
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
            placeholder="your@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            value={email}
            onChangeText={handleEmailChange}
            selectionColor={PRIMARY_RED}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          {/* Validation Indicator */}
          {email.length > 0 && (
            <Ionicons
              name={isValid ? "checkmark-circle" : "close-circle"}
              size={24}
              color={isValid ? "#10B981" : "#EF4444"}
            />
          )}
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }} className="mt-6">
        <Pressable
          onPress={handleContinue}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isValid}
          className="h-16 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: isValid ? PRIMARY_RED : isDarkMode ? "#1F2937" : "#E5E7EB",
          }}
        >
          <Text className="text-white text-base font-black tracking-[2px]">CONTINUE</Text>
        </Pressable>
      </Animated.View>

      {/* Helper Text */}
      {email.length > 0 && !isValid && (
        <Text className="mt-3 text-xs text-center" style={{ color: "#EF4444" }}>
          Please enter a valid email address
        </Text>
      )}
    </View>
  )
}
