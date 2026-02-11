import { forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { COLORS } from "../../constants/colors";
import { useEmergencyMapLogic } from "../../hooks/emergency/useEmergencyMapLogic";
import { MapView, PROVIDER_GOOGLE } from "./MapComponents";

import HospitalMarkers from "./HospitalMarkers";
import RouteLayer from "./RouteLayer";
import MapControls from "./MapControls";
import MapErrorBoundary from "./MapErrorBoundary";
import LocationPermissionError from "./LocationPermissionError";
import MapStatusBar from "./MapStatusBar";

/**
 * FullScreenEmergencyMap - Apple/Google Style Map Component
 * Optimized for performance and modularity.
 */
const FullScreenEmergencyMap = forwardRef((props, ref) => {
    const { state, actions } = useEmergencyMapLogic(props);
    const {
        mapRef,
        isZoomedOut,
        isMapReadyState,
        locationPermission,
        isLoadingLocation,
        initialRegion,
        mapPadding,
        mapStyle,
        hospitals,
        routeCoordinates,
        ambulanceCoordinate,
        ambulanceHeading,
        shouldShowControls,
        shouldShowHospitalLabels,
        insets,
        isDarkMode,
    } = state;

    const {
        handleRegionChangeComplete,
        handleMapReady,
        handlePanDrag,
        handleRecenter,
        requestLocationPermission,
        getExposedMethods,
    } = actions;

    // Expose methods to parent
    useImperativeHandle(ref, getExposedMethods);

    // 1. Loading State
    if (isLoadingLocation && !isMapReadyState) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
                <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            </View>
        );
    }

    // 2. Permission Error State
    if (!isLoadingLocation && !locationPermission) {
        return (
            <LocationPermissionError
                isDarkMode={isDarkMode}
                onRequestPermission={requestLocationPermission}
            />
        );
    }

    // 3. Main Map Render
    return (
        <View style={styles.container}>
            <MapErrorBoundary onReset={() => actions.setIsMapReadyState(false)}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                    customMapStyle={mapStyle}
                    initialRegion={initialRegion}
                    showsUserLocation={locationPermission}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    showsScale={false}
                    showsBuildings={true}
                    showsTraffic={false}
                    showsIndoors={true}
                    loadingEnabled={true}
                    loadingIndicatorColor={COLORS.brandPrimary}
                    loadingBackgroundColor={isDarkMode ? "#0B0F1A" : "#F8FAFC"}
                    mapPadding={mapPadding}
                    userInterfaceStyle={isDarkMode ? "dark" : "light"}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    onMapReady={handleMapReady}
                    onPanDrag={handlePanDrag}
                    showsZoomControls={false}
                    showsPointsOfInterest={false}
                >
                    <RouteLayer
                        routeCoordinates={routeCoordinates}
                        ambulanceCoordinate={ambulanceCoordinate}
                        ambulanceHeading={ambulanceHeading}
                        animateAmbulance={props.animateAmbulance}
                    />

                    <HospitalMarkers
                        hospitals={hospitals}
                        selectedHospitalId={props.selectedHospitalId}
                        onHospitalPress={props.onHospitalSelect}
                        shouldShowHospitalLabels={shouldShowHospitalLabels}
                        isDarkMode={isDarkMode}
                    />
                </MapView>
            </MapErrorBoundary>

            <MapStatusBar isDarkMode={isDarkMode} insets={insets} />

            {shouldShowControls && (
                <MapControls
                    onRecenter={handleRecenter}
                    onExpand={() => getExposedMethods().fitToAllHospitals()}
                    isZoomedOut={isZoomedOut}
                    isDarkMode={isDarkMode}
                    topOffset={insets.top + 200}
                />
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
});

FullScreenEmergencyMap.displayName = "FullScreenEmergencyMap";

export default FullScreenEmergencyMap;
