import { useRef, useEffect } from 'react';
import { isValidCoordinate } from '../../utils/mapUtils';

const DEFAULT_APP_LOAD_DELTAS = { latitudeDelta: 0.04, longitudeDelta: 0.04 };

export const useMapStartupLogic = ({
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
}) => {
    const startupPhaseRef = useRef('initial');
    const hasComputedBaselineZoomRef = useRef(false);
    const hasAppliedBaselineZoomRef = useRef(false);
    const hasCenteredOnUser = useRef(false);

    // 1. Startup phase transition: Location Ready
    useEffect(() => {
        if (startupPhaseRef.current === 'initial' && userLocation && locationPermission && !isLoadingLocation) {
            startupPhaseRef.current = 'location_ready';
        }
    }, [userLocation, locationPermission, isLoadingLocation]);

    // 2. Startup phase transition: Map Ready
    useEffect(() => {
        if (startupPhaseRef.current === 'location_ready' && isMapReadyState) {
            startupPhaseRef.current = 'map_ready';
        }
    }, [isMapReadyState]);

    // 3. Compute Baseline Zoom
    useEffect(() => {
        if (hasComputedBaselineZoomRef.current || !isMapReadyState || !isValidCoordinate(userLocation) || !hospitals.length || startupPhaseRef.current !== 'map_ready') return;

        const deltas = computeBaselineDeltas(userLocation, hospitals);
        if (deltas) {
            hasComputedBaselineZoomRef.current = true;
            appLoadRegionDeltasRef.current = deltas;
            startupPhaseRef.current = 'baseline_set';
        }
    }, [computeBaselineDeltas, hospitals, isMapReadyState, userLocation, appLoadRegionDeltasRef]);

    // 4. Apply Initial Zoom (Fit to User + Hospitals)
    useEffect(() => {
        if (!hasCenteredOnUser.current || !hasComputedBaselineZoomRef.current || hasAppliedBaselineZoomRef.current || !mapRef.current || !isValidCoordinate(userLocation) || !isMapReadyState || selectedHospitalId || routeCoordinates.length > 0 || startupPhaseRef.current !== 'baseline_set') return;

        hasAppliedBaselineZoomRef.current = true;
        startupPhaseRef.current = 'complete';
        lastProgrammaticMoveAtRef.current = Date.now();

        const coordinates = [
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            ...(hospitals || []).map(h => ({ latitude: h.latitude, longitude: h.longitude }))
        ].filter(isValidCoordinate);

        // If we have multiple points (User + at least one hospital), fit to them.
        if (coordinates.length > 1) {
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: mapPadding || { top: 50, right: 20, bottom: 20, left: 20 },
                animated: true,
            });
        } else {
            // Fallback: Just center on user with computed deltas
            const base = appLoadRegionDeltasRef.current;
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: base?.latitudeDelta ?? DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
                longitudeDelta: base?.longitudeDelta ?? DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
            }, 420);
        }
    }, [routeCoordinates.length, selectedHospitalId, userLocation, isMapReadyState, mapRef, appLoadRegionDeltasRef, lastProgrammaticMoveAtRef, hospitals, mapPadding]);

    // 5. Initial Center on User (Fallback/Parallel)
    useEffect(() => {
        if (mapRef.current && !isLoadingLocation && locationPermission && userLocation && !hasCenteredOnUser.current && isMapReadyState && startupPhaseRef.current === 'baseline_set') {
            hasCenteredOnUser.current = true;
            setTimeout(() => {
                lastProgrammaticMoveAtRef.current = Date.now();
                // We use fitToCoordinates above, but if that failed or we want to ensure user is visible:
                // This might conflict, but the check 'hasCenteredOnUser' (which we set to true) helps.
                // However, the above effect runs first if 'startupPhaseRef' is 'baseline_set'.
                // If the above effect runs, it sets 'startupPhaseRef' to 'complete'.
                // So this effect will NOT run if the above one ran.
                // This effect is a safety net if 'baseline_set' happens but the above conditions fail? 
                // Actually, this effect checks 'startupPhaseRef.current === baseline_set'. 
                // If the above effect runs, it changes it to 'complete'. 
                // So this is effectively dead code if the above runs? 
                // No, this effect might run *before* the above one if dependencies trigger differently.
                // But let's leave it as a fallback for now, maybe adjusting logic slightly.
                
                // If we are here, it means we haven't completed the main zoom yet.
                 mapRef.current?.animateToRegion({
                    ...userLocation,
                    latitudeDelta: DEFAULT_APP_LOAD_DELTAS.latitudeDelta,
                    longitudeDelta: DEFAULT_APP_LOAD_DELTAS.longitudeDelta,
                }, 550);
            }, 300);
        }
    }, [isLoadingLocation, isMapReadyState, locationPermission, userLocation, mapRef, lastProgrammaticMoveAtRef]);

    return {
        startupPhaseRef,
    };
};
