/**
 * hooks/emergency/useEmergencyMapLogic.js
 * 
 * Logic hook for FullScreenEmergencyMap.
 * Handles map state, region calculations, animations, and imperative handles.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useMapLocation } from "./useMapLocation";
import { useMapRoute } from "./useMapRoute";
import { useAmbulanceAnimation } from "./useAmbulanceAnimation";
import { isValidCoordinate } from "../../utils/mapUtils";
import { darkMapStyle, lightMapStyle } from "../../components/emergency/mapStyles";
import { useMapCameraLogic } from "../map/useMapCameraLogic";
import { useMapStartupLogic } from "../map/useMapStartupLogic";

const DEFAULT_APP_LOAD_DELTAS = { latitudeDelta: 0.04, longitudeDelta: 0.04 };
const ROUTE_ZOOM_FACTOR = 0.2;

export function useEmergencyMapLogic({
    hospitals: propHospitals,
    onHospitalSelect,
    onMapReady,
    selectedHospitalId,
    routeHospitalId = null,
    animateAmbulance = false,
    ambulanceTripEtaSeconds = null,
    bottomPadding = 0,
    responderLocation,
    responderHeading,
    sheetSnapIndex = 1,
    showControls = true,
}) {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const mapRef = useRef(null);

    // Refs for tracking movement/state
    const hasCenteredOnUser = useRef(false);
    const appLoadRegionDeltasRef = useRef(DEFAULT_APP_LOAD_DELTAS);
    const lastProgrammaticMoveAtRef = useRef(0);
    const lastUserPanAtRef = useRef(0);

    const [isZoomedOut, setIsZoomedOut] = useState(false);
    const [isMapReadyState, setIsMapReadyState] = useState(false);

    const screenHeight = Dimensions.get("window").height;

    const {
        userLocation,
        locationPermission,
        isLoadingLocation,
        locationError,
        requestLocationPermission,
    } = useMapLocation();

    const { routeCoordinates, routeInfo, calculateRoute, clearRoute } = useMapRoute();

    // Derived State
    const hospitals = useMemo(() => propHospitals && propHospitals.length > 0 ? propHospitals : [], [propHospitals]);
    const routeHospitalIdResolved = routeHospitalId ?? selectedHospitalId ?? null;
    const shouldShowControls = showControls && sheetSnapIndex <= 1;
    const shouldShowHospitalLabels = sheetSnapIndex === 0 && !routeHospitalIdResolved && !selectedHospitalId;
    const mapStyle = isDarkMode ? darkMapStyle : lightMapStyle;

    const mapPadding = useMemo(() => ({
        top: insets.top + 40,
        bottom: bottomPadding + 20,
        left: 0,
        right: 0,
    }), [insets.top, bottomPadding]);

    const mapPaddingRef = useRef(mapPadding);
    useEffect(() => { mapPaddingRef.current = mapPadding; }, [mapPadding]);

    const initialRegion = useMemo(() => {
        const base = appLoadRegionDeltasRef.current ?? DEFAULT_APP_LOAD_DELTAS;
        if (isValidCoordinate(userLocation)) {
            return {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: base?.latitudeDelta ?? 0.04,
                longitudeDelta: base?.longitudeDelta ?? 0.04,
            };
        }
        return {
            latitude: 37.7749,
            longitude: -122.4194,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
        };
    }, [userLocation]);

    // --- Sub-Hooks ---

    const {
        scheduleCenterInVisibleArea,
        computeBaselineDeltas,
        animateToHospital,
        fitToAllHospitals,
    } = useMapCameraLogic({
        mapRef,
        isMapReadyState,
        mapPadding,
        bottomPadding,
        userLocation,
        hospitals,
        appLoadRegionDeltasRef,
        lastProgrammaticMoveAtRef,
    });

    useMapStartupLogic({
        userLocation,
        locationPermission,
        isLoadingLocation,
        isMapReadyState,
        hospitals,
        mapRef,
        computeBaselineDeltas,
        appLoadRegionDeltasRef,
        lastProgrammaticMoveAtRef,
        routeCoordinates,
        selectedHospitalId,
    });

    // --- End Sub-Hooks ---

    // Request location permission on mount
    useEffect(() => {
        const init = async () => {
            await requestLocationPermission();
        };
        init();
    }, [requestLocationPermission]);

    // Fit to route
    useEffect(() => {
        if (!isMapReadyState || !mapRef.current || routeCoordinates.length < 2 || !routeHospitalIdResolved) return;

        const padding = mapPaddingRef.current;
        lastProgrammaticMoveAtRef.current = Date.now();

        mapRef.current.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: padding.top + 48, right: 4, bottom: padding.bottom + 4, left: 4 },
            animated: true,
        });

        scheduleCenterInVisibleArea(routeCoordinates, {
            topPadding: padding.top + 48,
            bottomPadding: padding.bottom + 4,
            delayMs: 620,
            zoomFactor: ROUTE_ZOOM_FACTOR,
            centerBias: 1,
        });
    }, [isMapReadyState, routeCoordinates, routeHospitalIdResolved, scheduleCenterInVisibleArea]);

    // Initial center on user
    useEffect(() => {
        if (mapRef.current && !isLoadingLocation && locationPermission && userLocation && !hasCenteredOnUser.current && isMapReadyState) {
            hasCenteredOnUser.current = true;
            setTimeout(() => {
                lastProgrammaticMoveAtRef.current = Date.now();
                mapRef.current?.animateToRegion({
                    ...userLocation,
                    latitudeDelta: DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
                    longitudeDelta: DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
                }, 550);
            }, 300);
        }
    }, [isLoadingLocation, isMapReadyState, locationPermission, userLocation]);

    // --- Ambulance Animation ---
    const { ambulanceCoordinate, ambulanceHeading } = useAmbulanceAnimation({
        routeCoordinates: animateAmbulance ? [...routeCoordinates].reverse() : [],
        animateAmbulance,
        ambulanceTripEtaSeconds: ambulanceTripEtaSeconds || (routeInfo?.durationSec || 600),
        responderLocation,
        responderHeading,
    });

    // --- Actions ---

    const handleRecenter = useCallback(() => {
        if (mapRef.current && userLocation) {
            lastProgrammaticMoveAtRef.current = Date.now();
            mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
        }
    }, [userLocation]);

    const handleRegionChangeComplete = useCallback((region) => {
        if (!Number.isFinite(region?.latitudeDelta)) return;
        setIsZoomedOut(region.latitudeDelta > 0.35);
    }, []);

    const handleMapReady = useCallback(() => {
        setIsMapReadyState(true);
        onMapReady?.();
    }, [onMapReady]);

    const handlePanDrag = useCallback(() => {
        lastUserPanAtRef.current = Date.now();
    }, []);

    // --- Imperative Methods ---
    const getExposedMethods = useCallback(() => ({
        animateToHospital,
        fitToAllHospitals,
    }), [animateToHospital, fitToAllHospitals]);

    return {
        state: {
            mapRef,
            isZoomedOut,
            isMapReadyState,
            userLocation,
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
            routeHospitalIdResolved,
            insets,
            isDarkMode,
        },
        actions: {
            handleRecenter,
            handleRegionChangeComplete,
            handleMapReady,
            handlePanDrag,
            requestLocationPermission,
            getExposedMethods,
        },
    };
}
