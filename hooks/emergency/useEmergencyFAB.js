import { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

export const useEmergencyFAB = ({
    registerFAB,
    unregisterFAB,
    mode,
    toggleMode,
    activeAmbulanceTrip,
    activeBedBooking,
    selectedHospital,
    sheetSnapIndex
}) => {

    // FAB toggles between emergency and bed booking modes
    const handleFloatingButtonPress = useCallback(() => {
        toggleMode();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [toggleMode]);

    // Enhanced FAB visibility logic that accounts for different modes and snap points
    const hasAnyVisitActive = !!activeAmbulanceTrip?.requestId || !!activeBedBooking?.requestId;
    
    const shouldHideFAB = useMemo(() => {
        // During active trips, ALWAYS show FAB for mode switching
        if (hasAnyVisitActive) {
            return false;
        }

        // Hide when hospital is selected (detail mode)
        if (selectedHospital) {
            return true;
        }

        // Hide when sheet is collapsed
        if (sheetSnapIndex === 0) {
            return true;
        }

        return false;
    }, [selectedHospital, hasAnyVisitActive, sheetSnapIndex]);

    useFocusEffect(
        useCallback(() => {
            // Registering FAB
            const fabDetails = {
                id: 'emergency-mode-toggle',
                visible: !shouldHideFAB,
                priority: 15,
                mode: mode,
                selectedHospital: selectedHospital?.name,
                hasAnyVisitActive
            };

            // Register FAB with unique ID and enhanced configuration
            registerFAB('emergency-mode-toggle', {
                icon: mode === "emergency" ? "bed-outline" : "alarm-light-outline",
                visible: !shouldHideFAB,
                mode: mode, // Pass mode for context-aware behavior
                hasAnyVisitActive: hasAnyVisitActive, // Pass trip status for positioning
                allowInStack: hasAnyVisitActive, // Allow FAB in stack screens when trip is active
                onPress: handleFloatingButtonPress,
                style: 'primary',
                haptic: 'medium',
                priority: 15, // Higher priority to override Home tab FAB (priority 10)
                animation: 'subtle',
            });

            // Cleanup
            return () => {
                // Unregistering FAB: emergency-mode-toggle
                unregisterFAB('emergency-mode-toggle');
            };
        }, [
            registerFAB,
            unregisterFAB,
            mode,
            shouldHideFAB,
            handleFloatingButtonPress,
            activeAmbulanceTrip,
            activeBedBooking,
            hasAnyVisitActive
        ])
    );
};
