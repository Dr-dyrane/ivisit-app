// components/login/SetPasswordCard.jsx

"use client"

import { useRef, useState } from "react"
import { View, Text, TextInput, Pressable, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useTheme } from "../../contexts/ThemeContext"
import { COLORS } from "../../constants/colors"

/**
 * SetPasswordCard
 * For users who don't have a password yet (signed up without one)
 * Allows them to set a password during login
 */
export default function SetPasswordCard({ onPasswordSet, loading }) {
  const { isDarkMode } = useTheme()

  const passwordInputRef = useRef(null)
  const confirmInputRef = useRef(null)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const shakeAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const isValid = password.length >= 6 && password === confirmPassword
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

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
    if (!isValid) {
      triggerShake()
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPasswordSet?.(password)
  }

  const colors = {
    inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
    text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
  }

  return (
    <View>
      <Text className="text-sm font-medium mb-6" style={{ color: COLORS.textMuted }}>
        You don't have a password yet. Set one now to secure your account.
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        {/* Password Input */}
        <View
          className="flex-row items-center rounded-2xl px-5 h-[72px] mb-4"
          style={{ backgroundColor: colors.inputBg }}
        >
          <Ionicons name="lock-closed-outline" size={24} color={COLORS.textMuted} style={{ marginRight: 12 }} />

          <TextInput
            ref={passwordInputRef}
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
            placeholder="Create password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            value={password}
            onChangeText={setPassword}
            selectionColor={COLORS.brandPrimary}
            returnKeyType="next"
            onSubmitEditing={() => confirmInputRef.current?.focus()}
          />

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setShowPassword(!showPassword)
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.textMuted} />
          </Pressable>
        </View>

        {/* Confirm Password Input */}
        <View
          className="flex-row items-center rounded-2xl px-5 h-[72px] mb-6"
          style={{ backgroundColor: colors.inputBg }}
        >
          <Ionicons name="lock-closed-outline" size={24} color={COLORS.textMuted} style={{ marginRight: 12 }} />

          <TextInput
            ref={confirmInputRef}
            className="flex-1 text-xl font-bold"
            style={{ color: colors.text }}
            placeholder="Confirm password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            selectionColor={COLORS.brandPrimary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setShowConfirm(!showConfirm)
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          onPress={handleSubmit}
          onPressIn={() => {
            Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()
          }}
          onPressOut={() => {
            Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()
          }}
          disabled={!isValid || loading}
          className="h-16 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: isValid && !loading ? COLORS.brandPrimary : isDarkMode ? COLORS.bgDarkAlt : "#E5E7EB",
          }}
        >
          {loading ? (
            <Text
              className="text-base font-black tracking-[2px]"
              style={{ color: isValid ? COLORS.bgLight : COLORS.textMuted }}
            >
              SETTING PASSWORD...
            </Text>
          ) : (
            <Text
              className="text-base font-black tracking-[2px]"
              style={{ color: isValid ? COLORS.bgLight : COLORS.textMuted }}
            >
              SET PASSWORD
            </Text>
          )}
        </Pressable>
      </Animated.View>

      {password.length > 0 && password.length < 6 && (
        <Text className="mt-3 text-xs text-center" style={{ color: COLORS.error }}>
          Password must be at least 6 characters
        </Text>
      )}

      {confirmPassword.length > 0 && !passwordsMatch && (
        <Text className="mt-3 text-xs text-center" style={{ color: COLORS.error }}>
          Passwords don't match
        </Text>
      )}

      {passwordsMatch && (
        <Text className="mt-3 text-xs text-center" style={{ color: COLORS.success }}>
          Passwords match!
        </Text>
      )}
    </View>
  )
}
