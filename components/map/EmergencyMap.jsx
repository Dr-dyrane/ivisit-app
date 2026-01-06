import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';

// Hospital names for generating nearby hospitals
const HOSPITAL_NAMES = [
  "City General Hospital",
  "St. Mary's Medical Center",
  "Metro Emergency Care",
  "University Hospital",
  "Community Health Center",
  "Regional Medical Center",
  "Sacred Heart Hospital",
  "Memorial Hospital",
];

// Generate hospitals near a location
const generateNearbyHospitals = (userLat, userLng, count = 6) => {
  const hospitals = [];
  const types = ['premium', 'standard'];
  const specialties = ['General Care', 'Emergency', 'Cardiology', 'Trauma', 'ICU', 'Pediatrics'];

  for (let i = 0; i < count; i++) {
    // Generate random offset (roughly 0.5-3km away)
    const latOffset = (Math.random() - 0.5) * 0.03;
    const lngOffset = (Math.random() - 0.5) * 0.03;

    const distance = Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 111; // km approx
    const eta = Math.ceil(distance * 3); // rough ETA in minutes

    hospitals.push({
      id: `nearby-${i}`,
      name: HOSPITAL_NAMES[i % HOSPITAL_NAMES.length],
      coordinates: {
        latitude: userLat + latOffset,
        longitude: userLng + lngOffset,
      },
      distance: `${distance.toFixed(1)} km`,
      eta: `${eta} mins`,
      rating: (4.0 + Math.random() * 0.9).toFixed(1),
      type: types[i % 2],
      ambulances: Math.floor(Math.random() * 4) + 1,
      availableBeds: Math.floor(Math.random() * 8) + 1,
      specialties: specialties.slice(0, Math.floor(Math.random() * 3) + 2),
      waitTime: `${Math.floor(Math.random() * 15) + 5} mins`,
      verified: Math.random() > 0.3,
      status: 'available',
    });
  }

  return hospitals.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
};

const EmergencyMap = ({
  hospitals: propHospitals,
  onHospitalSelect,
  onHospitalsGenerated,
  selectedHospitalId,
  showUserLocation = true,
  mode = 'emergency',
  style,
  // Ambulance tracking props (for active emergency)
  ambulanceLocation = null, // { latitude, longitude }
  showRoute = false,
  routeCoordinates = [], // Array of {latitude, longitude} for polyline
  eta = null, // "3 mins"
}) => {
  const { isDarkMode } = useTheme();
  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);

  // Use prop hospitals if provided, otherwise use generated nearby ones
  const hospitals = propHospitals && propHospitals.length > 0 ? propHospitals : nearbyHospitals;

  // Request location permissions and get user location
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'iVisit needs location access to show nearby hospitals and dispatch emergency services.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        setIsLoading(false);
        return;
      }

      setLocationPermission(true);
      await getCurrentLocation();
    } catch (error) {
      console.error('Location permission error:', error);
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setUserLocation(userCoords);

      // Generate nearby hospitals based on user location
      const generated = generateNearbyHospitals(userCoords.latitude, userCoords.longitude, 6);
      setNearbyHospitals(generated);

      // Notify parent of generated hospitals
      if (onHospitalsGenerated) {
        onHospitalsGenerated(generated);
      }
    } catch (error) {
      console.error('Get location error:', error);
      // Fallback to default location
      const fallbackCoords = {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setUserLocation(fallbackCoords);

      // Generate hospitals at fallback location
      const generated = generateNearbyHospitals(fallbackCoords.latitude, fallbackCoords.longitude, 6);
      setNearbyHospitals(generated);

      if (onHospitalsGenerated) {
        onHospitalsGenerated(generated);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHospitalPress = (hospital) => {
    if (onHospitalSelect) {
      onHospitalSelect(hospital);
    }

    // Animate to hospital location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: hospital.coordinates.latitude,
        longitude: hospital.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  // Fit map to show all hospitals when they change
  useEffect(() => {
    if (mapRef.current && hospitals.length > 0 && !isLoading && locationPermission) {
      // Small delay to ensure map is ready
      const timer = setTimeout(() => {
        const coordinates = hospitals.map(h => h.coordinates);

        // Add user location if available
        if (userLocation) {
          coordinates.push({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          });
        }

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [hospitals, isLoading, locationPermission]);

  const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

  if (isLoading) {
    return (
      <View style={[
        styles.container,
        styles.loadingContainer,
        {
          backgroundColor: isDarkMode ? '#121212' : '#f8f9fa',
          borderColor: isDarkMode ? '#2a2a2a' : '#e5e7eb',
        },
        style
      ]}>
        <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        <Text style={[
          styles.loadingText,
          { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }
        ]}>
          Finding nearby hospitals...
        </Text>
      </View>
    );
  }

  if (!locationPermission) {
    return (
      <View style={[
        styles.container,
        styles.errorContainer,
        {
          backgroundColor: isDarkMode ? '#121212' : '#f8f9fa',
          borderColor: isDarkMode ? '#2a2a2a' : '#e5e7eb',
        },
        style
      ]}>
        <Ionicons
          name="location-outline"
          size={48}
          color={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
          style={{ marginBottom: 16 }}
        />
        <Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
          Location permission required
        </Text>
        <Text style={[styles.errorSubtext, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>
          Enable location to see nearby hospitals
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={mapStyle}
        initialRegion={userLocation}
        showsUserLocation={showUserLocation && locationPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        loadingEnabled={true}
        loadingIndicatorColor={COLORS.brandPrimary}
        loadingBackgroundColor={isDarkMode ? COLORS.bgDark : COLORS.bgLight}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        {/* Route Polyline - Shows path from ambulance to user */}
        {showRoute && routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.brandPrimary}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}

        {/* Hospital Markers - Tiny and tight like Uber */}
        {hospitals.map((hospital) => {
          const isSelected = selectedHospitalId === hospital.id;
          return (
            <Marker
              key={hospital.id}
              coordinate={hospital.coordinates}
              onPress={() => handleHospitalPress(hospital)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[
                styles.hospitalMarker,
                isSelected && styles.hospitalMarkerSelected,
              ]}>
                <Ionicons
                  name="add"
                  size={isSelected ? 14 : 10}
                  color={isSelected ? '#FFFFFF' : COLORS.brandPrimary}
                />
              </View>
            </Marker>
          );
        })}

        {/* Ambulance Marker - Animated tracking */}
        {ambulanceLocation && (
          <Marker
            coordinate={ambulanceLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <View style={styles.ambulanceMarker}>
              <Fontisto name="ambulance" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* ETA Bubble - Shows next to user location */}
        {eta && userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude + 0.001,
              longitude: userLocation.longitude + 0.002,
            }}
            anchor={{ x: 0, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.etaBubble}>
              <Text style={styles.etaText}>{eta}</Text>
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  // Tiny, tight hospital markers like Uber
  hospitalMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  hospitalMarkerSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brandPrimary,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Ambulance marker - Uber-style car icon
  ambulanceMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  // ETA bubble - floating above user
  etaBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandPrimary,
  },
});

/**
 * Uber/Instacart-style Map Styles
 *
 * Design principles:
 * - Background matches app container (COLORS.bgLight / COLORS.bgDark)
 * - Roads shown as outlines only (fill matches bg, stroke visible)
 * - No POIs, transit, buildings, or labels
 * - Water subtle and minimal
 * - Just street grid for navigation context
 */

// Light mode: Pure white background matching COLORS.bgLight (#FFFFFF)
const lightMapStyle = [
  // Base geometry - match app light background
  { elementType: "geometry", stylers: [{ color: COLORS.bgLight }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: COLORS.textMuted }] },
  { elementType: "labels.text.stroke", stylers: [{ color: COLORS.bgLight }, { weight: 2 }] },

  // Hide all administrative elements except city names
  { featureType: "administrative", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", stylers: [{ visibility: "on" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: COLORS.textMuted }] },

  // Hide all POIs
  { featureType: "poi", stylers: [{ visibility: "off" }] },

  // Roads - outlined style (fill = background, stroke = visible outline)
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: COLORS.bgLight }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: COLORS.borderLight }, { weight: 1 }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: COLORS.bgLight }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d0d0d0" }, { weight: 1.5 }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: COLORS.bgLight }] },
  { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: COLORS.borderLight }, { weight: 1 }] },
  { featureType: "road.local", elementType: "geometry.fill", stylers: [{ color: COLORS.bgLight }] },
  { featureType: "road.local", elementType: "geometry.stroke", stylers: [{ color: "#e8e8e8" }, { weight: 0.5 }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Hide transit
  { featureType: "transit", stylers: [{ visibility: "off" }] },

  // Water - very subtle blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e8f4fd" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Landscape - same as background
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: COLORS.bgLight }] },
  { featureType: "landscape.man_made", stylers: [{ visibility: "off" }] },
];

// Dark mode: Deep dark background matching COLORS.bgDark (#0B0F1A)
const darkMapStyle = [
  // Base geometry - match app dark background
  { elementType: "geometry", stylers: [{ color: COLORS.bgDark }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: COLORS.textMutedDark }] },
  { elementType: "labels.text.stroke", stylers: [{ color: COLORS.bgDark }, { weight: 2 }] },

  // Hide all administrative elements except city names
  { featureType: "administrative", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", stylers: [{ visibility: "on" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: COLORS.textMutedDark }] },

  // Hide all POIs
  { featureType: "poi", stylers: [{ visibility: "off" }] },

  // Roads - outlined style (fill = dark bg, stroke = subtle lighter line)
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: COLORS.bgDark }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: COLORS.border }, { weight: 1 }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: COLORS.bgDark }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e2d3d" }, { weight: 1.5 }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: COLORS.bgDark }] },
  { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: COLORS.border }, { weight: 1 }] },
  { featureType: "road.local", elementType: "geometry.fill", stylers: [{ color: COLORS.bgDark }] },
  { featureType: "road.local", elementType: "geometry.stroke", stylers: [{ color: COLORS.bgDarkAlt }, { weight: 0.5 }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Hide transit
  { featureType: "transit", stylers: [{ visibility: "off" }] },

  // Water - very dark subtle blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1525" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Landscape - same as background
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: COLORS.bgDark }] },
  { featureType: "landscape.man_made", stylers: [{ visibility: "off" }] },
];

export default EmergencyMap;
