import {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useMapLocation } from "../../hooks/emergency/useMapLocation";
import { useMapRoute } from "../../hooks/emergency/useMapRoute";
import { useAmbulanceAnimation } from "../../hooks/emergency/useAmbulanceAnimation";
import { isValidCoordinate } from "../../utils/mapUtils";
import { useMapCameraLogic } from "./useMapCameraLogic";
import { useMapStartupLogic } from "./useMapStartupLogic";

const DEFAULT_APP_LOAD_DELTAS = { latitudeDelta: 0.04, longitudeDelta: 0.04 };
const ROUTE_ZOOM_FACTOR = 0.2;

export const useFullScreenEmergencyMapLogic = ({
	hospitals: propHospitals,
	selectedHospitalId,
	routeHospitalId = null,
	animateAmbulance = false,
	ambulanceTripEtaSeconds = null,
	mode = "emergency",
	showControls = true,
	bottomPadding = 0,
	onRouteCalculated,
	responderLocation,
	responderHeading,
	sheetSnapIndex = 1,
	onMapReady,
}) => {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const mapRef = useRef(null);

	// Refs for tracking movement/state
	const appLoadRegionDeltasRef = useRef(DEFAULT_APP_LOAD_DELTAS);
	const lastProgrammaticMoveAtRef = useRef(0);
	const lastZoomLogAtRef = useRef(0);
	const lastUserPanAtRef = useRef(0);

	const [isZoomedOut, setIsZoomedOut] = useState(false);
	const [isMapReadyState, setIsMapReadyState] = useState(false);

	const {
		userLocation,
		locationPermission,
		isLoadingLocation,
		locationError,
		requestLocationPermission,
	} = useMapLocation();

	const { routeCoordinates, routeInfo, calculateRoute, clearRoute } = useMapRoute();

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

	const hospitals = propHospitals && propHospitals.length > 0 ? propHospitals : [];
	const routeHospitalIdResolved = routeHospitalId ?? selectedHospitalId ?? null;
	const routeHospital = routeHospitalIdResolved && hospitals?.length
		? hospitals.find((h) => h?.id === routeHospitalIdResolved) ?? null
		: null;

	const shouldShowControls = showControls && sheetSnapIndex <= 1;
	const shouldShowHospitalLabels = sheetSnapIndex === 0 && !routeHospitalIdResolved && !selectedHospitalId;

	const mapPadding = useMemo(() => ({
		top: insets.top + 40,
		bottom: bottomPadding + 20,
		left: 0,
		right: 0,
	}), [insets.top, bottomPadding]);

	const mapPaddingRef = useRef(mapPadding);
	useEffect(() => { mapPaddingRef.current = mapPadding; }, [mapPadding]);

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
        mapPadding,
    });

    // --- End Sub-Hooks ---

	// Ambulance Animation logic
	const { ambulanceCoordinate, ambulanceHeading } = useAmbulanceAnimation({
		routeCoordinates: animateAmbulance ? [...routeCoordinates].reverse() : [],
		animateAmbulance,
		ambulanceTripEtaSeconds: ambulanceTripEtaSeconds || (routeInfo?.durationSec || 600),
		responderLocation,
		responderHeading,
	});

	// Request location permission immediately on mount
	useEffect(() => { 
		console.log("[FullScreenEmergencyMap] Requesting location permission on mount...");
		requestLocationPermission(); 
	}, [requestLocationPermission]);

	// Route Calculation
	useEffect(() => {
		const shouldShowRoute = !!routeHospitalIdResolved && !!routeHospital;
		const origin = userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null;
		const destination = routeHospital?.coordinates ?? null;

		if (!shouldShowRoute || !isValidCoordinate(origin) || !isValidCoordinate(destination)) {
			if (!routeHospitalIdResolved && routeCoordinates.length > 0) {
				console.log('[FullScreenEmergencyMap] Path condition missing, clearing route');
				clearRoute();
			}
			return;
		}
		calculateRoute(origin, destination);
	}, [calculateRoute, routeHospital?.coordinates, routeHospitalIdResolved, userLocation]);

	// Update parent about route
	useEffect(() => {
		if (!onRouteCalculated || !isMapReadyState || !mapRef.current || routeCoordinates.length < 2) return;
		onRouteCalculated({ coordinates: routeCoordinates, durationSec: routeInfo?.durationSec, distanceMeters: routeInfo?.distanceMeters });
	}, [isMapReadyState, onRouteCalculated, routeCoordinates, routeInfo]);

	// Camera management for routes
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
			centerBias: 0.5,
		});
	}, [isMapReadyState, routeCoordinates, routeHospitalIdResolved, scheduleCenterInVisibleArea]);

	const handleRecenter = useCallback(() => {
		if (mapRef.current && userLocation) {
			lastProgrammaticMoveAtRef.current = Date.now();
			mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
		}
	}, [userLocation]);

	const handleRegionChangeComplete = useCallback((region) => {
		if (!Number.isFinite(region?.latitudeDelta)) return;
		setIsZoomedOut(region.latitudeDelta > 0.35);

		if (__DEV__ && routeHospitalIdResolved) {
			const now = Date.now();
			if (now - lastZoomLogAtRef.current < 900) return;
			lastZoomLogAtRef.current = now;
		}
	}, [routeHospitalIdResolved]);

    // Handle Map Ready
    const handleMapReady = useCallback(() => {
        setIsMapReadyState(true);
        onMapReady?.();
    }, [onMapReady]);

    const handlePanDrag = useCallback(() => {
        lastUserPanAtRef.current = Date.now();
    }, []);

	return {
		state: {
            isDarkMode,
            insets,
            isZoomedOut,
            isMapReadyState,
            userLocation,
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
            selectedHospitalId,
            routeHospitalId: routeHospitalIdResolved
        },
		actions: {
            handleRecenter,
            handleRegionChangeComplete,
            requestLocationPermission,
            setIsMapReadyState,
            animateToHospital,
            fitToAllHospitals,
            handleMapReady,
            handlePanDrag
        }
	};
};
