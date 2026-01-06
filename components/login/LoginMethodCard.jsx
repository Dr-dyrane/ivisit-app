"use client"

/**
 * LoginMethodCard
 * Allows user to select login method (email or phone)
 * Mirrors SignUpMethodCard design
 */

import { View, Text, Pressable, Animated } from "react-native"
import { useRef } from "react"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../../contexts/ThemeContext"
import * as Haptics from "expo-haptics"

export default function LoginMethodCard({ onSelect }) {
  const { isDarkMode } = useTheme()
  const emailScale = useRef(new Animated.Value(1)).current
  const phoneScale = useRef(new Animated.Value(1)).current

  const colors = {
    card: isDarkMode ? "#121826" : "#F3E7E7",
    text: isDarkMode ? "#FFFFFF" : "#1F2937",
    subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
  }

  const handlePress = (type, scale) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    onSelect(type)
  }

  return (
    <View>
      <Pressable onPress={() => handlePress("email", emailScale)}>
        <Animated.View
          style={{
            transform: [{ scale: emailScale }],
            backgroundColor: colors.card,
          }}
          className="rounded-3xl p-8 mb-4 border border-gray-500/10"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-black mb-2" style={{ color: colors.text }}>
                Login with Email
              </Text>
              <Text className="text-sm" style={{ color: colors.subtitle }}>
                Use your email address
              </Text>
            </View>
            <Ionicons name="mail" size={32} color={colors.text} />
          </View>
        </Animated.View>
      </Pressable>

      <Pressable onPress={() => handlePress("phone", phoneScale)}>
        <Animated.View
          style={{
            transform: [{ scale: phoneScale }],
            backgroundColor: colors.card,
          }}
          className="rounded-3xl p-8 border border-gray-500/10"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-black mb-2" style={{ color: colors.text }}>
                Login with Phone
              </Text>
              <Text className="text-sm" style={{ color: colors.subtitle }}>
                Use your phone number
              </Text>
            </View>
            <Ionicons name="call" size={32} color={colors.text} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  )
}
