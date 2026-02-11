import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";

export const QuickEmergencyButton = ({ 
    mode, 
    activeAmbulanceTrip, 
    onPress, 
    isDarkMode 
}) => {
    const [quickButtonPulse, setQuickButtonPulse] = useState(false);

    useEffect(() => {
        // Start Matrix-style pulsing after 2 seconds when button is visible
        if (mode === "emergency" && !activeAmbulanceTrip?.requestId) {
            const timer = setTimeout(() => {
                setQuickButtonPulse(true);
            }, 2000);

            // Stabilized flicker interval: 8000ms
            const flickerInterval = setInterval(() => {
                setQuickButtonPulse(prev => Math.random() > 0.3);
            }, 8000);

            return () => {
                clearTimeout(timer);
                clearInterval(flickerInterval);
            };
        } else {
            setQuickButtonPulse(false);
        }
    }, [mode, activeAmbulanceTrip?.requestId]);

    const handlePress = useCallback(() => {
        console.log('[QuickEmergencyButton] TAPPED!');
        if (onPress) onPress();
    }, [onPress]);

    const handlePressIn = useCallback(() => {
        console.log('[QuickEmergencyButton] Press IN');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, []);

    const handlePressOut = useCallback(() => {
        console.log('[QuickEmergencyButton] Press OUT');
        setQuickButtonPulse(false);
    }, []);

    // Theme-sensitive colors
    const adaptiveColors = {
        bgColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : `rgba(134, 16, 14, 0.1)`, 
        shadowColor: COLORS.brandPrimary,
        iconColor: quickButtonPulse ? '#FFFFFF' : (isDarkMode ? COLORS.textLight : COLORS.brandPrimary),
    };

    if (mode !== "emergency" || activeAmbulanceTrip?.requestId) {
        return null;
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{
                marginRight: 12,
                backgroundColor: adaptiveColors.bgColor,
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                borderWidth: 0,
                // Seamless bleed effect
                shadowColor: adaptiveColors.shadowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: quickButtonPulse ? 1 : 0.4,
                shadowRadius: quickButtonPulse ? 15 : 8,
                transform: [{ scale: quickButtonPulse ? 1.08 : 1 }],
            }}
            activeOpacity={0.8}
        >
            <Ionicons
                name="flash"
                size={14}
                color={adaptiveColors.iconColor}
            />
        </TouchableOpacity>
    );
};
