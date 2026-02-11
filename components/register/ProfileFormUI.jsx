// components/register/ProfileFormUI.jsx
import React from "react";
import { View, Text, TextInput, Pressable, Animated, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export const ProfileHeader = ({ colors }) => (
    <>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
            Complete Your Profile
        </Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textMuted }]}>
            Help us personalize your iVisit experience
        </Text>
    </>
);

export const AvatarPicker = ({ imageUri, onPickImage, colors }) => (
    <Pressable onPress={onPickImage} style={styles.avatarContainer}>
        <View
            style={[
                styles.avatarCircle,
                { backgroundColor: colors.inputBg }
            ]}
        >
            {imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={styles.avatarImage}
                />
            ) : (
                <Ionicons name="camera" size={32} color={COLORS.textMuted} />
            )}
        </View>
        <Text style={[styles.avatarText, { color: COLORS.brandPrimary }]}>
            Add Photo
        </Text>
    </Pressable>
);

export const FormInput = ({
    value,
    onChangeText,
    onFocus,
    placeholder,
    icon,
    isFocused,
    shakeAnim,
    colors,
    isDarkMode,
    returnKeyType = "next",
    onSubmitEditing,
    autoFocus = false
}) => (
    <Animated.View
        style={{
            transform: [{ translateX: isFocused ? shakeAnim : 0 }],
        }}
    >
        <View
            style={[
                styles.inputContainer,
                {
                    backgroundColor: colors.inputBg,
                    borderColor: isFocused ? COLORS.brandPrimary : colors.border,
                    shadowOpacity: isDarkMode ? 0.2 : 0.05,
                }
            ]}
        >
            <Ionicons
                name={icon}
                size={22}
                color={COLORS.textMuted}
                style={{ marginRight: 12 }}
            />
            <TextInput
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={value}
                onChangeText={onChangeText}
                onFocus={onFocus}
                autoCapitalize="words"
                selectionColor={COLORS.brandPrimary}
                returnKeyType={returnKeyType}
                onSubmitEditing={onSubmitEditing}
                style={[styles.input, { color: colors.text }]}
                autoFocus={autoFocus}
            />
        </View>
    </Animated.View>
);

export const SubmitButton = ({
    isValid,
    loading,
    onPress,
    buttonScale,
    isDarkMode
}) => (
    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
            disabled={!isValid || loading}
            style={[
                styles.submitButton,
                {
                    backgroundColor: isValid
                        ? COLORS.brandPrimary
                        : isDarkMode
                            ? COLORS.bgDarkAlt
                            : "#E5E7EB",
                    opacity: loading ? 0.7 : 1,
                }
            ]}
        >
            <Text
                style={[
                    styles.submitButtonText,
                    { color: isValid ? COLORS.bgLight : COLORS.textMuted }
                ]}
            >
                {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </Text>
        </Pressable>
    </Animated.View>
);

const styles = StyleSheet.create({
    headerTitle: {
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 12,
    },
    headerSubtitle: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 32,
        alignItems: 'center',
    },
    avatarCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 24,
        height: 80,
        marginBottom: 16,
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
    },
    input: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
    },
    submitButton: {
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
