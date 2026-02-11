import { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFAB } from "../../contexts/FABContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { COLORS } from "../../constants/colors";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";

// Hooks
import { useProfileForm } from "./useProfileForm";
import { useMedicalProfile } from "../user/useMedicalProfile";
import { useEmergencyContacts } from "../emergency/useEmergencyContacts";

// Utils
import {
    navigateToEmergencyContacts,
    navigateToMedicalProfile,
} from "../../utils/navigationHelpers";

export const useProfileScreenLogic = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFAB();
    const { user, syncUserData } = useAuth();
    const { isDarkMode } = useTheme();
    const { profile: medicalProfile } = useMedicalProfile();
    const { contacts: emergencyContacts } = useEmergencyContacts();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

    // --- Form Logic ---
    const {
        formState,
        displayId,
        isDataLoading,
        isLoading,
        isDeleting,
        hasChanges,
        pickImage,
        saveProfile,
        deleteAccount
    } = useProfileForm();

    // Destructure form state for easier access
    const {
        setFullName,
        setUsername,
        setGender,
        setEmail,
        setPhone,
        setAddress,
        setDateOfBirth,
        imageUri,
        fullName,
        email
    } = formState;

    const formHandlers = {
        setFullName,
        setUsername,
        setGender,
        setEmail,
        setPhone,
        setAddress,
        setDateOfBirth,
    };

    // --- FAB Management ---
    // Debounced version of hasChanges to prevent FAB flickering
    const debouncedHasChanges = useRef(hasChanges);
    const [stableHasChanges, setStableHasChanges] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (debouncedHasChanges.current !== hasChanges) {
                debouncedHasChanges.current = hasChanges;
                setStableHasChanges(hasChanges);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [hasChanges]);

    // Stabilize save handler for FAB
    const saveHandlerRef = useRef(saveProfile);
    useEffect(() => {
        saveHandlerRef.current = saveProfile;
    }, [saveProfile]);

    const registerSaveFab = useCallback(() => {
        registerFAB('profile-save', {
            icon: 'checkmark',
            label: stableHasChanges ? 'Save Changes' : 'No Changes',
            subText: stableHasChanges ? 'Tap to save profile' : 'Profile up to date',
            visible: stableHasChanges,
            onPress: () => saveHandlerRef.current(),
            loading: isLoading,
            style: 'primary',
            haptic: 'medium',
            priority: 8,
            animation: 'prominent',
            allowInStack: true,
        });

        return () => {
            unregisterFAB('profile-save');
        };
    }, [registerFAB, unregisterFAB, stableHasChanges, isLoading]);

    // --- Animations ---
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const imageScale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (!isDataLoading) {
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
                Animated.spring(imageScale, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isDataLoading, fadeAnim, slideAnim, imageScale]);

    // --- Handlers ---
    const handleDeleteAccountPress = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteAccount(router),
                },
            ]
        );
    }, [deleteAccount, router]);

    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleTabBarScroll, handleHeaderScroll]
    );

    const backButton = useCallback(() => <HeaderBackButton />, []);

    const setupHeader = useCallback(() => {
        resetTabBar();
        resetHeader();
        setHeaderState({
            title: "Profile",
            subtitle: "YOUR ACCOUNT",
            icon: <Ionicons name="person" size={26} color="#FFFFFF" />,
            backgroundColor: COLORS.brandPrimary,
            badge: null,
            leftComponent: backButton(),
            rightComponent: null,
        });
    }, [backButton, resetHeader, resetTabBar, setHeaderState]);

    const handlePasswordNavigation = useCallback(() => {
        if (user?.hasPassword) {
            router.push("/(user)/(stacks)/change-password");
        } else {
            router.push("/(user)/(stacks)/create-password");
        }
    }, [user?.hasPassword, router]);

    return {
        // Data
        user,
        fullName,
        email,
        displayId,
        imageUri,
        medicalProfile,
        emergencyContacts,
        formState,
        
        // UI State
        isDataLoading,
        isDeleting,
        isDarkMode,
        insets,
        
        // Animations
        fadeAnim,
        slideAnim,
        imageScale,
        
        // Actions
        pickImage,
        formHandlers,
        handleDeleteAccountPress,
        handleScroll,
        handlePasswordNavigation,
        syncUserData,
        
        // Setup
        registerSaveFab,
        setupHeader,
        
        // Navigation Helpers (exposed for convenience if needed, though mostly handled internally)
        navigateToEmergencyContacts: () => navigateToEmergencyContacts({ router }),
        navigateToMedicalProfile: () => navigateToMedicalProfile({ router })
    };
};
