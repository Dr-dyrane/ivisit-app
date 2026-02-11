import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import { discoveryService } from "../../services/discoveryService";
import { navigateToBookBed, navigateToRequestAmbulance } from "../../utils/navigationHelpers";

export const useEmergencyActions = ({
    mode,
    router,
    showToast,
    hospitals,
    activeAmbulanceTrip,
    activeBedBooking,
    searchQuery,
    handleQuickEmergency,
    selectServiceType,
    serviceType,
    selectSpecialty,
    selectedSpecialty,
    handleSheetSnapChange
}) => {

    // 🚨 Quick Emergency Handler - Auto-dispatch without hospital selection
    const handleQuickEmergencyAction = useCallback(async () => {
        console.log('[EmergencyScreen] Quick emergency button pressed');
        console.log('[EmergencyScreen] Mode:', mode);
        console.log('[EmergencyScreen] Active trip:', activeAmbulanceTrip?.requestId);
        console.log('[EmergencyScreen] handleQuickEmergency available:', !!handleQuickEmergency);

        if (mode !== "emergency") {
            showToast("Quick Emergency only available in Ambulance mode", "warning");
            return;
        }

        const hasActiveTrip = !!activeAmbulanceTrip?.requestId;
        if (hasActiveTrip) {
            showToast("You already have an active ambulance trip", "warning");
            return;
        }

        try {
            console.log('[EmergencyScreen] Calling handleQuickEmergency...');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const result = await handleQuickEmergency("ambulance");

            if (result.ok) {
                showToast(`🚨 Auto-dispatched to ${result.hospital}`, "success");
                console.log('[EmergencyScreen] Quick emergency successful:', result);

                // 🎯 Navigate to selected hospital view after auto-dispatch
                if (result.requestId) {
                    console.log('[EmergencyScreen] Navigating to ambulance request with ID:', result.requestId);
                    navigateToRequestAmbulance({
                        router,
                        hospitalId: result.hospitalId || 'auto-dispatched',
                        method: "push"
                    });
                }
            } else {
                showToast(`Emergency failed: ${result.reason}`, "error");
                console.log('[EmergencyScreen] Quick emergency failed:', result);
            }
        } catch (error) {
            console.error('[EmergencyScreen] Quick emergency error:', error);
            showToast("Emergency request failed", "error");
        }
    }, [mode, activeAmbulanceTrip?.requestId, showToast, handleQuickEmergency, router]);

    // Emergency call handler (Book Bed / Call Ambulance)
    const handlePrimaryAction = useCallback(
        (hospitalId) => {
            if (!hospitalId) return;

            // Find hospital and check availability fallbacks
            const hospital = hospitals.find(h => h.id === hospitalId);
            console.log("[EmergencyScreen] handleHospitalSelect:", { hospitalId, mode, found: !!hospital });

            const isGoogleHospital = hospital?.importedFromGoogle && hospital?.importStatus !== 'verified';

            // Check for zero ambulances in emergency mode
            const noAmbulances = mode === 'emergency' &&
                hospital?.ambulances !== undefined &&
                hospital?.ambulances !== null &&
                Number(hospital.ambulances) <= 0;

            const noBeds = mode === 'booking' && hospital?.availableBeds !== undefined && hospital.availableBeds <= 0;

            const hasActiveByMode =
                mode === "booking"
                    ? !!activeBedBooking?.requestId
                    : !!activeAmbulanceTrip?.requestId;

            if (hasActiveByMode) {
                try {
                    showToast(
                        mode === "booking"
                            ? "You already have an active bed booking"
                            : "You already have an active ambulance trip",
                        "warning"
                    );
                } catch (e) { }
                // Use the safe context handler which is aware of current mode constraints
                handleSheetSnapChange(1);
                return;
            }

            // Fallback Logic
            if (isGoogleHospital || noAmbulances || noBeds) {
                console.log('[EmergencyScreen] Fallback active:', { isGoogleHospital, noAmbulances, noBeds });

                const phone = hospital?.phone;
                if (phone) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    const cleanPhone = phone.replace(/[^\d+]/g, "");
                    Linking.openURL(`tel:${cleanPhone}`);
                    return;
                } else {
                    showToast("Hospital phone number not available. Contacting emergency services...", "error");
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

                    // Unified 911 fallback for any critical failure where phone is missing
                    Linking.openURL("tel:911");
                    return;
                }
            }

            discoveryService.trackConversion({
                action: mode === "booking" ? "book_bed_start" : "request_ambulance_start",
                hospitalId,
                mode,
                query: searchQuery,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (mode === "booking") {
                navigateToBookBed({ router, hospitalId, method: "push" });
                return;
            }
            navigateToRequestAmbulance({ router, hospitalId, method: "push" });
        },
        [mode, router, activeAmbulanceTrip?.requestId, activeBedBooking?.requestId, showToast, searchQuery, hospitals, handleSheetSnapChange]
    );

    // Service type selection
    const handleServiceTypeSelect = useCallback(
        (type) => {
            if (!type) return;

            const normalizedType = type.toLowerCase();
            const normalizedCurrent = serviceType ? serviceType.toLowerCase() : null;

            if (normalizedType === normalizedCurrent) {
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            selectServiceType(type);
        },
        [selectServiceType, serviceType]
    );

    // Specialty selection
    const handleSpecialtySelect = useCallback(
        (specialty) => {
            if (specialty === selectedSpecialty) {
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            selectSpecialty(specialty);
        },
        [selectSpecialty, selectedSpecialty]
    );

    return {
        handleQuickEmergencyAction,
        handlePrimaryAction,
        handleServiceTypeSelect,
        handleSpecialtySelect
    };
};
