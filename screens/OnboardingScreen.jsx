"use client";

import React from "react";
import { View, Text, Animated, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Fontisto } from "@expo/vector-icons";
import SlideButton from "../components/ui/SlideButton";
import { useOnboardingLogic } from "../hooks/onboarding/useOnboardingLogic";

/**
 * OnboardingScreen - Orchestrator Component
 *
 * Uses useOnboardingLogic for all state and animations.
 * Renders a clean View with minimal logic.
 */
const OnboardingScreen = () => {
    const {
        index,
        onboardingData,
        isDarkMode,
        topPadding,
        width,
        height,
        PRIMARY_RED,
        contentFade,
        contentMove,
        imageScale,
        progressAnims,
        handleNext,
        panResponder
    } = useOnboardingLogic();

    const currentItem = onboardingData[index];

    return (
        <LinearGradient
            colors={isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"]}
            className="flex-1"
            {...panResponder}
        >
            <ScrollView
                // [ACCESSIBILITY-FIX] Wrapped in ScrollView for large font accessibility
                contentContainerStyle={{ flexGrow: 1, paddingTop: topPadding, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
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
                        source={currentItem.image}
                        resizeMode="contain"
                        style={{ width: width * 0.85, height: height * 0.35 }}
                    />
                </Animated.View>

                {/* CONTENT */}
                <View className="px-8 pb-12">
                    <Animated.View
                        style={{
                            opacity: contentFade,
                            transform: [{ translateY: contentMove }],
                        }}
                    >
                        <Text
                            className={`text-[44px] font-black leading-[46px] tracking-tighter ${isDarkMode ? "text-white" : "text-slate-900"}`}
                        >
                            {currentItem.headline}
                        </Text>
                        <Text
                            className={`text-lg mt-4 leading-7 opacity-80 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                        >
                            {currentItem.description}
                        </Text>
                    </Animated.View>

                    {/* PROGRESS DOTS */}
                    <View className="flex-row items-center mt-10 mb-10">
                        {onboardingData.map((_, i) => {
                            const widthScale = progressAnims[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [8, 32],
                            });
                            const opacityScale = progressAnims[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 1],
                            });
                            return (
                                <Animated.View
                                    key={i}
                                    style={{
                                        width: widthScale,
                                        height: 6,
                                        backgroundColor: i === index ? PRIMARY_RED : isDarkMode ? "#333" : "#D1D1D1",
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
                            icon={(color) => (
                                <Fontisto
                                    name={currentItem.icon || "arrow-right"}
                                    size={18}
                                    color={color}
                                />
                            )}
                        >
                            {currentItem.cta}
                        </SlideButton>
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

export default OnboardingScreen;
