"use client"

import { useRef, useState, useEffect } from "react"
import { View, Text, TextInput, Pressable, Animated, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"
import { COLORS } from "../../constants/colors"
import usePhoneValidation from "../../hooks/usePhoneValidation"
import useCountryDetection from "../../hooks/useCountryDetection"
import CountryPickerModal from "./CountryPickerModal"

/**
 * PhoneInputField - iVisit Registration
 *
 * Modular phone input component for emergency medical services
 * Features full deletion support and clear functionality
 */
export default function PhoneInputField({ onValidChange, onSubmit, initialValue = null }) {
  const { isDarkMode } = useTheme()
  const [pickerVisible, setPickerVisible] = useState(false)
  const inputRef = useRef(null)

  const { country, setCountry, loading: countryLoading } = useCountryDetection()
  const { rawInput, setRawInput, formattedNumber, isValid, e164Format, clear } = usePhoneValidation(country)

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const handleInputChange = (text) => {
    const digitsOnly = text.replace(/\D/g, "")
    console.log("[v0] Raw input digits:", digitsOnly)
    setRawInput(digitsOnly)

    // Notify parent of validation state
    if (onValidChange) {
      const isCurrentlyValid = digitsOnly.length >= (country?.min || 10)
      onValidChange(isCurrentlyValid ? e164Format : null)
    }
  }

  // Prefill if initialValue (E.164) is provided
  useEffect(() => {
    if (initialValue) {
      console.log("[v0] Prefilling phone input with:", initialValue)
      setRawInput(initialValue)
      if (onValidChange) {
        onValidChange(initialValue)
      }
    }
  }, [initialValue])

  const handleClearInput = () => {
    console.log("[v0] Clearing phone input")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    clear()
    if (onValidChange) {
      onValidChange(null)
    }
    inputRef.current?.focus()
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
    console.log("[v0] Continue pressed - Valid:", isValid, "E164:", e164Format)

    if (!isValid || !e164Format) {
      triggerShake()
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Call onSubmit with the E.164 formatted number
    if (onSubmit) {
      console.log("[v0] Calling onSubmit with:", e164Format)
      onSubmit(e164Format)
    }
  }

  const colors = {
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    border: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  }

  if (countryLoading || !country) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator color={COLORS.brandPrimary} />
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
            <Text className="text-2xl mr-2">{country.flag}</Text>
            <Text className="text-lg font-black" style={{ color: colors.text }}>
              {country.dial_code}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 4 }} />
          </Pressable>

          {/* Phone Input */}
          <TextInput
            ref={inputRef}
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
            placeholder="000 000 0000"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            autoFocus
            value={formattedNumber}
            onChangeText={handleInputChange}
            maxLength={25}
            selectionColor={COLORS.brandPrimary}
          />

          {rawInput.length > 0 && (
            <Pressable onPress={handleClearInput} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons
                name={isValid ? "checkmark-circle" : "close-circle"}
                size={24}
                color={isValid ? COLORS.success : COLORS.error}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Country Picker Modal */}
      <CountryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selectedCountry) => {
          console.log("[v0] Country changed to:", selectedCountry.name)
          setCountry(selectedCountry)
          clear() // Clear input when country changes
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
      />

      {/* Continue Button */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }} className="mt-6">
        <Pressable
          onPress={handleContinue}
          onPressIn={() => {
            Animated.spring(buttonScale, {
              toValue: 0.96,
              useNativeDriver: true,
            }).start()
          }}
          onPressOut={() => {
            Animated.spring(buttonScale, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }).start()
          }}
          disabled={!isValid}
          className="h-16 rounded-2xl items-center justify-center"
          style={{
                backgroundColor: isValid ? COLORS.brandPrimary : (isDarkMode ? COLORS.bgDarkAlt : "#E5E7EB"),
          }}
        >
              <Text className="text-base font-black tracking-[2px]" style={{ color: isValid ? "#FFFFFF" : COLORS.textMuted }}>
            CONTINUE
          </Text>
        </Pressable>
      </Animated.View>

      {/* Helper Text */}
      {rawInput.length > 0 && !isValid && (
        <Text className="mt-3 text-xs text-center" style={{ color: COLORS.error }}>
          Please enter a valid {country.name} phone number
        </Text>
      )}

      <Text className="mt-4 text-xs text-center leading-5" style={{ color: COLORS.textMuted }}>
        Your phone number helps us provide fast emergency response and connect you with medical professionals 24/7.
      </Text>
    </View>
  )
}
