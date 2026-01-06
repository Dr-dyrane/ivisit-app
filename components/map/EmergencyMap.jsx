import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
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
    <View style={[styles.container, style]} >
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
        showsBuildings={true}
        showsTraffic={false}
        loadingEnabled={true}
        loadingIndicatorColor={COLORS.brandPrimary}
        loadingBackgroundColor={isDarkMode ? COLORS.bgDark : COLORS.bgLight}
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
                backgroundColor: selectedHospitalId === hospital.id ? COLORS.brandPrimary : COLORS.brandSecondary,
                borderColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
              }
            ]}>
              <Text style={styles.hospitalMarkerText}>🏥</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  hospitalMarkerText: {
    fontSize: 18,
  },
});

// Map styles for light and dark themes
const lightMapStyle = [];

const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#212121" }]
  }
];

export default EmergencyMap;
