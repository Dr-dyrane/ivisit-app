import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

// Google Maps Web Implementation
const GoogleMapsAPI = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load Google Maps API script
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;

      // Use environment variable for Google Maps API key
      const apiKey = 'AIzaSyCdXlyL3bUR-lFN_G5L5zdaIiNbRiCEp9A' || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;

      window.initGoogleMaps = () => {
        setIsLoaded(true);
        delete window.initGoogleMaps;
      };

      script.onerror = () => {
        setError('Failed to load Google Maps');
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  return { isLoaded, error };
};

// Web MapView Component
export const MapView = React.forwardRef(({
  children,
  style,
  initialRegion,
  onMapReady,
  onRegionChangeComplete,
  showsUserLocation = false,
  userInterfaceStyle = 'light',
  customMapStyle = null,
  ...props
}, ref) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const { isLoaded, error } = GoogleMapsAPI();

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Initialize Google Map
    const mapOptions = {
      center: {
        lat: initialRegion?.latitude || 37.7749,
        lng: initialRegion?.longitude || -122.4194
      },
      zoom: 12,
      styles: customMapStyle || [],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
      backgroundColor: userInterfaceStyle === 'dark' ? '#1a1a1a' : '#f8f9fa'
    };

    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    if (onMapReady) {
      onMapReady();
    }

    // Handle map events
    if (onRegionChangeComplete) {
      map.addListener('idle', () => {
        const center = map.getCenter();
        const bounds = map.getBounds();

        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();

          onRegionChangeComplete({
            latitude: center.lat(),
            longitude: center.lng(),
            latitudeDelta: ne.lat() - sw.lat(),
            longitudeDelta: ne.lng() - sw.lng(),
          });
        }
      });
    }

    return () => {
      // Cleanup map instance
      if (mapInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, [isLoaded, initialRegion, onMapReady, onRegionChangeComplete, userInterfaceStyle, customMapStyle]);

  // Expose map methods via ref
  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 300) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: region.latitude,
          lng: region.longitude
        });
      }
    },
    fitToCoordinates: (coordinates, options) => {
      if (mapInstanceRef.current && coordinates.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        coordinates.forEach(coord => {
          bounds.extend({ lat: coord.latitude, lng: coord.longitude });
        });
        mapInstanceRef.current.fitBounds(bounds, options?.edgePadding);
      }
    },
    getMapBoundaries: async () => {
      if (mapInstanceRef.current) {
        const bounds = mapInstanceRef.current.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          return {
            northEast: { latitude: ne.lat(), longitude: ne.lng() },
            southWest: { latitude: sw.lat(), longitude: sw.lng() }
          };
        }
      }
      return null;
    }
  }));

  if (error) {
    return (
      <View style={[style, styles.errorContainer]}>
        <div style={styles.errorText}>Map unavailable: {error}</div>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={[style, styles.loadingContainer]}>
        <div style={styles.loadingText}>Loading map...</div>
      </View>
    );
  }

  return (
    <View style={style}>
      <div
        ref={mapRef}
        style={styles.mapContainer}
        {...props}
      />
      {children}
    </View>
  );
});

// Web Marker Component
export const Marker = ({
  coordinate,
  onPress,
  children,
  style,
  tracksViewChanges = false,
  zIndex = 1,
  ...props
}) => {
  const markerRef = useRef(null);
  const { isLoaded } = GoogleMapsAPI();

  useEffect(() => {
    if (!isLoaded || !coordinate) return;

    const marker = new window.google.maps.Marker({
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map: markerRef.current?.map,
      zIndex,
      ...props
    });

    if (onPress) {
      marker.addListener('click', onPress);
    }

    markerRef.current = { marker };

    return () => {
      if (markerRef.current?.marker) {
        markerRef.current.marker.setMap(null);
      }
    };
  }, [isLoaded, coordinate, onPress, zIndex]);

  // This is a simplified version - in a real implementation you'd need
  // to handle custom markers and children properly
  return null;
};

// Web Polyline Component
export const Polyline = ({
  coordinates,
  strokeColor = '#000000',
  strokeWidth = 2,
  ...props
}) => {
  const { isLoaded } = GoogleMapsAPI();

  useEffect(() => {
    if (!isLoaded || !coordinates || coordinates.length < 2) return;

    const path = coordinates.map(coord => ({
      lat: coord.latitude,
      lng: coord.longitude
    }));

    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity: 1.0,
      strokeWeight: strokeWidth,
      ...props
    });

    // This is a simplified approach - you'd need to get the map instance
    // polyline.setMap(mapInstance);

    return () => {
      polyline.setMap(null);
    };
  }, [isLoaded, coordinates, strokeColor, strokeWidth]);

  return null;
};

export const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'system-ui',
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    fontFamily: 'system-ui',
    textAlign: 'center',
    padding: 20,
  },
});
