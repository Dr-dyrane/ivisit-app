import {
	useImperativeHandle,
	forwardRef,
} from "react";
import {
	View,
	Text,
	ActivityIndicator,
	Pressable,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COLORS } from "../../constants/colors";
import { darkMapStyle, lightMapStyle } from "./mapStyles";
import { MapView, PROVIDER_GOOGLE } from "./MapComponents";

import HospitalMarkers from "./HospitalMarkers";
import RouteLayer from "./RouteLayer";
import MapControls from "./MapControls";
import MapErrorBoundary from "./MapErrorBoundary";
import { styles } from "./FullScreenEmergencyMap.styles";
import { useFullScreenEmergencyMapLogic } from "../../hooks/map/useFullScreenEmergencyMapLogic";

/**
 * FullScreenEmergencyMap - Apple/Google Style Map Component
 * Optimized for performance and modularity.
 */
const FullScreenEmergencyMap = forwardRef((props, ref) => {
	const { state, actions } = useFullScreenEmergencyMapLogic(props);
	
    const {
        isDarkMode,
        insets,
        isZoomedOut,
        isMapReadyState,
        locationPermission,
        isLoadingLocation,
        locationError,
        initialRegion,
        hospitals,
        routeHospitalIdResolved,
        shouldShowControls,
        shouldShowHospitalLabels,
        mapPadding,
        routeCoordinates,
        ambulanceCoordinate,
        ambulanceHeading,
        mapRef,
        selectedHospitalId
    } = state;

    const {
        handleRecenter,
        handleRegionChangeComplete,
        requestLocationPermission,
        setIsMapReadyState,
        animateToHospital,
        fitToAllHospitals,
        handleMapReady,
        handlePanDrag
    } = actions;

    const {
        onHospitalSelect,
        animateAmbulance = false,
    } = props;

	useImperativeHandle(ref, () => ({
		animateToHospital,
		fitToAllHospitals,
	}));

	if (isLoadingLocation) {
		return (
			<View style={[styles.container, styles.loadingContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
				<ActivityIndicator size="large" color={COLORS.brandPrimary} />
				<Text style={[styles.loadingText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>Finding nearby hospitals...</Text>
			</View>
		);
	}

	if (locationError) {
		return (
			<View style={[styles.container, styles.errorContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
				<Ionicons name="warning-outline" size={48} color={COLORS.errorRed} />
				<Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>Location Error</Text>
				<Text style={[styles.errorSubtext, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>{locationError}</Text>
				<Pressable 
					style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
					onPress={() => requestLocationPermission()}
				>
					<Text style={styles.retryButtonText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	if (!locationPermission) {
		return (
			<View style={[styles.container, styles.errorContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
				<Ionicons name="location-outline" size={48} color={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted} />
				<Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>Location permission required</Text>
				<Text style={[styles.errorSubtext, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>Enable location to see nearby hospitals</Text>
				<Pressable 
					style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
					onPress={() => requestLocationPermission()}
				>
					<Text style={styles.retryButtonText}>Enable Location</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<MapErrorBoundary onReset={() => setIsMapReadyState(false)}>
				<MapView
					ref={mapRef}
					style={styles.map}
					provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
					customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
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
						animateAmbulance={animateAmbulance}
					/>

					<HospitalMarkers
						hospitals={hospitals}
						selectedHospitalId={selectedHospitalId}
						onHospitalPress={onHospitalSelect}
						shouldShowHospitalLabels={shouldShowHospitalLabels}
						isDarkMode={isDarkMode}
					/>
				</MapView>
			</MapErrorBoundary>

			{Platform.OS === "ios" ? (
				<BlurView
					intensity={isDarkMode ? 60 : 40}
					tint={isDarkMode ? "dark" : "light"}
					style={[styles.statusBarBlur, { height: insets.top, opacity: 0.5 }]}
				/>
			) : (
				<View
					style={[
						styles.statusBarBlur, 
						{ 
							height: insets.top, 
							opacity: 0.5,
							backgroundColor: isDarkMode 
								? 'rgba(0,0,0,0.6)'
								: 'rgba(255,255,255,0.6)'
						}
					]}
				/>
			)}

			{shouldShowControls && (
				<MapControls
					onRecenter={handleRecenter}
					onExpand={() => { ref.current?.fitToAllHospitals?.(); }}
					isZoomedOut={isZoomedOut}
					isDarkMode={isDarkMode}
					topOffset={insets.top + 200}
				/>
			)}
		</View>
	);
});

FullScreenEmergencyMap.displayName = "FullScreenEmergencyMap";

export default FullScreenEmergencyMap;
