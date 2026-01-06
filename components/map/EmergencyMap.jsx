import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { HOSPITALS } from '../../data/hospitals';

const EmergencyMap = ({ 
  onHospitalSelect, 
  selectedHospitalId, 
  showUserLocation = true,
  style 
}) => {
  const { isDarkMode } = useTheme();
  const mapRef = useRef(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserLocation(userCoords);
      
      // Animate to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(userCoords, 1000);
      }
    } catch (error) {
      console.error('Get location error:', error);
      // Fallback to default location (e.g., city center)
      setUserLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
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
      }, 1000);
    }
  };

  const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <Text style={[styles.loadingText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
          Loading map...
        </Text>
      </View>
    );
  }

  if (!locationPermission) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
          Location permission required to show nearby hospitals
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { borderColor: isDarkMode ? '#2a2a2a' : '#e5e7eb' },
      style
    ]}>
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
        {/* Hospital Markers */}
        {HOSPITALS.map((hospital) => (
          <Marker
            key={hospital.id}
            coordinate={hospital.coordinates}
            onPress={() => handleHospitalPress(hospital)}
            pinColor={selectedHospitalId === hospital.id ? COLORS.brandPrimary : COLORS.brandSecondary}
          >
            <View style={[
              styles.hospitalMarker,
              {
                backgroundColor: selectedHospitalId === hospital.id ? COLORS.brandPrimary : '#FFFFFF',
                borderColor: selectedHospitalId === hospital.id ? '#FFFFFF' : COLORS.brandPrimary,
                borderWidth: 2,
              }
            ]}>
              <Ionicons
                name="medical"
                size={20}
                color={selectedHospitalId === hospital.id ? '#FFFFFF' : COLORS.brandPrimary}
              />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  hospitalMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});

// Map styles - Clean outline style like Uber/Lyft/Bolt
// Light mode: Light background with subtle road outlines
const lightMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f8f9fa" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca3af" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f8f9fa" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#e5e7eb" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.neighborhood", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e8f5e9" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#e5e7eb" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#d1d5db" }] },
  { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#dbeafe" }] },
  { "featureType": "water", "elementType": "labels.text", "stylers": [{ "visibility": "off" }] },
];

// Dark mode: Dark background with subtle road outlines
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#6b7280" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#121212" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f1f1f" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.neighborhood", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#1a2e1a" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e1e1e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#2a2a2a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#1e1e1e" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#252525" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#333333" }] },
  { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#1a1a1a" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0a1929" }] },
  { "featureType": "water", "elementType": "labels.text", "stylers": [{ "visibility": "off" }] },
];

export default EmergencyMap;
