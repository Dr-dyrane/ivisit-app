import { useRef, useCallback, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { calculateDistance, isValidCoordinate } from '../../utils/mapUtils';

const BASELINE_ZOOM_IN_FACTOR = 0.92;
const DEFAULT_APP_LOAD_DELTAS = { latitudeDelta: 0.04, longitudeDelta: 0.04 };
const screenHeight = Dimensions.get("window").height;

export const useMapCameraLogic = ({
    mapRef,
    isMapReadyState,
    mapPadding,
    bottomPadding,
    userLocation,
    hospitals,
    appLoadRegionDeltasRef,
    lastProgrammaticMoveAtRef,
}) => {
    const pendingCenterTimeoutRef = useRef(null);

    // Helper: Center map in visible area
    const scheduleCenterInVisibleArea = useCallback(
        (points, { topPadding, bottomPadding: bottomPad, delayMs = 520, zoomFactor = 1, centerBias = 0.5 } = {}) => {
            if (!mapRef.current || !Array.isArray(points) || points.length === 0) return;

            if (pendingCenterTimeoutRef.current) clearTimeout(pendingCenterTimeoutRef.current);

            let minLat = points[0]?.latitude, maxLat = points[0]?.latitude;
            let minLng = points[0]?.longitude, maxLng = points[0]?.longitude;

            points.forEach(p => {
                if (!p) return;
                minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
                minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
            });

            const contentCenterLat = (minLat + maxLat) / 2;
            const contentCenterLng = (minLng + maxLng) / 2;

            pendingCenterTimeoutRef.current = setTimeout(async () => {
                try {
                    if (!mapRef.current) return;
                    const boundaries = await mapRef.current.getMapBoundaries();
                    if (!boundaries?.northEast) return;

                    const latSpan = Math.abs(boundaries.northEast.latitude - boundaries.southWest.latitude);
                    const topY = Math.max(0, topPadding || 0);
                    const bottomY = screenHeight - Math.max(0, bottomPad || 0);
                    const visibleHeightPx = Math.max(0, bottomY - topY);

                    const desiredCenterY = topY + visibleHeightPx * (centerBias || 0.5);
                    const latShift = (latSpan / screenHeight) * (desiredCenterY - (screenHeight / 2));

                    const targetLatDelta = latSpan * (zoomFactor || 1);

                    lastProgrammaticMoveAtRef.current = Date.now();
                    mapRef.current.animateToRegion({
                        latitude: contentCenterLat + latShift,
                        longitude: contentCenterLng,
                        latitudeDelta: Math.max(0.0005, targetLatDelta),
                        longitudeDelta: Math.max(0.0005, targetLatDelta),
                    }, 280);
                } catch (e) {
                    console.warn('[FullScreenEmergencyMap] Center visibility failed', e);
                } finally {
                    pendingCenterTimeoutRef.current = null;
                }
            }, delayMs);
        }, []
    );

    // Baseline Deltas Calculation
    const computeBaselineDeltas = useCallback((location, hospitalList) => {
        if (!isValidCoordinate(location) || !hospitalList?.length || !isMapReadyState) return null;

        const valid = hospitalList
            .filter(h => isValidCoordinate(h?.coordinates))
            .map(h => ({ h, d: calculateDistance(location, h.coordinates) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 6)
            .map(x => x.h.coordinates);

        const points = [location, ...valid];
        if (points.length === 0) return null;

        let minLat = points[0].latitude, maxLat = points[0].latitude;
        let minLng = points[0].longitude, maxLng = points[0].longitude;

        points.forEach(p => {
            minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
            minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
        });

        const latRange = Math.abs(maxLat - minLat);
        const lngRange = Math.abs(maxLng - minLng);
        const delta = Math.max(0.035, Math.max(latRange, lngRange) * 1.9) * BASELINE_ZOOM_IN_FACTOR;

        return {
            latitudeDelta: Math.max(0.02, Math.min(0.085, delta)),
            longitudeDelta: Math.max(0.02, Math.min(0.085, delta))
        };
    }, [isMapReadyState]);

    // Imperative actions
    const animateToHospital = useCallback((hospital, options = {}) => {
        if (!mapRef.current || !isValidCoordinate(hospital?.coordinates)) return;
        const targetBottom = options.bottomPadding ?? bottomPadding;
        const targetTop = options.topPadding ?? mapPadding.top;

        const points = [hospital.coordinates];
        if (options.includeUser && isValidCoordinate(userLocation)) {
            points.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
        }

        if (points.length < 2) {
            lastProgrammaticMoveAtRef.current = Date.now();
            mapRef.current.animateToRegion({
                ...hospital.coordinates,
                latitudeDelta: appLoadRegionDeltasRef.current?.latitudeDelta ?? 0.04,
                longitudeDelta: appLoadRegionDeltasRef.current?.longitudeDelta ?? 0.04,
            }, 550);
            return;
        }

        lastProgrammaticMoveAtRef.current = Date.now();
        mapRef.current.animateToRegion({
            latitude: (points[0].latitude + points[1].latitude) / 2,
            longitude: (points[0].longitude + points[1].longitude) / 2,
            latitudeDelta: appLoadRegionDeltasRef.current?.latitudeDelta ?? 0.04,
            longitudeDelta: appLoadRegionDeltasRef.current?.longitudeDelta ?? 0.04,
        }, 450);

        scheduleCenterInVisibleArea(points, { topPadding: targetTop, bottomPadding: targetBottom, delayMs: 560 });
    }, [bottomPadding, userLocation, scheduleCenterInVisibleArea, mapPadding, mapRef, appLoadRegionDeltasRef, lastProgrammaticMoveAtRef]);

    const fitToAllHospitals = useCallback(() => {
        if (!mapRef.current || !hospitals.length) return;
        const valid = hospitals.filter(h => isValidCoordinate(h?.coordinates));
        if (!valid.length) return;

        let minLat = valid[0].coordinates.latitude, maxLat = valid[0].coordinates.latitude;
        let minLng = valid[0].coordinates.longitude, maxLng = valid[0].coordinates.longitude;

        valid.forEach(h => {
            minLat = Math.min(minLat, h.coordinates.latitude); maxLat = Math.max(maxLat, h.coordinates.latitude);
            minLng = Math.min(minLng, h.coordinates.longitude); maxLng = Math.max(maxLng, h.coordinates.longitude);
        });

        lastProgrammaticMoveAtRef.current = Date.now();
        mapRef.current.animateToRegion({
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
            longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.4),
        }, 550);
    }, [hospitals, mapRef, lastProgrammaticMoveAtRef]);

    return {
        scheduleCenterInVisibleArea,
        computeBaselineDeltas,
        animateToHospital,
        fitToAllHospitals,
    };
};
