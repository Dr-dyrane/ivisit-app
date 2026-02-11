import React from "react";
import { View, Text, TextInput, Animated, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";

export default function ChangePasswordForm({
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrent,
    setShowCurrent,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
    error,
    setError,
    isValid,
    isSaving,
    shakeAnim,
    buttonScale,
    handleSubmit,
    colors,
}) {
    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            {error ? (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                    <Text style={[styles.errorText, { color: COLORS.error }]}>{error}</Text>
                </View>
            ) : null}

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                {/* Current Password */}
                <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="lock-closed-outline" size={22} color={COLORS.textMuted} />
                    <TextInput
                        value={currentPassword}
                        onChangeText={(t) => {
                            setCurrentPassword(t);
                            if (error) setError(null);
                        }}
                        placeholder="Current password"
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showCurrent}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: colors.text }]}
                        selectionColor={COLORS.brandPrimary}
                        editable={!isSaving}
                    />
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowCurrent((v) => !v);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={showCurrent ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color={COLORS.textMuted}
                        />
                    </Pressable>
                </View>

                {/* New Password */}
                <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="lock-closed-outline" size={22} color={COLORS.textMuted} />
                    <TextInput
                        value={newPassword}
                        onChangeText={(t) => {
                            setNewPassword(t);
                            if (error) setError(null);
                        }}
                        placeholder="New password"
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showNew}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: colors.text }]}
                        selectionColor={COLORS.brandPrimary}
                        editable={!isSaving}
                    />
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowNew((v) => !v);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={showNew ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color={COLORS.textMuted}
                        />
                    </Pressable>
                </View>

                {/* Confirm Password */}
                <View style={[styles.inputRow, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="lock-closed-outline" size={22} color={COLORS.textMuted} />
                    <TextInput
                        value={confirmPassword}
                        onChangeText={(t) => {
                            setConfirmPassword(t);
                            if (error) setError(null);
                        }}
                        placeholder="Confirm new password"
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: colors.text }]}
                        selectionColor={COLORS.brandPrimary}
                        editable={!isSaving}
                    />
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowConfirm((v) => !v);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={showConfirm ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color={COLORS.textMuted}
                        />
                    </Pressable>
                </View>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                    disabled={!isValid || isSaving}
                    onPress={handleSubmit}
                    onPressIn={() => {
                        Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
                    }}
                    onPressOut={() => {
                        Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
                    }}
                    style={[
                        styles.submitButton,
                        {
                            backgroundColor: isValid && !isSaving
                                ? COLORS.brandPrimary
                                : colors.inputBg === "#0B0F1A"
                                    ? COLORS.bgDarkAlt
                                    : "#E5E7EB",
                        }
                    ]}
                >
                    {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                    <Text style={styles.submitButtonText}>
                        Change Password
                    </Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
    },
    errorRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        padding: 12,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: 12,
    },
    errorText: {
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: 56,
        borderRadius: 28,
        marginTop: 12,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 16,
        marginLeft: 8,
    },
});
