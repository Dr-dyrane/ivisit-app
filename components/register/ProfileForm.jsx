"use client"

import { useState, useRef } from "react"
import { View, Text, TextInput, Pressable, Animated, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"

const PRIMARY_RED = "#86100E"

/**
 * ProfileForm
 *
 * Modular profile setup form
 * Collects username and full name
 *
 * Props:
 * - onSubmit: callback with profile data
 * - loading: shows loading state
 */
export default function ProfileForm({ onSubmit, loading }) {
  const { isDarkMode } = useTheme()
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState(null)
  const [currentField, setCurrentField] = useState("fullName")

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

  const handleSubmit = () => {
    if (!fullName.trim() || !username.trim()) {
      triggerShake()
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit?.({ fullName: fullName.trim(), username: username.trim(), avatar })
  }

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()
  }

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()
  }

  const isValid = fullName.trim() && username.trim()

  return (
    <View>
      {/* Avatar Picker */}
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

      {/* Full Name Input */}
      <Animated.View style={{ transform: [{ translateX: currentField === "fullName" ? shakeAnim : 0 }] }}>
        <View
          className="rounded-2xl px-5 h-[72px] mb-4 flex-row items-center"
          style={{ backgroundColor: colors.inputBg }}
        >
          <Ionicons name="person-outline" size={22} color="#666" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#666"
            value={fullName}
            onChangeText={setFullName}
            onFocus={() => setCurrentField("fullName")}
            autoCapitalize="words"
            selectionColor={PRIMARY_RED}
            returnKeyType="next"
            onSubmitEditing={() => setCurrentField("username")}
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
          />
        </View>
      </Animated.View>

      {/* Username Input */}
      <Animated.View style={{ transform: [{ translateX: currentField === "username" ? shakeAnim : 0 }] }}>
        <View
          className="rounded-2xl px-5 h-[72px] mb-6 flex-row items-center"
          style={{ backgroundColor: colors.inputBg }}
        >
          <Ionicons name="at" size={22} color="#666" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            onFocus={() => setCurrentField("username")}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={PRIMARY_RED}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
          />
        </View>
      </Animated.View>

      {/* Submit Button */}
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
          <Text className="text-white text-base font-black tracking-[2px]">
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
