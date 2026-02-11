/**
 * hooks/emergency/useHospitalCardLogic.js
 * 
 * Logic hook for HospitalCard component.
 * Handles data normalization, theme colors, and interaction handlers.
 */

import { useCallback } from "react";
import { Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export function useHospitalCardLogic({
    hospital,
    isSelected,
    onSelect,
    onCall,
    mode,
    hideDistanceEta,
    hidePrimaryAction,
}) {
    const { isDarkMode } = useTheme();

    // Data Normalization
    const hospitalId = hospital?.id;
    const hospitalName = typeof hospital?.name === "string" ? hospital.name : "Hospital";
    const hospitalImageUri = typeof hospital?.image === "string" && hospital.image.length > 0 ? hospital.image : null;
    const hospitalRating = hospital?.rating ?? "--";

    // Check if this is a Google-imported hospital (not verified)
    const isGoogleHospital = hospital?.importedFromGoogle && hospital?.importStatus !== 'verified';
    const isVerifiedHospital = hospital?.verified || (!isGoogleHospital);

    const hospitalDistance = hospital?.distance ?? "--";
    const hospitalWaitTime = hospital?.waitTime || (mode === "booking" ? "Available" : "15 mins");
    const hospitalPrice = hospital?.price || (mode === "booking" ? "$$$" : "Emergency");
    const hospitalBeds = Number.isFinite(hospital?.availableBeds) ? hospital.availableBeds : 0;
    const hospitalPhone = typeof hospital?.phone === "string" && hospital.phone.length > 0 ? hospital.phone : null;
    const hospitalSpecialties = Array.isArray(hospital?.specialties)
        ? hospital.specialties.filter((s) => typeof s === "string")
        : [];

    // Colors
    const colors = {
        activeBG: isSelected
            ? isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary + "15"
            : isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        muted: isDarkMode ? "#94A3B8" : "#64748B",
        imagePlaceholder: isDarkMode ? "#252D3B" : "#E2E8F0",
        pillBg: isDarkMode ? "rgba(255,255,255,0.05)" : "#FFFFFF",
        callButtonBg: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
        callIcon: isDarkMode ? "#FFFFFF" : "#64748B",
        cardShadow: isSelected ? COLORS.brandPrimary : "#000",
        cardShadowOpacity: isDarkMode ? 0.2 : 0.08,
    };

    // Handlers
    const handlePress = useCallback(() => {
        if (!hospitalId || typeof onSelect !== "function") return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(hospitalId);
    }, [hospitalId, onSelect]);

    const handleCallPress = useCallback(() => {
        if (!hospitalId || typeof onCall !== "function") return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCall(hospitalId);
    }, [hospitalId, onCall]);

    const handlePhoneCall = useCallback(() => {
        if (!hospitalPhone) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const cleanPhone = hospitalPhone.replace(/[^\d+]/g, "");
        Linking.openURL(`tel:${cleanPhone}`);
    }, [hospitalPhone]);

    return {
        data: {
            hospitalId,
            hospitalName,
            hospitalImageUri,
            hospitalRating,
            isGoogleHospital,
            isVerifiedHospital,
            hospitalDistance,
            hospitalWaitTime,
            hospitalPrice,
            hospitalBeds,
            hospitalPhone,
            hospitalSpecialties,
        },
        state: {
            colors,
        },
        actions: {
            handlePress,
            handleCallPress,
            handlePhoneCall,
        }
    };
}
