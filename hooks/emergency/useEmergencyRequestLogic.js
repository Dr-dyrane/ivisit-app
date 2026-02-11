/**
 * hooks/emergency/useEmergencyRequestLogic.js
 * 
 * Logic hook for EmergencyRequestModal.
 * Handles request state, ambulance selection, bed booking logic, and FAB interactions.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";
import { useEmergencyRequestFAB } from "./useEmergencyRequestFAB";

export const useEmergencyRequestLogic = ({
    mode,
    requestHospital,
    selectedSpecialty,
    onRequestClose,
    onRequestInitiated,
    onRequestComplete
}) => {
    const { isDarkMode } = useTheme();
    const { showToast } = useToast();

    // State
    const [requestStep, setRequestStep] = useState("select");
    const [selectedAmbulanceType, setSelectedAmbulanceType] = useState(null);
    const [bedType, setBedType] = useState("standard");
    const [bedCount, setBedCount] = useState(2);
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestData, setRequestData] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Derived State
    const hasAmbulances = useMemo(() => {
        if (mode !== 'emergency') return true;
        // Default to true if undefined to avoid blocking valid flows, check explicit 0
        return (requestHospital?.ambulances ?? 1) > 0;
    }, [requestHospital, mode]);

    const requestColors = useMemo(
        () => ({
            card: isDarkMode ? "#121826" : "#FFFFFF",
            text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
            textMuted: isDarkMode ? "rgba(255,255,255,0.70)" : "rgba(15,23,42,0.55)",
        }),
        [isDarkMode]
    );

    // Handlers
    const handleCallHospital = useCallback(() => {
        const phone = requestHospital?.phone || requestHospital?.google_phone;
        if (phone) {
            Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
        } else {
            showToast("No phone number available", "error");
        }
    }, [requestHospital?.phone, requestHospital?.google_phone, showToast]);

    const handleRequestDone = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRequestClose?.();
    }, [onRequestClose]);

    const handleSubmitRequest = useCallback(async () => {
        if (isRequesting) return;
        if (!requestHospital) return;
        if (mode === "emergency" && !selectedAmbulanceType) return;

        setErrorMessage(null);
        setIsRequesting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        const hospitalName = requestHospital?.name ?? "Hospital";
        const requestId =
            mode === "booking"
                ? `BED-${Math.floor(Math.random() * 900000) + 100000}`
                : `AMB-${Math.floor(Math.random() * 900000) + 100000}`;
        const initiated =
            mode === "booking"
                ? {
                    requestId,
                    hospitalId: requestHospital?.id ?? null,
                    hospitalName,
                    serviceType: "bed",
                    specialty: selectedSpecialty ?? "Any",
                    bedCount,
                    bedType,
                    bedNumber: `B${Math.floor(Math.random() * 900) + 100}`,
                }
                : {
                    requestId,
                    hospitalId: requestHospital?.id ?? null,
                    hospitalName,
                    ambulanceType: selectedAmbulanceType,
                    serviceType: "ambulance",
                    specialty: selectedSpecialty ?? "Any",
                };

        try {
            if (typeof onRequestInitiated === "function") {
                onRequestInitiated(initiated);
            }
        } catch (error) {
            console.error("Error in onRequestInitiated callback:", error);
            setErrorMessage("Something went wrong. Please try again.");
            return;
        }

        setTimeout(() => {
            const waitTime = requestHospital?.waitTime ?? null;
            const hospitalEta = requestHospital?.eta ?? null;
            const ambulanceEta =
                (typeof hospitalEta === "string" && hospitalEta.length > 0
                    ? hospitalEta
                    : null) ?? "8 mins";

            const next =
                mode === "booking"
                    ? {
                        success: true,
                        requestId: initiated.requestId,
                        estimatedArrival: waitTime ?? "15 mins",
                        hospitalId: initiated.hospitalId,
                        hospitalName: initiated.hospitalName,
                        serviceType: "bed",
                        specialty: initiated.specialty,
                        bedCount: initiated.bedCount,
                        bedType: initiated.bedType,
                        bedNumber: initiated.bedNumber,
                        etaSeconds: null, // Let context derive from estimatedArrival or map route
                    }
                    : {
                        success: true,
                        requestId: initiated.requestId,
                        hospitalId: initiated.hospitalId,
                        hospitalName: initiated.hospitalName,
                        ambulanceType: initiated.ambulanceType,
                        serviceType: "ambulance",
                        estimatedArrival: ambulanceEta,
                        etaSeconds: null, // Let context derive from estimatedArrival or map route
                    };

            setRequestData(next);
            setIsRequesting(false);
            const toastMsg =
                mode === "booking"
                    ? "Bed reserved successfully"
                    : "Ambulance dispatched";
            try {
                showToast(toastMsg, "success");
            } catch (e) {
            }
            if (typeof onRequestComplete === "function") {
                onRequestComplete(next);
            }
        }, 900);
    }, [
        bedCount,
        bedType,
        isRequesting,
        mode,
        onRequestComplete,
        onRequestInitiated,
        requestHospital,
        selectedAmbulanceType,
        selectedSpecialty,
        showToast
    ]);

    // Global FAB registration for request modal
    useEmergencyRequestFAB({
        requestStep,
        mode,
        selectedAmbulanceType,
        bedType,
        bedCount,
        isRequesting,
        hasAmbulances,
        handleSubmitRequest,
        handleCallHospital
    });

    // Reset logic when hospital changes
    useEffect(() => {
        setRequestStep("select");

        // Default to BLS (Basic Life Support) - ID: 'standard'
        const defaultAmbulance = AMBULANCE_TYPES.find(t => t.id === "standard");
        setSelectedAmbulanceType(defaultAmbulance || null);

        setBedType("standard");
        setBedCount(1);
        setIsRequesting(false);
        setRequestData(null);
        setErrorMessage(null);
    }, [requestHospital?.id, mode]);

    return {
        state: {
            requestStep,
            selectedAmbulanceType,
            bedType,
            bedCount,
            isRequesting,
            requestData,
            errorMessage,
            hasAmbulances,
            requestColors,
            isDarkMode,
            hospitalName: requestHospital?.name ?? "Hospital",
            availableBeds: typeof requestHospital?.availableBeds === "number"
                ? requestHospital.availableBeds
                : Number.isFinite(Number(requestHospital?.availableBeds))
                    ? Number(requestHospital.availableBeds)
                    : null,
            waitTime: requestHospital?.waitTime ?? null,
        },
        actions: {
            handleCallHospital,
            handleSubmitRequest,
            handleRequestDone,
            setSelectedAmbulanceType,
            setBedType,
            setBedCount,
        }
    };
};
