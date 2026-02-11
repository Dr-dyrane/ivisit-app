"use client";

import React from "react";
import { View } from "react-native";
import { useEmergencyScreenLogic } from "../hooks/emergency/useEmergencyScreenLogic";
import { EmergencyMapContainer } from "../components/emergency/EmergencyMapContainer";
import { BottomSheetController } from "../components/emergency/BottomSheetController";
import { ServiceRatingModal } from "../components/emergency/ServiceRatingModal";

/**
 * EmergencyScreen - Apple Maps Style Layout
 *
 * Uses useEmergencyScreenLogic for all logic and state.
 * Refactored to strict View-Hook-Service pattern.
 */
const EmergencyScreen = () => {
    const {
        // Refs
        mapRef,
        bottomSheetRef,

        // Data
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
        showToast
    } = useEmergencyScreenLogic();

    // Debug logging for critical props
    React.useEffect(() => {
        if (!handleHospitalSelectWithSheet) console.warn('[EmergencyScreen] handleHospitalSelectWithSheet is undefined');
        if (!wrappedHandleCloseFocus) console.warn('[EmergencyScreen] wrappedHandleCloseFocus is undefined');
    }, [handleHospitalSelectWithSheet, wrappedHandleCloseFocus]);

    return (
        <View style={{ flex: 1 }}>
            {/* Map Background */}
            <EmergencyMapContainer
                ref={mapRef}
                hospitals={filteredHospitals}
                selectedHospitalId={selectedHospitalId}
                userLocation={null} // Handled internally
                onHospitalSelect={handleHospitalSelectWithSheet}
                onMapReady={() => setMapReady(true)}
                bottomPadding={mapBottomPadding}
                routeHospitalId={activeAmbulanceTrip?.hospitalId || activeBedBooking?.hospitalId}
                animateAmbulance={!!activeAmbulanceTrip?.requestId}
                ambulanceTripEtaSeconds={activeAmbulanceTrip?.etaSeconds}
                responderLocation={activeAmbulanceTrip?.responderLocation}
                responderHeading={activeAmbulanceTrip?.responderHeading}
                sheetSnapIndex={sheetSnapIndex}
                onRouteCalculated={setCurrentRoute}
                mode={mode}
            />

            {/* Bottom Sheet UI */}
            <BottomSheetController
                ref={bottomSheetRef}
                snapIndex={sheetSnapIndex}
                onSnapChange={handleSheetSnapChange}
                hospitals={filteredHospitals}
                selectedHospital={selectedHospital}
                onHospitalSelect={handleHospitalSelectWithSheet}
                onCloseFocus={wrappedHandleCloseFocus}
                onHospitalCall={handlePrimaryAction}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
                serviceType={serviceType}
                onServiceTypeSelect={handleServiceTypeSelect}
                selectedSpecialty={selectedSpecialty}
                onSpecialtySelect={handleSpecialtySelect}
                activeAmbulanceTrip={activeAmbulanceTrip}
                activeBedBooking={activeBedBooking}
                mode={mode}
                specialties={specialties}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={resetFilters}
            />

            {/* Rating Modal */}
            <ServiceRatingModal
                visible={ratingState.visible}
                visitId={ratingState.visitId}
                title={ratingState.title}
                subtitle={ratingState.subtitle}
                onClose={() => setRatingState((prev) => ({ ...prev, visible: false }))}
                onSubmit={(rating, tags, comment) => {
                    console.log("Rating submitted:", { rating, tags, comment });
                    setRatingState((prev) => ({ ...prev, visible: false }));
                    showToast("Thank you for your feedback!", "success");
                }}
            />
        </View>
    );
};

export default EmergencyScreen;
