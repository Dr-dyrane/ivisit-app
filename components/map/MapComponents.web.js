import React, { useEffect, useRef, useState, useContext } from 'react';
import Constants from 'expo-constants';
import { View, StyleSheet } from 'react-native';
import { Image } from 'react-native';
import getViewportSurfaceMetrics from '../../utils/ui/viewportSurfaceMetrics';

let googleMapsLoadStatus =
  typeof window !== 'undefined' && window.google?.maps ? 'loaded' : 'idle';
let googleMapsLoadError = null;
let googleMapsLoadPromise = null;
const googleMapsSubscribers = new Set();

const getGoogleMapsSnapshot = () => ({
  isLoaded: googleMapsLoadStatus === 'loaded',
  error: googleMapsLoadError,
});

const notifyGoogleMapsSubscribers = () => {
  const snapshot = getGoogleMapsSnapshot();
  googleMapsSubscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (_error) {
      // Ignore subscriber failures.
    }
  });
};

const setGoogleMapsLoadState = (status, error = null) => {
  googleMapsLoadStatus = status;
  googleMapsLoadError = error;
  notifyGoogleMapsSubscribers();
};

const getResolvedGoogleMaps = () =>
  typeof window !== 'undefined' && window.google?.maps ? window.google.maps : null;

const getReadyGoogleMaps = async () => {
  const resolvedMaps = getResolvedGoogleMaps();
  if (!resolvedMaps) {
    return null;
  }

  if (typeof resolvedMaps.importLibrary === 'function') {
    try {
      const module = await resolvedMaps.importLibrary('maps');
      if (module?.Map) {
        return module;
      }
      console.warn('[MapComponents.web] importLibrary returned no Map constructor', module);
    } catch (err) {
      console.warn('[MapComponents.web] google.maps.importLibrary failed', err);
    }
  }

  return typeof resolvedMaps.Map === 'function' ? resolvedMaps : null;
};

const resolveMarkerImageAsset = (image) => {
  if (!image) return null;

  const resolveAssetSource =
    (typeof Image?.resolveAssetSource === 'function' && Image.resolveAssetSource) ||
    (typeof Image?.default?.resolveAssetSource === 'function' && Image.default.resolveAssetSource) ||
    null;

  try {
    if (resolveAssetSource) {
      const asset = resolveAssetSource(image);
      if (asset?.uri) {
        return asset;
      }
    }
  } catch (_error) {
    // Fall through to web-safe shape checks below.
  }

  if (typeof image === 'string') {
    return { uri: image };
  }

  if (image && typeof image === 'object' && typeof image.uri === 'string') {
    return image;
  }

  return null;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildResolvedMarkerIcon = ({
  asset,
  anchor,
  centerOffset,
  imageSize,
  googleMaps,
}) => {
  if (!asset?.uri || !googleMaps?.Size || !googleMaps?.Point) {
    return undefined;
  }

  const sourceWidth =
    toFiniteNumber(imageSize?.width) ||
    toFiniteNumber(asset.width) ||
    56;
  const sourceHeight =
    toFiniteNumber(imageSize?.height) ||
    toFiniteNumber(asset.height) ||
    56;
  const targetHeight = sourceHeight > 96 ? 72 : 56;
  const targetWidth = Math.max(
    20,
    Math.round((sourceWidth / Math.max(sourceHeight, 1)) * targetHeight)
  );

  const anchorXRatio = toFiniteNumber(anchor?.x);
  const anchorYRatio = toFiniteNumber(anchor?.y);
  const offsetX = toFiniteNumber(centerOffset?.x) || 0;
  const offsetY = toFiniteNumber(centerOffset?.y) || 0;

  const anchorPoint = new googleMaps.Point(
    Math.round((anchorXRatio ?? 0.5) * targetWidth - offsetX),
    Math.round((anchorYRatio ?? 1) * targetHeight - offsetY)
  );

  return {
    url: asset.uri,
    scaledSize: new googleMaps.Size(targetWidth, targetHeight),
    anchor: anchorPoint,
  };
};

const getGoogleMapsApiKey = () => {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const fromConfig = Constants?.expoConfig?.extra?.googleMapsApiKey?.trim?.();
  return fromEnv || fromConfig || null;
};

const getGoogleMapsMapId = () => {
  const fromEnv =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_MAP_ID?.trim();
  const fromConfig = Constants?.expoConfig?.extra?.googleMapsMapId?.trim?.();
  return fromEnv || fromConfig || null;
};

const ensureGoogleMapsLoaded = async () => {
  const existingMaps = getResolvedGoogleMaps();
  if (existingMaps) {
    const readyMaps = await getReadyGoogleMaps();
    if (readyMaps) {
      setGoogleMapsLoadState('loaded', null);
      return readyMaps;
    }
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    const message = 'Google Maps key is missing';
    setGoogleMapsLoadState('error', message);
    return Promise.reject(new Error(message));
  }

  setGoogleMapsLoadState('loading', null);

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    let pollId = null;
    let timeoutId = null;
    let activeScript = null;

    const cleanup = () => {
      if (pollId) {
        window.clearInterval(pollId);
        pollId = null;
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (activeScript) {
        activeScript.removeEventListener('error', handleError);
      }
    };

    const finishLoaded = (maps) => {
      if (settled) return;
      if (!maps) return;
      settled = true;
      cleanup();
      googleMapsLoadPromise = Promise.resolve(maps);
      setGoogleMapsLoadState('loaded', null);
      if (typeof window !== 'undefined' && window.initGoogleMaps) {
        delete window.initGoogleMaps;
      }
      resolve(maps);
    };

    const finishError = (message) => {
      if (settled) return;
      settled = true;
      cleanup();
      googleMapsLoadPromise = null;
      setGoogleMapsLoadState('error', message);
      if (typeof window !== 'undefined' && window.initGoogleMaps) {
        delete window.initGoogleMaps;
      }
      reject(new Error(message));
    };

    function handleError() {
      finishError('Failed to load Google Maps');
    }

    const existingScript = document.querySelector('script[data-google-maps-loader="ivisit"]');
    activeScript = existingScript || document.createElement('script');

    const tryFinishLoaded = async () => {
      const maps = await getReadyGoogleMaps();
      if (!maps) return;
      finishLoaded(maps);
    };

    window.initGoogleMaps = tryFinishLoaded;

    activeScript.addEventListener('error', handleError);

    if (!existingScript) {
      activeScript.async = true;
      activeScript.defer = true;
      activeScript.dataset.googleMapsLoader = 'ivisit';
      activeScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,routes&callback=initGoogleMaps&loading=async`;
      document.head.appendChild(activeScript);
    }

    pollId = window.setInterval(() => {
      tryFinishLoaded();
    }, 120);

    timeoutId = window.setTimeout(() => {
      if (getResolvedGoogleMaps()) {
        finishLoaded();
        return;
      }
      finishError('Timed out loading Google Maps');
    }, 12000);
  });

  return googleMapsLoadPromise;
};

// Google Maps Web Implementation
const GoogleMapsAPI = () => {
  const [state, setState] = useState(getGoogleMapsSnapshot);

  useEffect(() => {
    const listener = (nextState) => {
      setState(nextState);
    };

    googleMapsSubscribers.add(listener);
    listener(getGoogleMapsSnapshot());
    ensureGoogleMapsLoaded().catch(() => {});

    return () => {
      googleMapsSubscribers.delete(listener);
    };
  }, []);

  return state;
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

const getGoogleMapsModule = async () => {
  if (typeof window === 'undefined' || !window.google?.maps) {
    return null;
  }

  if (typeof window.google.maps.importLibrary === 'function') {
    try {
      return await window.google.maps.importLibrary('maps');
    } catch (err) {
      console.warn('[MapComponents.web] google.maps.importLibrary failed, falling back to window.google.maps', err);
      return window.google.maps;
    }
  }

  return window.google.maps;
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
  provider,
  googleRenderer,
  mapType,
  showsMyLocationButton,
  showsScale,
  showsBuildings,
  showsTraffic,
  showsIndoors,
  loadingEnabled,
  loadingIndicatorColor,
  loadingBackgroundColor,
  mapPadding,
  toolbarEnabled,
  onPanDrag,
  showsPointsOfInterest,
  ...props
}, ref) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const idleListenerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const appliedRegionRef = useRef(null);
  const initialRegionAppliedRef = useRef(false);
  const onMapReadyRef = useRef(onMapReady);
  const onMapLoadedRef = useRef(onMapLoaded);
  const [mapInstance, setMapInstance] = useState(null);
  const { isLoaded, error } = GoogleMapsAPI();

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
    onMapLoadedRef.current = onMapLoaded;
  }, [onMapLoaded, onMapReady]);

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

    const googleMapsMapId = getGoogleMapsMapId();
    if (googleMapsMapId) {
      mapOptions.mapId = googleMapsMapId;
    }

    let isMounted = true;

    const initializeMap = async () => {
      const maps = await getGoogleMapsModule();
      if (!isMounted || !maps || !mapRef.current) return;

      const MapClass = maps.Map;
      if (typeof MapClass !== 'function') {
        console.error('[MapComponents.web] Google Maps library loaded but Map constructor is unavailable', maps);
        return;
      }

      const map = new MapClass(mapRef.current, mapOptions);
      mapInstanceRef.current = map;
      setMapInstance(map);

      onMapReadyRef.current?.();
      onMapLoadedRef.current?.();
    };

    initializeMap();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (idleListenerRef.current) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
      if (mapInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
      mapInstanceRef.current = null;
      appliedRegionRef.current = null;
      initialRegionAppliedRef.current = false;
      setMapInstance(null);
    };
  }, [isLoaded]);

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

    const nextRegion =
      !initialRegionAppliedRef.current &&
      initialRegion?.latitude &&
      initialRegion?.longitude
        ? {
            latitude: Number(initialRegion.latitude),
            longitude: Number(initialRegion.longitude),
            latitudeDelta: Number(initialRegion.latitudeDelta) || 0,
            longitudeDelta: Number(initialRegion.longitudeDelta) || 0,
          }
        : null;

    if (nextRegion) {
      map.setCenter({
        lat: nextRegion.latitude,
        lng: nextRegion.longitude,
      });
      map.setZoom(getZoomForRegion(nextRegion));
      appliedRegionRef.current = nextRegion;
      initialRegionAppliedRef.current = true;
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
    if (!mapInstanceRef.current || !mapRef.current || typeof ResizeObserver !== 'function') {
      return undefined;
    }

    const map = mapInstanceRef.current;
    const element = mapRef.current;
    let frameId = null;

    const observer = new ResizeObserver(() => {
      if (!mapInstanceRef.current) return;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        window.google?.maps?.event?.trigger?.(map, 'resize');
        if (center) {
          map.setCenter(center);
        }
        if (typeof zoom === 'number') {
          map.setZoom(zoom);
        }
      });
    });

    observer.observe(element);
    resizeObserverRef.current = observer;

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();
      if (resizeObserverRef.current === observer) {
        resizeObserverRef.current = null;
      }
    };
  }, [mapInstance]);

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
    panToCoordinate: (coordinate) => {
      if (mapInstanceRef.current && coordinate) {
        mapInstanceRef.current.panTo({
          lat: coordinate.latitude,
          lng: coordinate.longitude,
        });
      }
    },
    panByPixels: (x = 0, y = 0) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panBy(Number(x) || 0, Number(y) || 0);
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
const buildMarkerContent = ({
  pinColor,
  resolvedMarkerAsset,
  imageSize,
  labelText,
  markerVariant,
  labelTone,
  selected,
}) => {
  if (typeof document === 'undefined') return null;
  const viewportMetrics = getViewportSurfaceMetrics({
    width: window.innerWidth || 1280,
    height: window.innerHeight || 800,
    platform: 'web',
    presentationMode: 'sheet',
  });
  const markerMetrics = viewportMetrics.map.marker;

  if (markerVariant === 'user') {
    const resolvedPinColor = pinColor || '#5294FF';
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = `${markerMetrics.userHaloSize}px`;
    wrapper.style.height = `${markerMetrics.userHaloSize}px`;
    wrapper.style.transform = 'translate(-50%, -50%)';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    const halo = document.createElement('div');
    halo.style.position = 'absolute';
    halo.style.width = `${markerMetrics.userHaloSize - 6}px`;
    halo.style.height = `${markerMetrics.userHaloSize - 6}px`;
    halo.style.borderRadius = '50%';
    halo.style.background = 'rgba(82,148,255,0.20)';
    halo.style.border = '1px solid rgba(255,255,255,0.56)';
    halo.style.boxShadow = '0 10px 22px rgba(7,12,22,0.34)';

    const ring = document.createElement('div');
    ring.style.width = `${markerMetrics.userRingSize}px`;
    ring.style.height = `${markerMetrics.userRingSize}px`;
    ring.style.borderRadius = '50%';
    ring.style.background = '#FFFFFF';
    ring.style.display = 'flex';
    ring.style.alignItems = 'center';
    ring.style.justifyContent = 'center';

    const core = document.createElement('div');
    core.style.width = `${markerMetrics.userCoreSize}px`;
    core.style.height = `${markerMetrics.userCoreSize}px`;
    core.style.borderRadius = '50%';
    core.style.background = resolvedPinColor;
    core.style.display = 'flex';
    core.style.alignItems = 'center';
    core.style.justifyContent = 'center';

    const innerDot = document.createElement('div');
    innerDot.style.width = '5px';
    innerDot.style.height = '5px';
    innerDot.style.borderRadius = '50%';
    innerDot.style.background = '#184FC9';

    wrapper.appendChild(halo);
    core.appendChild(innerDot);
    ring.appendChild(core);
    wrapper.appendChild(ring);
    return wrapper;
  }

  if (labelText) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.transform = 'translate(-50%, -100%)';

    const label = document.createElement('div');
    label.textContent = labelText;
    label.style.maxWidth = `${selected ? markerMetrics.labelMaxWidth : Math.max(128, markerMetrics.labelMaxWidth - 28)}px`;
    label.style.padding = selected ? '7px 12px' : '5px 10px';
    label.style.borderRadius = '999px';
    label.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    label.style.fontSize = selected ? '14px' : '12px';
    label.style.fontWeight = selected ? '700' : '500';
    label.style.lineHeight = '1.1';
    label.style.whiteSpace = 'nowrap';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.marginBottom = '8px';
    label.style.color =
      labelTone === 'subdued'
        ? '#E2E8F0'
        : selected
          ? '#FFF7F7'
          : '#F8FAFC';
    label.style.background =
      labelTone === 'subdued'
        ? 'rgba(15,23,42,0.72)'
        : selected
          ? 'rgba(134,16,14,0.92)'
          : 'rgba(15,23,42,0.82)';
    label.style.boxShadow = selected
      ? '0 14px 32px rgba(134,16,14,0.28)'
      : '0 10px 24px rgba(2,6,23,0.22)';
    label.style.border = '1px solid rgba(255,255,255,0.1)';

    const pin = document.createElement('div');
    pin.style.width = `${selected ? markerMetrics.pinSize : Math.max(20, markerMetrics.pinSize - 6)}px`;
    pin.style.height = `${selected ? markerMetrics.pinSize : Math.max(20, markerMetrics.pinSize - 6)}px`;
    pin.style.borderRadius = '50%';
    pin.style.display = 'flex';
    pin.style.alignItems = 'center';
    pin.style.justifyContent = 'center';
    pin.style.background =
      labelTone === 'subdued'
        ? 'rgba(30,41,59,0.96)'
        : selected
          ? '#B91C1C'
          : '#475569';
    pin.style.border = '2px solid rgba(255,255,255,0.88)';
    pin.style.boxShadow = '0 8px 20px rgba(15,23,42,0.28)';

    const glyph = document.createElement('span');
    glyph.textContent = '+';
    glyph.style.color = '#FFFFFF';
    glyph.style.fontSize = selected ? '15px' : '13px';
    glyph.style.fontWeight = '700';
    glyph.style.transform = 'translateY(-1px)';

    pin.appendChild(glyph);
    wrapper.appendChild(label);
    wrapper.appendChild(pin);
    return wrapper;
  }

  if (resolvedMarkerAsset?.uri) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.width = `${toFiniteNumber(imageSize?.width) || 48}px`;
    wrapper.style.height = `${toFiniteNumber(imageSize?.height) || 48}px`;
    wrapper.style.transform = 'translate(-50%, -100%)';

    const img = document.createElement('img');
    img.src = resolvedMarkerAsset.uri;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.display = 'block';

    wrapper.appendChild(img);
    return wrapper;
  }

  if (pinColor) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = `${Math.max(markerMetrics.pinSize + 4, 28)}px`;
    wrapper.style.height = `${Math.max(markerMetrics.pinSize + 4, 28)}px`;
    wrapper.style.transform = 'translate(-50%, -50%)';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';

    const halo = document.createElement('div');
    halo.style.position = 'absolute';
    halo.style.width = `${Math.max(markerMetrics.pinSize - 2, 20)}px`;
    halo.style.height = `${Math.max(markerMetrics.pinSize - 2, 20)}px`;
    halo.style.borderRadius = '50%';
    halo.style.backgroundColor =
      pinColor === '#3B82F6' ? 'rgba(59,130,246,0.22)' : `${pinColor}26`;
    halo.style.border = '1px solid rgba(255,255,255,0.5)';
    halo.style.boxSizing = 'border-box';

    const dot = document.createElement('div');
    dot.style.width = `${Math.max(markerMetrics.pinSize - 14, 10)}px`;
    dot.style.height = `${Math.max(markerMetrics.pinSize - 14, 10)}px`;
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = pinColor;
    dot.style.border = '2px solid white';
    dot.style.boxSizing = 'border-box';

    wrapper.appendChild(halo);
    wrapper.appendChild(dot);
    return wrapper;
  }

  return null;
};

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
  anchor,
  centerOffset,
  imageSize,
  labelText,
  markerVariant,
  labelTone,
  selected = false,
  ...props
}) => {
  const markerRef = useRef(null);
  const { isLoaded } = GoogleMapsAPI();
  const map = useContext(WebMapContext);

  useEffect(() => {
    if (!isLoaded || !map || !coordinate) return;

    const resolvedMarkerAsset =
      image && window.google?.maps ? resolveMarkerImageAsset(image) : null;
    const icon = resolvedMarkerAsset?.uri
        ? buildResolvedMarkerIcon({
          asset: resolvedMarkerAsset,
          anchor,
          centerOffset,
          imageSize,
          googleMaps: window.google.maps,
        })
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

    const googleMapsMapId = getGoogleMapsMapId();
    const advancedMarkerAvailable =
      window.google?.maps?.marker?.AdvancedMarkerElement &&
      Boolean(googleMapsMapId);
    const markerContent = buildMarkerContent({
      pinColor,
      resolvedMarkerAsset,
      imageSize,
      labelText,
      markerVariant,
      labelTone,
      selected,
    });

    const markerOptions = {
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map,
      zIndex,
      title,
      ...props,
    };

    const marker = advancedMarkerAvailable
      ? new window.google.maps.marker.AdvancedMarkerElement({
          ...markerOptions,
          content: markerContent || undefined,
        })
      : new window.google.maps.Marker({
          ...markerOptions,
          icon,
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
  }, [anchor, centerOffset, coordinate, image, imageSize, isLoaded, labelText, labelTone, map, markerVariant, onPress, pinColor, props, selected, title, zIndex]);

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
