"use client"

import { useState, useRef } from "react"
import { View, Text, TextInput, Pressable, Animated, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"
import { useRegistration } from "../../contexts/RegistrationContext"

const PRIMARY_RED = "#86100E"

/**
 * ProfileForm - iVisit Registration
 *
 * Final step: collect user profile information
 * Props: onComplete
 */
export default function ProfileForm({ onComplete }) {
  const { isDarkMode } = useTheme()
  const { registrationData, updateRegistrationData, nextStep } = useRegistration()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [avatar, setAvatar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentField, setCurrentField] = useState("firstName")

  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const colors = {
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
  }

  const handlePickImage = async () => {
    Haptics.selectionAsync()

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      setAvatar(result.assets[0].uri)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      triggerShake()
      return
    }

    setLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const signupData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: registrationData.email || null,
        phoneNumber: registrationData.phoneNumber || null,
        avatar,
      }

      // Persist profile to registration context and move to next step (password)
      updateRegistrationData({ profile: signupData, profileComplete: true })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      nextStep()
      onComplete?.(signupData)
    } catch (error) {
      console.error("[v0] Profile save error:", error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()
  }

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()
  }

  const isValid = firstName.trim() && lastName.trim()

  return (
    <View>
      <Text className="text-3xl font-black tracking-tight mb-3" style={{ color: colors.text }}>
        Complete Your Profile
      </Text>

      <Text className="text-base leading-6 mb-8" style={{ color: "#666" }}>
        Help us personalize your iVisit experience
      </Text>

      <Pressable onPress={handlePickImage} className="self-center mb-8">
        <View
          className="w-24 h-24 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.inputBg }}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} className="w-24 h-24 rounded-full" />
          ) : (
            <Ionicons name="camera" size={32} color="#666" />
          )}
        </View>
        <Text className="text-xs font-medium text-center mt-2" style={{ color: PRIMARY_RED }}>
          Add Photo
        </Text>
      </Pressable>

      <Animated.View style={{ transform: [{ translateX: currentField === "firstName" ? shakeAnim : 0 }] }}>
        <View
          className="rounded-2xl px-5 h-[72px] mb-4 flex-row items-center"
          style={{ backgroundColor: colors.inputBg }}
        >
          <Ionicons name="person-outline" size={22} color="#666" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="First Name"
            placeholderTextColor="#666"
            value={firstName}
            onChangeText={setFirstName}
            onFocus={() => setCurrentField("firstName")}
            autoCapitalize="words"
            selectionColor={PRIMARY_RED}
            returnKeyType="next"
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
          />
        </View>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX: currentField === "lastName" ? shakeAnim : 0 }] }}>
        <View
          className="rounded-2xl px-5 h-[72px] mb-6 flex-row items-center"
          style={{ backgroundColor: colors.inputBg }}
        >
          <Ionicons name="person-outline" size={22} color="#666" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#666"
            value={lastName}
            onChangeText={setLastName}
            onFocus={() => setCurrentField("lastName")}
            autoCapitalize="words"
            selectionColor={PRIMARY_RED}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
          />
        </View>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isValid || loading}
          className="h-16 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: isValid ? PRIMARY_RED : isDarkMode ? "#1F2937" : "#E5E7EB",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text className="text-base font-black tracking-[2px]" style={{ color: isValid ? "#FFFFFF" : "#9CA3AF" }}>
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
