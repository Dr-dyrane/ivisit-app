import { useState, useCallback, useRef, useEffect } from "react";
import { calculateBearing } from "../../utils/mapUtils";
import { AMBULANCE_CONFIG } from "../../constants/mapConfig";

const MIN_SEGMENT_METERS = 0.25;
const HEADING_LOOKAHEAD_METERS = 22;

const distanceMetersBetween = (from, to) => {
	if (!from || !to) return 0;
	const latScale = 111_320;
	const midLat = ((from.latitude + to.latitude) / 2) * (Math.PI / 180);
	const lngScale = 111_320 * Math.cos(midLat);
	const dLat = (to.latitude - from.latitude) * latScale;
	const dLng = (to.longitude - from.longitude) * lngScale;
	return Math.sqrt(dLat * dLat + dLng * dLng);
};

const normalizeRoute = (routeCoordinates = []) => {
	const points = [];
	for (let i = 0; i < routeCoordinates.length; i += 1) {
		const point = routeCoordinates[i];
		if (
			!point ||
			!Number.isFinite(point.latitude) ||
			!Number.isFinite(point.longitude)
		) {
			continue;
		}
		const previous = points[points.length - 1];
		if (
			previous &&
			Math.abs(previous.latitude - point.latitude) < 1e-8 &&
			Math.abs(previous.longitude - point.longitude) < 1e-8
		) {
			continue;
		}
		points.push({
			latitude: Number(point.latitude),
			longitude: Number(point.longitude),
		});
	}
	return points;
};

const buildRouteProfile = (routeCoordinates = []) => {
	const points = normalizeRoute(routeCoordinates);
	if (points.length < 2) {
		return null;
	}

	const cumulativeMeters = [0];
	for (let i = 1; i < points.length; i += 1) {
		const segmentMeters = Math.max(
			MIN_SEGMENT_METERS,
			distanceMetersBetween(points[i - 1], points[i])
		);
		cumulativeMeters.push(cumulativeMeters[i - 1] + segmentMeters);
	}

	const totalMeters = cumulativeMeters[cumulativeMeters.length - 1];
	if (!Number.isFinite(totalMeters) || totalMeters <= 0) {
		return null;
	}

	return { points, cumulativeMeters, totalMeters };
};

const findSegmentIndexAtDistance = (cumulativeMeters, distanceMeters) => {
	let low = 0;
	let high = cumulativeMeters.length - 1;
	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if (cumulativeMeters[mid] < distanceMeters) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}
	return Math.max(1, low);
};

const getCoordinateAtDistance = (routeProfile, distanceMeters) => {
	const { points, cumulativeMeters, totalMeters } = routeProfile;
	const clampedDistance = Math.min(Math.max(distanceMeters, 0), totalMeters);

	if (clampedDistance <= 0) {
		return points[0];
	}
	if (clampedDistance >= totalMeters) {
		return points[points.length - 1];
	}

	const segmentEndIndex = findSegmentIndexAtDistance(
		cumulativeMeters,
		clampedDistance
	);
	const segmentStartIndex = segmentEndIndex - 1;
	const segmentStartDistance = cumulativeMeters[segmentStartIndex];
	const segmentEndDistance = cumulativeMeters[segmentEndIndex];
	const segmentLength = Math.max(
		MIN_SEGMENT_METERS,
		segmentEndDistance - segmentStartDistance
	);
	const ratio = (clampedDistance - segmentStartDistance) / segmentLength;
	const start = points[segmentStartIndex];
	const end = points[segmentEndIndex];

	return {
		latitude: start.latitude + (end.latitude - start.latitude) * ratio,
		longitude: start.longitude + (end.longitude - start.longitude) * ratio,
	};
};

export const useAmbulanceAnimation = ({
	routeCoordinates,
	animateAmbulance,
	ambulanceTripEtaSeconds,
	initialProgress = 0,
	responderLocation,
	responderHeading,
	onAmbulanceUpdate,
}) => {
	const [ambulanceCoordinate, setAmbulanceCoordinate] = useState(null);
	const [ambulanceHeading, setAmbulanceHeading] = useState(0);
	const ambulanceTimerRef = useRef(null);
	const animationStartTimeRef = useRef(null);
	const routeProfileRef = useRef(null);

	const stopAmbulanceAnimation = useCallback(() => {
		if (ambulanceTimerRef.current) {
			clearTimeout(ambulanceTimerRef.current);
			ambulanceTimerRef.current = null;
		}
		animationStartTimeRef.current = null;
	}, []);

	const startAmbulanceAnimation = useCallback(() => {
		stopAmbulanceAnimation();
		const routeProfile = buildRouteProfile(routeCoordinates);
		routeProfileRef.current = routeProfile;
		const safeInitialProgress = Number.isFinite(initialProgress)
			? Math.min(1, Math.max(0, Number(initialProgress)))
			: 0;

		if (
			!routeProfile ||
			!Number.isFinite(ambulanceTripEtaSeconds) ||
			ambulanceTripEtaSeconds <= 0
		) {
			console.warn("[useAmbulanceAnimation] Invalid animation params");
			return;
		}

		// Make marker visible immediately at the start of the route.
		const startCoordinate = getCoordinateAtDistance(
			routeProfile,
			safeInitialProgress * routeProfile.totalMeters
		);
		const firstHeading = calculateBearing(
			routeProfile.points[0],
			routeProfile.points[1]
		);
		setAmbulanceCoordinate(startCoordinate);
		setAmbulanceHeading(firstHeading);

		const now = Date.now();
		animationStartTimeRef.current =
			now - safeInitialProgress * ambulanceTripEtaSeconds * 1000;

		const animate = () => {
			const now = Date.now();
			const elapsedMs = now - animationStartTimeRef.current;
			const progressRatio = Math.min(1, elapsedMs / (ambulanceTripEtaSeconds * 1000));
			const currentRoute = routeProfileRef.current;
			if (!currentRoute) {
				ambulanceTimerRef.current = null;
				return;
			}

			const traveledMeters = progressRatio * currentRoute.totalMeters;
			const interpCoord = getCoordinateAtDistance(currentRoute, traveledMeters);
			const lookaheadCoord = getCoordinateAtDistance(
				currentRoute,
				traveledMeters + HEADING_LOOKAHEAD_METERS
			);
			const heading = calculateBearing(interpCoord, lookaheadCoord);

			setAmbulanceCoordinate(interpCoord);
			setAmbulanceHeading(heading);

			onAmbulanceUpdate?.({ coordinate: interpCoord, heading });

			if (progressRatio >= 1) {
				ambulanceTimerRef.current = null;
				return;
			}

			ambulanceTimerRef.current = setTimeout(
				animate,
				AMBULANCE_CONFIG.ANIMATION_INTERVAL
			);
		};

		ambulanceTimerRef.current = setTimeout(
			animate,
			AMBULANCE_CONFIG.ANIMATION_INTERVAL
		);
	}, [
		initialProgress,
		routeCoordinates,
		ambulanceTripEtaSeconds,
		onAmbulanceUpdate,
		stopAmbulanceAnimation,
	]);

	useEffect(() => {
		if (animateAmbulance && routeCoordinates.length >= 2) {
			startAmbulanceAnimation();
		} else {
			stopAmbulanceAnimation();
		}

		return () => {
			stopAmbulanceAnimation();
		};
	}, [animateAmbulance, routeCoordinates, startAmbulanceAnimation, stopAmbulanceAnimation]);

	useEffect(() => {
		if (responderLocation) {
			setAmbulanceCoordinate(responderLocation);
		} else if (!animateAmbulance) {
			setAmbulanceCoordinate(null);
		}
		if (Number.isFinite(responderHeading)) {
			setAmbulanceHeading(responderHeading);
		}
	}, [animateAmbulance, responderLocation, responderHeading]);

	return {
		ambulanceCoordinate,
		ambulanceHeading,
		isAnimating: animateAmbulance && !!ambulanceTimerRef.current,
        startAmbulanceAnimation,
        stopAmbulanceAnimation
	};
};
