import React, { useEffect, useRef, useState, useContext } from 'react';
import Constants from 'expo-constants';
import { View, StyleSheet } from 'react-native';
import { Image } from 'react-native';

const getGoogleMapsApiKey = () => {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const fromConfig = Constants?.expoConfig?.extra?.googleMapsApiKey?.trim?.();
  return fromEnv || fromConfig || null;
};

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

      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) {
        setError('Google Maps key is missing');
        return;
      }

      const existingScript = document.querySelector('script[data-google-maps-loader="ivisit"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsLoaded(true), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'ivisit';
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

const WebMapContext = React.createContext(null);

const getZoomForRegion = (region) => {
  const latitudeDelta = Number(region?.latitudeDelta);
  const longitudeDelta = Number(region?.longitudeDelta);
  const delta = Math.max(
    Number.isFinite(latitudeDelta) && latitudeDelta > 0 ? latitudeDelta : 0,
    Number.isFinite(longitudeDelta) && longitudeDelta > 0 ? longitudeDelta : 0
  );

  if (!delta) {
    return 16;
  }

  const zoom = Math.log2(360 / delta);
  return Math.max(3, Math.min(20, Math.round(zoom)));
};

// Web MapView Component
export const MapView = React.forwardRef(({
  children,
  style,
  initialRegion,
  onMapReady,
  onMapLoaded,
  onRegionChangeComplete,
  showsUserLocation = false,
  userInterfaceStyle = 'light',
  customMapStyle = null,
  scrollEnabled = true,
  zoomEnabled = true,
  pitchEnabled = false,
  rotateEnabled = false,
  showsCompass = false,
  showsZoomControls = undefined,
  ...props
}, ref) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const idleListenerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const { isLoaded, error } = GoogleMapsAPI();

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const mapOptions = {
      center: {
        lat: initialRegion?.latitude || 37.7749,
        lng: initialRegion?.longitude || -122.4194
      },
      zoom: getZoomForRegion(initialRegion),
      styles: customMapStyle || [],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: typeof showsZoomControls === 'boolean' ? showsZoomControls : zoomEnabled,
      rotateControl: rotateEnabled,
      scaleControl: false,
      draggable: scrollEnabled || zoomEnabled,
      scrollwheel: zoomEnabled,
      disableDoubleClickZoom: !zoomEnabled,
      keyboardShortcuts: scrollEnabled || zoomEnabled,
      gestureHandling: scrollEnabled || zoomEnabled ? 'greedy' : 'none',
      clickableIcons: false,
      backgroundColor: userInterfaceStyle === 'dark' ? '#0F131A' : '#F8FAFC'
    };

    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;
    setMapInstance(map);

    if (onMapReady) {
      onMapReady();
    }
    if (onMapLoaded) {
      onMapLoaded();
    }

    return () => {
      if (idleListenerRef.current) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
      if (mapInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
      mapInstanceRef.current = null;
      setMapInstance(null);
    };
  }, [isLoaded, onMapLoaded, onMapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    map.setOptions({
      styles: customMapStyle || [],
      zoomControl: typeof showsZoomControls === 'boolean' ? showsZoomControls : zoomEnabled,
      rotateControl: rotateEnabled,
      draggable: scrollEnabled || zoomEnabled,
      scrollwheel: zoomEnabled,
      disableDoubleClickZoom: !zoomEnabled,
      keyboardShortcuts: scrollEnabled || zoomEnabled,
      gestureHandling: scrollEnabled || zoomEnabled ? 'greedy' : 'none',
      backgroundColor: userInterfaceStyle === 'dark' ? '#0F131A' : '#F8FAFC',
    });

    if (initialRegion?.latitude && initialRegion?.longitude) {
      map.setCenter({
        lat: initialRegion.latitude,
        lng: initialRegion.longitude,
      });
      map.setZoom(getZoomForRegion(initialRegion));
    }
  }, [
    customMapStyle,
    initialRegion,
    rotateEnabled,
    scrollEnabled,
    showsZoomControls,
    userInterfaceStyle,
    zoomEnabled,
  ]);

  useEffect(() => {
    if (!mapInstanceRef.current) return undefined;
    const map = mapInstanceRef.current;

    if (idleListenerRef.current) {
      window.google.maps.event.removeListener(idleListenerRef.current);
      idleListenerRef.current = null;
    }

    if (onRegionChangeComplete) {
      idleListenerRef.current = mapInstanceRef.current.addListener('idle', () => {
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
      if (idleListenerRef.current) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
    };
  }, [onRegionChangeComplete]);

  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 300) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: region.latitude,
          lng: region.longitude
        });
        mapInstanceRef.current.setZoom(getZoomForRegion(region));
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
      <WebMapContext.Provider value={mapInstance}>
        {children}
      </WebMapContext.Provider>
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
  pinColor,
  image,
  title,
  ...props
}) => {
  const markerRef = useRef(null);
  const { isLoaded } = GoogleMapsAPI();
  const map = useContext(WebMapContext);

  useEffect(() => {
    if (!isLoaded || !map || !coordinate) return;

    const icon =
      image && window.google?.maps
        ? (() => {
            const asset = Image.resolveAssetSource(image);
            if (!asset?.uri) return undefined;
            return {
              url: asset.uri,
              scaledSize: new window.google.maps.Size(56, 56),
            };
          })()
        : pinColor
          ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: pinColor,
              fillOpacity: 1,
              strokeColor: pinColor,
              strokeWeight: 1,
            }
          : undefined;

    const marker = new window.google.maps.Marker({
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map,
      zIndex,
      title,
      icon,
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
  }, [coordinate, image, isLoaded, map, onPress, pinColor, props, title, zIndex]);

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
  const map = useContext(WebMapContext);

  useEffect(() => {
    if (!isLoaded || !map || !coordinates || coordinates.length < 2) return;

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
      map,
      ...props
    });

    return () => {
      polyline.setMap(null);
    };
  }, [coordinates, isLoaded, map, props, strokeColor, strokeWidth]);

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
