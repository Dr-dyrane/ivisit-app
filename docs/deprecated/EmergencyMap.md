# Deprecated: EmergencyMap (Legacy Component)

This file archives the old `EmergencyMap` component that was previously used before `FullScreenEmergencyMap` became the active implementation.

- Status: Deprecated (not imported anywhere)
- Original path: `components/map/EmergencyMap.jsx`
- Replacement: `components/map/FullScreenEmergencyMap.jsx`
- Reason: Preserve legacy logic for reference while keeping codebase clean

## Original Source (verbatim)

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { HOSPITALS } from '../../data/hospitals';

/**
 * Generate hospitals near user location using real hospital data
 * Uses HOSPITALS from data/hospitals.js with randomized coordinates
 * relative to user's current position
 */
const generateNearbyHospitals = (userLat, userLng, count = 6) => {
  // Shuffle and take up to 'count' hospitals from real data
  const shuffled = [...HOSPITALS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, HOSPITALS.length));

  const generated = selected.map((hospital) => {
    // Randomize coordinates around user location (within ~1.5km radius)
    const latOffset = (Math.random() - 0.5) * 0.03;
    const lngOffset = (Math.random() - 0.5) * 0.03;

    // Calculate actual distance and ETA from offsets
    const distanceKm = Math.sqrt(latOffset ** 2 + lngOffset ** 2) * 111;
    const etaMins = Math.max(2, Math.ceil(distanceKm * 3));

    return {
      ...hospital, // Spread all real hospital data (name, image, features, beds, specialties, etc.)
      id: `nearby-${hospital.id}`, // Unique ID for this session
      coordinates: {
        latitude: userLat + latOffset,
        longitude: userLng + lngOffset,
      },
      // Override distance/ETA with calculated values
      distance: `${distanceKm.toFixed(1)} km`,
      eta: `${etaMins} mins`,
      // Keep original availableBeds from hospital data for bed booking
      // Only randomize if not present in source data
      availableBeds: hospital.availableBeds ?? Math.floor(Math.random() * 8) + 1,
      waitTime: hospital.waitTime ?? `${Math.floor(Math.random() * 15) + 5} mins`,
      ambulances: hospital.ambulances ?? Math.floor(Math.random() * 4) + 1,
      status: hospital.status ?? (Math.random() > 0.2 ? "available" : "busy"),
    };
  });

  // Sort by distance (closest first)
  return generated.sort(
    (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
  );
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
        latitudeDelta: 0.06, // Zoom out to show ~6-7km radius
        longitudeDelta: 0.06,
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
      // Fallback to default location (San Francisco)
      const fallbackCoords = {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
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
    <View style={[styles.container, { backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight }, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        initialRegion={userLocation}
        showsUserLocation={showUserLocation && locationPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={true}
        showsPointsOfInterest={true}
        loadingEnabled={true}
        loadingIndicatorColor={COLORS.brandPrimary}
        loadingBackgroundColor={isDarkMode ? COLORS.bgDark : COLORS.bgLight}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
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
 * Clean map styles - show hospitals (POI medical), roads, and key landmarks
 * Styled to match app theme while remaining functional
 */

// Light mode: Clean white with visible roads and hospitals
const lightMapStyle = [
  // Base styling
  { elementType: "geometry", stylers: [{ color: "#F8F9FA" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5F6368" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 3 }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  // Administrative - show locality names
  { featureType: "administrative", stylers: [{ visibility: "simplified" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },

  // POI - Show medical/hospitals, hide others
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "on" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#FCE4EC" }] },
  { featureType: "poi.medical", elementType: "labels.text.fill", stylers: [{ color: "#C62828" }] },
  { featureType: "poi.medical", elementType: "labels.icon", stylers: [{ visibility: "on" }] },

  // Roads - clean styling
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E0E0E0" }, { weight: 1 }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9E9E9E" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#BDBDBD" }, { weight: 2 }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Transit - hide
  { featureType: "transit", stylers: [{ visibility: "off" }] },

  // Water - subtle blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#E3F2FD" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Landscape
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F5F5F5" }] },
  { featureType: "landscape.man_made", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
];

// Dark mode: Deep dark with visible roads and hospitals
const darkMapStyle = [
  // Base styling
  { elementType: "geometry", stylers: [{ color: "#0D1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8B949E" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D1117" }, { weight: 3 }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },

  // Administrative - show locality names
  { featureType: "administrative", stylers: [{ visibility: "simplified" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#6E7681" }] },

  // POI - Show medical/hospitals, hide others
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "on" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#2D1F1F" }] },
  { featureType: "poi.medical", elementType: "labels.text.fill", stylers: [{ color: "#EF5350" }] },
  { featureType: "poi.medical", elementType: "labels.icon", stylers: [{ visibility: "on" }] },

  // Roads - subtle but visible
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#161B22" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#21262D" }, { weight: 1 }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#484F58" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#1C2128" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#30363D" }, { weight: 2 }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#161B22" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Transit - hide
  { featureType: "transit", stylers: [{ visibility: "off" }] },

  // Water - dark blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A0E14" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },

  // Landscape
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0D1117" }] },
  { featureType: "landscape.man_made", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#121826" }] },
];

export default EmergencyMap;
```

