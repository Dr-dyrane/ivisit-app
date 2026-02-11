import { useEffect } from "react";
import { useFABActions } from "../../contexts/FABContext";

export const useEmergencyRequestFAB = ({
    requestStep,
    mode,
    selectedAmbulanceType,
    bedType,
    bedCount,
    isRequesting,
    hasAmbulances,
    handleSubmitRequest,
    handleCallHospital
}) => {
    const { registerFAB, unregisterFAB } = useFABActions();

    // Global FAB registration for request modal
    useEffect(() => {
        if (__DEV__) {
            console.log('[EmergencyRequestModal] FAB registration effect:', {
                requestStep,
                mode,
                selectedAmbulanceType,
                bedType,
                bedCount,
                isRequesting,
            });
        }

        if (requestStep === "select") {
            // Selection state FAB
            if (mode === "booking") {
                registerFAB('bed-select', {
                    icon: 'checkmark', // Checkmark for confirmation
                    label: bedCount > 1 ? `Reserve ${bedCount} Beds` : 'Reserve Bed',
                    subText: bedType === "private" ? "Private room selected" : "Standard bed selected",
                    visible: true,
                    onPress: handleSubmitRequest,
                    loading: isRequesting,
                    style: 'emergency',
                    haptic: 'heavy',
                    priority: 10,
                    animation: 'prominent',
                    allowInStack: true, // Allow in stack screens
                });
            } else if (!hasAmbulances) {
                // Zero Ambulance Fallback FAB
                registerFAB('call-hospital', {
                    icon: 'call', // Phone icon
                    label: 'Call Hospital',
                    subText: 'No ambulances available',
                    visible: true,
                    onPress: handleCallHospital,
                    style: 'warning', // Warning style for attention
                    haptic: 'medium',
                    priority: 10,
                    animation: 'prominent',
                    allowInStack: true, // Allow in stack screens
                });
            } else if (selectedAmbulanceType) {
                registerFAB('ambulance-select', {
                    icon: 'checkmark', // Checkmark for unified UI
                    label: 'Request Ambulance',
                    subText: 'Tap to confirm',
                    visible: true,
                    onPress: handleSubmitRequest,
                    loading: isRequesting,
                    style: 'emergency',
                    haptic: 'heavy',
                    priority: 10,
                    animation: 'prominent',
                    allowInStack: true, // Allow in stack screens
                });
            } else {
                // No ambulance type selected
                registerFAB('ambulance-prompt', {
                    icon: 'checkmark', // Checkmark for unified UI
                    label: 'Select Ambulance',
                    subText: 'Choose ambulance type',
                    visible: true,
                    onPress: () => { }, // No action, just prompt
                    style: 'warning',
                    haptic: 'medium',
                    priority: 9,
                    animation: 'subtle',
                    allowInStack: true, // Allow in stack screens
                });
            }
        }

        // Cleanup function
        return () => {
            if (__DEV__) {
                console.log('[EmergencyRequestModal] Cleaning up FABs');
            }
            unregisterFAB('ambulance-select');
            unregisterFAB('ambulance-prompt');
            unregisterFAB('bed-select');
            unregisterFAB('call-hospital');
        };
    }, [
        requestStep,
        mode,
        selectedAmbulanceType,
        bedType,
        bedCount,
        isRequesting,
        handleSubmitRequest,
        handleCallHospital,
        registerFAB,
        unregisterFAB,
        hasAmbulances
    ]);
};
