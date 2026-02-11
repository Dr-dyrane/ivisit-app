import { useRef, useState, useEffect, useCallback } from "react";
import { Animated, Dimensions, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import useSwipeGesture from "../../utils/useSwipeGesture";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import { Pressable, Text } from "react-native";

const { width, height } = Dimensions.get("window");
const PRIMARY_RED = COLORS.brandPrimary;

export const onboardingData = [
    {
        headline: "Urgent Care\nin Seconds.",
        description:
            "Immediate medical support available 24/7. We bring the hospital to your doorstep.",
        image: require("../../assets/features/emergency.png"),
        cta: "DISCOVER CARE",
        icon: "ambulance",
    },
    {
        headline: "Skip the\nWaiting Room.",
        description:
            "Book appointments and urgent care visits without the typical hospital delays.",
        image: require("../../assets/features/urgent.png"),
        cta: "FIND DOCTORS",
        icon: "doctor",
    },
    {
        headline: "Secure Your\nBed Early.",
        description:
            "Real-time bed availability tracking and instant reservation at top facilities.",
        image: require("../../assets/features/bed.png"),
        cta: "BOOK A BED",
        icon: "bed-patient",
    },
    {
        headline: "Proactive\nHealth Tracking.",
        description:
            "Routine check-ups and digital health records to keep you ahead of the curve.",
        image: require("../../assets/features/checkup.png"),
        cta: "GET STARTED",
        icon: "pulse",
    },
];

export const useOnboardingLogic = () => {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { resetHeader } = useScrollAwareHeader();
    const [index, setIndex] = useState(0);
    const insets = useSafeAreaInsets();

    const topPadding = STACK_TOP_PADDING + (insets?.top || 0) + 20;

    // Header Configuration
    const SkipButton = useCallback(() => (
        <Pressable onPress={() => router.push("signup")} style={{ paddingHorizontal: 8 }}>
            <Text style={{
                color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
                fontWeight: "800",
                fontSize: 12,
                letterSpacing: 1.0
            }}>SKIP</Text>
        </Pressable>
    ), [isDarkMode, router]);

    useFocusEffect(
        useCallback(() => {
            resetHeader();
            setHeaderState({
                title: "Onboarding",
                subtitle: `STEP ${index + 1} OF ${onboardingData.length}`,
                icon: <Ionicons name="compass" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: <HeaderBackButton />,
                rightComponent: <SkipButton />,
                hidden: false,
            });
        }, [resetHeader, setHeaderState, index, isDarkMode, SkipButton])
    );

    // Animation Refs
    const contentFade = useRef(new Animated.Value(1)).current;
    const contentMove = useRef(new Animated.Value(0)).current;
    const imageScale = useRef(new Animated.Value(1)).current;
    const progressAnims = useRef(
        onboardingData.map(() => new Animated.Value(0))
    ).current;

    // Animate the progress dots when index changes
    useEffect(() => {
        onboardingData.forEach((_, i) => {
            Animated.spring(progressAnims[i], {
                toValue: i === index ? 1 : 0,
                friction: 8,
                tension: 50,
                useNativeDriver: false,
            }).start();
        });
    }, [index, progressAnims]);

    const transitionTo = useCallback((nextIndex, isSwipe = false) => {
        if (nextIndex < 0 || nextIndex >= onboardingData.length) return;

        if (!isSwipe) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Exit Phase
        Animated.parallel([
            Animated.timing(contentFade, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(contentMove, {
                toValue: -30,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(imageScale, {
                toValue: 0.95,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIndex(nextIndex);
            contentMove.setValue(30);

            // Entry Phase (layered)
            Animated.stagger(50, [
                Animated.spring(imageScale, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.spring(contentMove, {
                    toValue: 0,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(contentFade, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, [contentFade, contentMove, imageScale]);

    const handleNext = useCallback(() => {
        if (index === onboardingData.length - 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push("signup");
        } else {
            transitionTo(index + 1);
        }
    }, [index, router, transitionTo]);

    // Swipe Gesture Handling
    const panResponder = useSwipeGesture(
        () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // subtle image bounce
            Animated.sequence([
                Animated.timing(imageScale, {
                    toValue: 0.97,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(imageScale, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();

            // dot pulse
            Animated.sequence([
                Animated.timing(progressAnims[index], {
                    toValue: 0.8,
                    duration: 100,
                    useNativeDriver: false,
                }),
                Animated.timing(progressAnims[index], {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: false,
                }),
            ]).start();

            if (index < onboardingData.length - 1) transitionTo(index + 1, true);
        },
        () => {
            if (index > 0) transitionTo(index - 1, true);
        }
    );

    return {
        index,
        onboardingData,
        isDarkMode,
        topPadding,
        width,
        height,
        PRIMARY_RED,
        
        // Animations
        contentFade,
        contentMove,
        imageScale,
        progressAnims,
        
        // Actions
        handleNext,
        panResponder
    };
};
