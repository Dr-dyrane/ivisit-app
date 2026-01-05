"use client"

import { useRef, useState } from "react"
import { View, Text, TextInput, Pressable, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"
import { COLORS } from "../../constants/colors"

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
    inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
    text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
  }

  return (
    <View>
      <View className="flex-row items-center rounded-2xl px-5 h-[72px]" style={{ backgroundColor: colors.inputBg }}>
        <Ionicons name="key-outline" size={24} color={COLORS.textMuted} style={{ marginRight: 12 }} />

        <TextInput
          ref={inputRef}
          className="flex-1 text-xl font-bold"
          style={{ color: colors.text }}
          placeholder="Create a password"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          value={password}
          onChangeText={handleChange}
          selectionColor={COLORS.brandPrimary}
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
          style={{ backgroundColor: COLORS.brandPrimary }}
        >
          <Text className="text-base font-black tracking-[2px]" style={{ color: COLORS.bgLight }}>
            SET PASSWORD
          </Text>
        </Pressable>
      </View>

      <Text className="mt-3 text-xs text-center" style={{ color: COLORS.textMuted }}>
        Password must be at least 6 characters. You can change it later in settings.
      </Text>
    </View>
  )
}
