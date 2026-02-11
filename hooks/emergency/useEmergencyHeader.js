import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from "expo-router";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import ProfileAvatarButton from "../../components/headers/ProfileAvatarButton";
import NotificationIconButton from "../../components/headers/NotificationIconButton";
import { QuickEmergencyButton } from "../../components/emergency/QuickEmergencyButton";

export const useEmergencyHeader = ({
    resetTabBar,
    resetHeader,
    setHeaderState,
    mode,
    isDarkMode,
    activeAmbulanceTrip,
    handleQuickEmergencyAction,
    unlockTabBarHidden
}) => {
    
    // Header components - memoized
    const leftComponent = useMemo(() => <ProfileAvatarButton />, []);

    const rightComponent = useMemo(() => {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <QuickEmergencyButton 
                    mode={mode}
                    activeAmbulanceTrip={activeAmbulanceTrip}
                    onPress={handleQuickEmergencyAction}
                    isDarkMode={isDarkMode}
                />
                <NotificationIconButton />
            </View>
        );
    }, [mode, activeAmbulanceTrip, handleQuickEmergencyAction, isDarkMode]);

    // Set up header on focus
    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: mode === "emergency" ? "Ambulance Call" : "Reserve Bed",
                subtitle: mode === "emergency" ? "EMERGENCY" : "BOOK BED",
                icon:
                    mode === "emergency" ? (
                        <Ionicons name="medical" size={26} color="#FFFFFF" />
                    ) : (
                        <Fontisto name="bed-patient" size={22} color="#FFFFFF" />
                    ),
                backgroundColor: COLORS.brandPrimary,
                leftComponent,
                rightComponent,
            });
        }, [resetTabBar, resetHeader, setHeaderState, mode, leftComponent, rightComponent])
    );

    // Tab bar locking logic
    useFocusEffect(
        useCallback(() => {
            // Always start unlocked when focusing this screen
            unlockTabBarHidden();

            return () => {
                // Ensure unlocked when leaving
                unlockTabBarHidden();
            };
        }, [unlockTabBarHidden])
    );
};
