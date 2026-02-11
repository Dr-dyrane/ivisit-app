/**
 * hooks/user/useMedicalProfileLogic.js
 * 
 * Logic hook for MedicalProfileScreen.
 * Handles:
 * - Form state management (local profile, changes detection)
 * - Saving logic with API integration
 * - UI state (animations, colors, header, FAB)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFAB } from "../../contexts/FABContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useMedicalProfile } from "../../hooks/user/useMedicalProfile";
import { useToast } from "../../contexts/ToastContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";

export function useMedicalProfileLogic() {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFAB();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { showToast } = useToast();
    const { profile, isLoading, updateProfile } = useMedicalProfile();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Local form state
    const [localProfile, setLocalProfile] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [stableHasChanges, setStableHasChanges] = useState(false);
    const debouncedHasChanges = useRef(false);
    const hasRegisteredFAB = useRef(false);

    // Header Setup
    const backButton = useCallback(() => <HeaderBackButton />, []);

    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Medical Profile",
                subtitle: "HEALTH",
                icon: <Ionicons name="fitness" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: backButton(),
                rightComponent: null,
            });
        }, [backButton, resetHeader, resetTabBar, setHeaderState])
    );

    // Initial Animations
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Sync profile to local state
    useEffect(() => {
        if (profile) {
            setLocalProfile(profile);
        }
    }, [profile]);

    // Field Update Handler
    const updateField = useCallback((key, value) => {
        setLocalProfile((prev) => ({
            ...(prev || {}),
            [key]: value,
        }));
    }, []);

    // Save Handler
    const handleSave = useCallback(async () => {
        if (!localProfile || isSaving) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSaving(true);
        try {
            await updateProfile({
                bloodType: localProfile.bloodType,
                allergies: localProfile.allergies,
                medications: localProfile.medications,
                conditions: localProfile.conditions,
                surgeries: localProfile.surgeries,
                notes: localProfile.notes,
            });
            showToast("Medical profile updated successfully", "success");
        } catch (error) {
            console.error("Medical profile update failed:", error);
            showToast("Failed to update medical profile", "error");
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, localProfile, updateProfile, showToast]);

    // Change Detection
    const hasChanges = useMemo(() => {
        if (!profile || !localProfile) return false;
        
        return (
            (localProfile.bloodType ?? "") !== (profile.bloodType ?? "") ||
            (localProfile.allergies ?? "") !== (profile.allergies ?? "") ||
            (localProfile.medications ?? "") !== (profile.medications ?? "") ||
            (localProfile.conditions ?? "") !== (profile.conditions ?? "") ||
            (localProfile.surgeries ?? "") !== (profile.surgeries ?? "") ||
            (localProfile.notes ?? "") !== (profile.notes ?? "")
        );
    }, [profile, localProfile]);

    // Debounce Changes for FAB
    useEffect(() => {
        const timer = setTimeout(() => {
            if (debouncedHasChanges.current !== hasChanges) {
                debouncedHasChanges.current = hasChanges;
                setStableHasChanges(hasChanges);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [hasChanges]);

    // FAB Registration
    useEffect(() => {
        if (hasRegisteredFAB.current) {
            // Update existing FAB
            registerFAB('medical-profile-save', {
                icon: 'checkmark',
                label: stableHasChanges ? 'Save Medical Info' : 'No Changes',
                subText: stableHasChanges ? 'Tap to save medical profile' : 'Medical profile up to date',
                visible: stableHasChanges,
                onPress: handleSave,
                loading: isSaving,
                style: 'primary',
                haptic: 'medium',
                priority: 8,
                animation: 'prominent',
                allowInStack: true,
            });
        }
    }, [stableHasChanges, isSaving, handleSave, registerFAB]);

    useFocusEffect(
        useCallback(() => {
            if (!hasRegisteredFAB.current) {
                registerFAB('medical-profile-save', {
                    icon: 'checkmark',
                    label: stableHasChanges ? 'Save Medical Info' : 'No Changes',
                    subText: stableHasChanges ? 'Tap to save medical profile' : 'Medical profile up to date',
                    visible: stableHasChanges,
                    onPress: handleSave,
                    loading: isSaving,
                    style: 'primary',
                    haptic: 'medium',
                    priority: 8,
                    animation: 'prominent',
                    allowInStack: true,
                });
                hasRegisteredFAB.current = true;
            }
            return () => {
                unregisterFAB('medical-profile-save');
                hasRegisteredFAB.current = false;
            };
        }, [registerFAB, unregisterFAB, stableHasChanges, isSaving, handleSave])
    );

    // Scroll Handler
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    const colors = {
        backgrounds: isDarkMode
            ? ["#121826", "#0B0F1A", "#121826"]
            : ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    };

    const layout = {
        topPadding: STACK_TOP_PADDING,
        bottomPadding: (Platform.OS === "ios" ? 85 + insets.bottom : 70) + 20,
    };

    return {
        state: {
            localProfile,
            isLoading,
            isSaving,
            colors,
            layout,
        },
        animations: {
            fadeAnim,
            slideAnim,
        },
        actions: {
            updateField,
            handleScroll,
        },
    };
}
