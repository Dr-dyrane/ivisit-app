import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useEmergency } from "../../contexts/EmergencyContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFABActions } from "../../contexts/FABContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useEmergencyContacts } from "../../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../../hooks/user/useMedicalProfile";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";
import { useToast } from "../../contexts/ToastContext";
import { getMapPaddingForSnapIndex } from "../../constants/emergencyAnimations";

import { useHospitalSelection } from "../../hooks/emergency/useHospitalSelection";
import { useRequestFlow } from "../../hooks/emergency/useRequestFlow";
import { useSearchFiltering } from "../../hooks/emergency/useSearchFiltering";
import { useEmergencyActions } from "../../hooks/emergency/useEmergencyActions";
import { useEmergencyFAB } from "../../hooks/emergency/useEmergencyFAB";
import { useEmergencyHeader } from "../../hooks/emergency/useEmergencyHeader";

export const useEmergencyScreenLogic = () => {
    const router = useRouter();
    const { showToast } = useToast();

    // Track focus state manually
    const [isFocused, setIsFocused] = useState(false);
    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);
            return () => setIsFocused(false);
        }, [])
    );

    const { resetTabBar, lockTabBarHidden, unlockTabBarHidden } = useTabBarVisibility();
    const { resetHeader } = useScrollAwareHeader();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFABActions();
    const { user } = useAuth();
    const { preferences } = usePreferences();
    const { isDarkMode } = useTheme();
    const { contacts: emergencyContacts } = useEmergencyContacts();
    const { profile: medicalProfile } = useMedicalProfile();

    // Refs for map and bottom sheet
    const mapRef = useRef(null);
    const bottomSheetRef = useRef(null);

    // UI state from EmergencyUIContext
    const {
        snapIndex: sheetSnapIndex,
        handleSnapChange: setSheetSnapIndex,
        searchQuery,
        updateSearch: setSearchQuery,
        setMapReady,
        getLastScrollY,
        timing,
    } = useEmergencyUI();

    const sheetSnapIndexRef = useRef(sheetSnapIndex);
    useEffect(() => {
        sheetSnapIndexRef.current = sheetSnapIndex;
    }, [sheetSnapIndex]);

    // Local state
    const [currentRoute, setCurrentRoute] = useState(null);
    const [ratingState, setRatingState] = useState({
        visible: false,
        visitId: null,
        title: null,
        subtitle: null,
    });

    // Data state from EmergencyContext
    const {
        hospitals,
        allHospitals,
        selectedHospitalId,
        selectedHospital,
        filteredHospitals,
        activeAmbulanceTrip,
        activeBedBooking,
        serviceType,
        selectedSpecialty,
        specialties,
        selectHospital,
        toggleMode,
        setMode,
        selectSpecialty,
        selectServiceType,
        updateHospitals,
        hasActiveFilters,
        resetFilters,
        clearSelectedHospital,
        startAmbulanceTrip,
        startBedBooking,
        mode,
    } = useEmergency();

    // 🚨 Quick Emergency - Auto-dispatch without hospital selection
    const { handleQuickEmergency } = useRequestFlow({
        createRequest: emergencyRequestsService.create,
        updateRequest: emergencyRequestsService.update,
        addVisit: emergencyRequestsService.addVisit,
        updateVisit: emergencyRequestsService.updateVisit,
        setRequestStatus: emergencyRequestsService.setStatus,
        startAmbulanceTrip,
        startBedBooking,
        clearSelectedHospital,
        user,
        preferences,
        medicalProfile,
        emergencyContacts,
        hospitals,
        selectedSpecialty,
        requestHospitalId: selectedHospitalId,
        selectedHospital,
        activeAmbulanceTrip,
        activeBedBooking,
        currentRoute,
    });

    const [pendingSelectedHospitalId, setPendingSelectedHospitalId] = useState(null);
    useEffect(() => {
        if (!pendingSelectedHospitalId) return;
        if (selectedHospitalId === pendingSelectedHospitalId) {
            setPendingSelectedHospitalId(null);
        }
    }, [pendingSelectedHospitalId, selectedHospitalId]);

    // Route clearing logic
    useEffect(() => {
        const hasActiveTrip = !!activeAmbulanceTrip?.requestId || !!activeBedBooking?.requestId;
        if (!selectedHospitalId && !pendingSelectedHospitalId && currentRoute && !hasActiveTrip) {
            setCurrentRoute(null);
        }
    }, [selectedHospitalId, pendingSelectedHospitalId, currentRoute, activeAmbulanceTrip?.requestId, activeBedBooking?.requestId]);

    // Map padding
    const mapBottomPadding = useMemo(() => {
        const isHospitalFlowOpen = !!selectedHospitalId || !!pendingSelectedHospitalId;
        return getMapPaddingForSnapIndex(sheetSnapIndex, isHospitalFlowOpen);
    }, [pendingSelectedHospitalId, selectedHospitalId, sheetSnapIndex]);

    // Handle sheet snap changes
    const handleSheetSnapChange = useCallback(
        (index) => {
            setSheetSnapIndex(index, "screen");
        },
        [setSheetSnapIndex]
    );

    // --- Custom Hooks for Extracted Logic ---

    // 1. Actions Hook (Navigation, Quick Emergency, Fallbacks)
    const {
        handleQuickEmergencyAction,
        handlePrimaryAction,
        handleServiceTypeSelect,
        handleSpecialtySelect
    } = useEmergencyActions({
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
    });

    // 2. Header Hook (Setup, Quick Button, Notifications)
    useEmergencyHeader({
        resetTabBar,
        resetHeader,
        setHeaderState,
        mode,
        isDarkMode,
        activeAmbulanceTrip,
        handleQuickEmergencyAction,
        unlockTabBarHidden
    });

    // 3. FAB Hook (Floating Action Button logic)
    useEmergencyFAB({
        registerFAB,
        unregisterFAB,
        mode,
        toggleMode,
        activeAmbulanceTrip,
        activeBedBooking,
        selectedHospital,
        sheetSnapIndex
    });

    // 4. Hospital Selection Logic
    const { handleHospitalSelect, handleCloseFocus } = useHospitalSelection({
        selectHospital,
        clearSelectedHospital,
        mapRef,
        sheetSnapIndex,
        getLastScrollY,
        timing,
    });

    const handleHospitalSelectWithSheet = useCallback(
        (hospital) => {
            if (hospital?.id) {
                setPendingSelectedHospitalId(hospital.id);
            }
            handleHospitalSelect(hospital);
        },
        [handleHospitalSelect]
    );

    const wrappedHandleCloseFocus = useCallback(() => {
        handleCloseFocus((nextState) => {
            bottomSheetRef.current?.restoreListState?.(nextState);
        });
    }, [handleCloseFocus]);

    // Hook: Search and filter logic
    const { handleSearchChange, handleClearSearch } = useSearchFiltering({
        setSearchQuery,
        updateHospitals,
        allHospitals,
        resetFilters,
    });

    return {
        // Refs
        mapRef,
        bottomSheetRef,

        // Data
        hospitals,
        filteredHospitals,
        selectedHospitalId,
        selectedHospital,
        activeAmbulanceTrip,
        activeBedBooking,
        serviceType,
        selectedSpecialty,
        specialties,
        mode,
        hasActiveFilters,
        searchQuery,
        
        // UI State
        mapBottomPadding,
        sheetSnapIndex,
        ratingState,
        setRatingState,
        currentRoute,
        setCurrentRoute,

        // Actions
        setMapReady,
        handleSheetSnapChange,
        handleHospitalSelectWithSheet,
        wrappedHandleCloseFocus,
        handlePrimaryAction,
        handleSearchChange,
        handleClearSearch,
        handleServiceTypeSelect,
        handleSpecialtySelect,
        resetFilters,
        
        // Helpers
        showToast
    };
};
