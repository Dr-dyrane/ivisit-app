import { useEffect, useRef, useMemo } from "react";
import { Animated, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const useUpdateAvailableModalLogic = ({
    visible,
    variant,
    onRestart,
    onLater,
    onDismiss
}) => {
    const isCompleted = variant === 'completed';
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let pulseAnimation = null;

        if (visible) {
            // Soft notification haptic - not alarming
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Subtle pulse on icon - store reference for cleanup
            pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();
        }

        // Cleanup: stop animation loop when modal closes or unmounts
        return () => {
            if (pulseAnimation) {
                pulseAnimation.stop();
            }
            // Reset pulse to default value
            pulseAnim.setValue(1);
        };
    }, [visible, fadeAnim, slideAnim, pulseAnim]);

    const handleDismiss = (action) => {
        const dismissAction = action || (isCompleted ? onDismiss : onLater);
        if (!dismissAction) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => dismissAction());
    };

    const colors = useMemo(() => ({
        bg: isDarkMode ? "#111827" : "#FFFFFF",
        text: isDarkMode ? "#F9FAFB" : "#111827",
        subtext: isDarkMode ? "#9CA3AF" : "#6B7280",
        card: isDarkMode ? "#1F2937" : "#F3F4F6",
        laterBtn: isDarkMode ? "#374151" : "#E5E7EB",
    }), [isDarkMode]);

    return {
        state: {
            isCompleted,
            insets,
            isDarkMode,
            slideAnim,
            fadeAnim,
            pulseAnim,
            colors
        },
        actions: {
            handleDismiss
        }
    };
};
