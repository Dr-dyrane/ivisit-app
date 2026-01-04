"use client"

import { useRef, useState } from "react"
import { View, Text, TextInput, Pressable, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"

const PRIMARY_RED = "#86100E"

export default function PasswordInputField({ initialValue = "", onSubmit }) {
  const { isDarkMode } = useTheme()
  const inputRef = useRef(null)
  const [password, setPassword] = useState(initialValue)
  const [isPasswordVisible, setPasswordVisible] = useState(false)

  const handleChange = (text) => {
    setPassword(text)
  }

  const handleContinue = () => {
    if (!password || password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSubmit?.(password)
  }

  const colors = {
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
  }

  return (
    <View>
      <View className="flex-row items-center rounded-2xl px-5 h-[72px]" style={{ backgroundColor: colors.inputBg }}>
        <Ionicons name="key-outline" size={24} color="#666" style={{ marginRight: 12 }} />

        <TextInput
          ref={inputRef}
          className="flex-1 text-xl font-bold"
          style={{ color: colors.text }}
          placeholder="Create a password"
          placeholderTextColor="#666"
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          value={password}
          onChangeText={handleChange}
          selectionColor={PRIMARY_RED}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        <Pressable onPress={() => setPasswordVisible((v) => !v)} className="px-2">
          <Ionicons name={isPasswordVisible ? "eye" : "eye-off"} size={20} color={colors.text} />
        </Pressable>
      </View>

      <View className="mt-6">
        <Pressable
          onPress={handleContinue}
          className="h-16 rounded-2xl items-center justify-center"
          style={{ backgroundColor: PRIMARY_RED }}
        >
          <Text className="text-base font-black tracking-[2px]" style={{ color: "#FFFFFF" }}>
            SET PASSWORD
          </Text>
        </Pressable>
      </View>

      <Text className="mt-3 text-xs text-center" style={{ color: "#666" }}>
        Password must be at least 6 characters. You can change it later in settings.
      </Text>
    </View>
  )
}
