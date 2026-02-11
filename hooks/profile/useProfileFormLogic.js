/**
 * hooks/profile/useProfileFormLogic.js
 * 
 * Logic hook for ProfileForm component.
 * Handles form state, image picking, validation, and animations.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export function useProfileFormLogic({ onSubmit, loading, initialValues }) {
    const { isDarkMode } = useTheme();

    // Local form state
    const [firstName, setFirstName] = useState(initialValues?.firstName || "");
    const [lastName, setLastName] = useState(initialValues?.lastName || "");
    const [imageUri, setImageUri] = useState(initialValues?.imageUri || null);
    const [currentField, setCurrentField] = useState("firstName");

    const buttonScale = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Sync local state when initialValues changes
    useEffect(() => {
        if (initialValues) {
            if (initialValues.firstName) setFirstName(initialValues.firstName);
            if (initialValues.lastName) setLastName(initialValues.lastName);
            if (initialValues.imageUri) setImageUri(initialValues.imageUri);
        }
    }, [initialValues]);

    const handlePickImage = useCallback(async () => {
        Haptics.selectionAsync();

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setImageUri(uri);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            console.error("Image picker error:", error);
            // Ideally use a toast here if we had access to it, 
            // but for now console error is fine as UI fallback isn't critical
        }
    }, []);

    const triggerShake = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleSubmit = useCallback(() => {
        if (!firstName.trim() || !lastName.trim()) {
            triggerShake();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        onSubmit({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            imageUri
        });
    }, [firstName, lastName, imageUri, onSubmit, triggerShake]);

    const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

    const colors = {
        inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
        text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
        border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    };

    return {
        state: {
            firstName,
            lastName,
            imageUri,
            currentField,
            isValid,
            colors,
        },
        actions: {
            setFirstName,
            setLastName,
            setCurrentField,
            handlePickImage,
            handleSubmit,
        },
        refs: {
            buttonScale,
            shakeAnim,
        },
    };
}
