// screens/OnboardingScreen.js

"use client";

import React, { useRef, useState, useEffect } from "react";
import { View, Text, Animated, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import SlideButton from "../components/ui/SlideButton";
import { useTheme } from "../contexts/ThemeContext";
import useSwipeGesture from "../utils/useSwipeGesture";
import { COLORS } from "../constants/colors";


/**
 * OnboardingScreen
 *
 * File Path: screens/OnboardingScreen.js
 *
 * Displays a multi-step onboarding flow:
 * - Hero image with scaling animation
 * - Headline & description with fade & translate
 * - Animated progress indicators
 * - CTA button with icon and haptic feedback
 * - Swipe gestures for navigation
 *
 * Responsibilities are separated:
 * - Animations handled by Animated API
 * - Progress dots interpolated
 * - CTA triggers navigation or next slide
 */

const { width, height } = Dimensions.get("window");
const PRIMARY_RED = COLORS.brandPrimary;

const onboardingData = [
  {
    headline: "Urgent Care\nin Seconds.",
    description: "Immediate medical support available 24/7. We bring the hospital to your doorstep.",
    image: require("../assets/features/emergency.png"),
    cta: "DISCOVER CARE",
    icon: "ambulance"
  },
  {
    headline: "Skip the\nWaiting Room.",
    description: "Book appointments and urgent care visits without the typical hospital delays.",
    image: require("../assets/features/urgent.png"),
    cta: "FIND DOCTORS",
    icon: "doctor"
  },
  {
    headline: "Secure Your\nBed Early.",
    description: "Real-time bed availability tracking and instant reservation at top facilities.",
    image: require("../assets/features/bed.png"),
    cta: "BOOK A BED",
    icon: "bed-patient"
  },
  {
    headline: "Proactive\nHealth Tracking.",
    description: "Routine check-ups and digital health records to keep you ahead of the curve.",
    image: require("../assets/features/checkup.png"),
    cta: "GET STARTED",
    icon: "pulse"
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [index, setIndex] = useState(0);

  // ------------------------
  // Animation Refs
  // ------------------------
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentMove = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const progressAnims = useRef(onboardingData.map(() => new Animated.Value(0))).current;

  // Animate the progress dots when index changes
  useEffect(() => animateProgress(), [index]);

  const animateProgress = () => {
    onboardingData.forEach((_, i) => {
      Animated.spring(progressAnims[i], {
        toValue: i === index ? 1 : 0,
        friction: 8,
        tension: 50,
        useNativeDriver: false,
      }).start();
    });
  };

  // ------------------------
  // Slide Transitions
  // ------------------------
  const transitionTo = (nextIndex, isSwipe = false) => {
    if (nextIndex < 0 || nextIndex >= onboardingData.length) return;

    if (!isSwipe) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Exit Phase
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(contentMove, { toValue: -30, duration: 250, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 0.95, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIndex);
      contentMove.setValue(30);

      // Entry Phase (layered)
      Animated.stagger(50, [
        Animated.spring(imageScale, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.spring(contentMove, { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(contentFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (index === onboardingData.length - 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("signup");
    } else {
      transitionTo(index + 1);
    }
  };

  // ------------------------
  // Swipe Gesture Handling
  // ------------------------
  const panResponder = useSwipeGesture(
    () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // subtle image bounce
      Animated.sequence([
        Animated.timing(imageScale, { toValue: 0.97, duration: 100, useNativeDriver: true }),
        Animated.timing(imageScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      // dot pulse
      Animated.sequence([
        Animated.timing(progressAnims[index], { toValue: 0.8, duration: 100, useNativeDriver: false }),
        Animated.timing(progressAnims[index], { toValue: 1, duration: 100, useNativeDriver: false }),
      ]).start();

      if (index < onboardingData.length - 1) transitionTo(index + 1, true);
    },
    () => {
      if (index > 0) transitionTo(index - 1, true);
    }
  );

  // ------------------------
  // Render
  // ------------------------
  return (
    <LinearGradient
      colors={isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"]}
      className="flex-1"
      {...panResponder}
    >
      {/* HERO IMAGE */}
      <Animated.View
        style={{
          opacity: contentFade,
          transform: [{ scale: imageScale }],
        }}
        className="flex-1 justify-center items-center"
      >
        <Image
          source={onboardingData[index].image}
          resizeMode="contain"
          style={{ width: width * 0.85, height: height * 0.35 }}
        />
      </Animated.View>

      {/* CONTENT */}
      <View className="px-8 pb-12">
        <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentMove }] }}>
          <Text className={`text-[44px] font-black leading-[46px] tracking-tighter ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {onboardingData[index].headline}
          </Text>
          <Text className={`text-lg mt-4 leading-7 opacity-80 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            {onboardingData[index].description}
          </Text>
        </Animated.View>

        {/* PROGRESS DOTS */}
        <View className="flex-row items-center mt-10 mb-10">
            {onboardingData.map((_, i) => {
            const widthScale = progressAnims[i].interpolate({ inputRange: [0, 1], outputRange: [8, 32] });
            const opacityScale = progressAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
            return (
              <Animated.View
                key={i}
                style={{
                  width: widthScale,
                  height: 6,
                      backgroundColor: i === index ? PRIMARY_RED : (isDarkMode ? "#333" : "#D1D1D1"),
                  borderRadius: 3,
                  marginRight: 6,
                  opacity: opacityScale,
                }}
              />
            );
          })}
        </View>

        {/* CTA BUTTON */}
        <View className="h-[70px]">
          <SlideButton
            onPress={handleNext}
            icon={(color) => <Fontisto name={onboardingData[index].icon || "arrow-right"} size={18} color={color} />}
          >
            {onboardingData[index].cta}
          </SlideButton>
        </View>
      </View>
    </LinearGradient>
  );
}
