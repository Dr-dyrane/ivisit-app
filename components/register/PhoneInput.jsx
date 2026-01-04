"use client"

// components/register/PhoneInput.jsx
import { useEffect, useState, useRef } from "react"
import { View, Text, TextInput, Pressable, Animated, ActivityIndicator } from "react-native"
import * as Location from "expo-location"
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../contexts/ThemeContext"
import countries from "./countries"
import CountryPickerModal from "./CountryPickerModal"
import * as Haptics from "expo-haptics"

const PRIMARY_RED = "#86100E"

export default function PhoneInput({ value, onChange, onSubmit, loading }) {
  const { isDarkMode } = useTheme()
  const [pickerVisible, setPickerVisible] = useState(false)
  const [selected, setSelected] = useState(null)
  const [digits, setDigits] = useState("")
  const [formatted, setFormatted] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({})
          const geo = await Location.reverseGeocodeAsync(loc.coords)

          if (geo[0]?.isoCountryCode) {
            const found = countries.find((c) => c.code === geo[0].isoCountryCode)
            if (found) {
              setSelected(found)
              setLocationLoading(false)
              return
            }
          }
        }
      } catch (error) {
        console.log("[v0] Location error:", error)
      }

      // Fallback to US if location fails
      const fallback = countries.find((c) => c.code === "US") || countries[0]
      setSelected(fallback)
      setLocationLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selected || !digits) {
      setFormatted("")
      setIsValid(false)
      onChange(null)
      return
    }

    try {
      const asYouType = new AsYouType(selected.code)
      const formattedNum = asYouType.input(digits)
      setFormatted(formattedNum)

      const phoneNumber = parsePhoneNumberFromString(digits, selected.code)

      if (phoneNumber && phoneNumber.isValid()) {
        setIsValid(true)
        onChange(phoneNumber.format("E.164"))
        // Success haptic
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } else {
        setIsValid(false)
        onChange(null)
      }
    } catch (error) {
      console.log("[v0] Phone validation error:", error)
      setFormatted(digits)
      setIsValid(false)
      onChange(null)
    }
  }, [digits, selected])

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

    // Medium haptic for primary action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit()
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

  if (locationLoading || !selected) {
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
            <Text className="text-2xl mr-2">{selected.flagEmoji}</Text>
            <Text className="text-lg font-black" style={{ color: colors.text }}>
              {selected.dial_code}
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
            value={formatted}
            onChangeText={(t) => setDigits(t.replace(/\D/g, ""))}
            maxLength={20}
            selectionColor={PRIMARY_RED}
          />

          {/* Validation Indicator */}
          {digits.length > 0 && (
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
        onSelect={(country) => {
          setSelected(country)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }}
      />

      {/* Continue Button */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          onPress={handleContinue}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={loading || !isValid}
          className="mt-6 h-16 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: isValid ? PRIMARY_RED : isDarkMode ? "#1F2937" : "#E5E7EB",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-black tracking-[2px]">CONTINUE</Text>
          )}
        </Pressable>
      </Animated.View>

      {/* Helper Text */}
      {digits.length > 0 && !isValid && (
        <Text className="mt-3 text-xs text-center" style={{ color: "#EF4444" }}>
          Please enter a valid phone number for {selected.name}
        </Text>
      )}
    </View>
  )
}
