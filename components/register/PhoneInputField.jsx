"use client"

import { useRef } from "react"
import { View, Text, TextInput, Pressable, Animated, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"
import usePhoneValidation from "../../hooks/usePhoneValidation"
import useCountryDetection from "../../hooks/useCountryDetection"
import CountryPickerModal from "./CountryPickerModal"
import { useState } from "react"

const PRIMARY_RED = "#86100E"

/**
 * PhoneInputField
 *
 * Modular phone input component
 * Uses custom hooks for validation and country detection
 * Handles its own state and animations
 *
 * Props:
 * - onValidChange: callback when valid phone number changes
 * - onSubmit: callback when continue button pressed with valid number
 */
export default function PhoneInputField({ onValidChange, onSubmit }) {
  const { isDarkMode } = useTheme()
  const [pickerVisible, setPickerVisible] = useState(false)

  const { country, setCountry, loading: countryLoading } = useCountryDetection()
  const { rawInput, setRawInput, formattedNumber, isValid, e164Format, clear } = usePhoneValidation(country)

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const handleInputChange = (text) => {
    const digitsOnly = text.replace(/\D/g, "")
    setRawInput(digitsOnly)

    // Notify parent of validation state
    if (onValidChange) {
      onValidChange(isValid ? e164Format : null)
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
    onSubmit?.(e164Format)
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
    border: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  }

  if (countryLoading || !country) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator color={PRIMARY_RED} />
        <Text className="mt-4 text-sm font-medium" style={{ color: colors.text }}>
          Detecting your region...
        </Text>
      </View>
    )
  }

  return (
    <View>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View className="flex-row items-center rounded-2xl px-5 h-[72px]" style={{ backgroundColor: colors.inputBg }}>
          {/* Country Selector */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync()
              setPickerVisible(true)
            }}
            className="flex-row items-center pr-4 mr-4"
            style={{ borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <Text className="text-2xl mr-2">{country.flagEmoji}</Text>
            <Text className="text-lg font-black" style={{ color: colors.text }}>
              {country.dial_code}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 4 }} />
          </Pressable>

          {/* Phone Input */}
          <TextInput
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
            placeholder="000 000 0000"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            autoFocus
            value={formattedNumber}
            onChangeText={handleInputChange}
            maxLength={20}
            selectionColor={PRIMARY_RED}
          />

          {/* Validation Indicator */}
          {rawInput.length > 0 && (
            <Ionicons
              name={isValid ? "checkmark-circle" : "close-circle"}
              size={24}
              color={isValid ? "#10B981" : "#EF4444"}
            />
          )}
        </View>
      </Animated.View>

      {/* Country Picker Modal */}
      <CountryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selectedCountry) => {
          setCountry(selectedCountry)
          clear() // Clear input when country changes
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
      />

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
      {rawInput.length > 0 && !isValid && (
        <Text className="mt-3 text-xs text-center" style={{ color: "#EF4444" }}>
          Please enter a valid phone number for {country.name}
        </Text>
      )}
    </View>
  )
}
