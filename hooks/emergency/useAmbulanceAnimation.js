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

const projectCoordinateOntoSegment = (segmentStart, segmentEnd, coordinate) => {
	if (!segmentStart || !segmentEnd || !coordinate) return null;
	const latScale = 111_320;
	const midLat =
		((segmentStart.latitude + segmentEnd.latitude + coordinate.latitude) / 3) *
		(Math.PI / 180);
	const lngScale = 111_320 * Math.cos(midLat);
	const segmentX = (segmentEnd.longitude - segmentStart.longitude) * lngScale;
	const segmentY = (segmentEnd.latitude - segmentStart.latitude) * latScale;
	const pointX = (coordinate.longitude - segmentStart.longitude) * lngScale;
	const pointY = (coordinate.latitude - segmentStart.latitude) * latScale;
	const segmentSquared = segmentX * segmentX + segmentY * segmentY;

	if (segmentSquared <= MIN_SEGMENT_METERS * MIN_SEGMENT_METERS) {
		return {
			ratio: 0,
			distanceMeters: Math.sqrt(pointX * pointX + pointY * pointY),
			projectedCoordinate: {
				latitude: segmentStart.latitude,
				longitude: segmentStart.longitude,
			},
		};
	}

	const rawRatio = (pointX * segmentX + pointY * segmentY) / segmentSquared;
	const ratio = Math.max(0, Math.min(1, rawRatio));
	const projectedX = segmentX * ratio;
	const projectedY = segmentY * ratio;

	return {
		ratio,
		distanceMeters: Math.sqrt(
			(pointX - projectedX) * (pointX - projectedX) +
				(pointY - projectedY) * (pointY - projectedY)
		),
		projectedCoordinate: {
			latitude:
				segmentStart.latitude +
				(segmentEnd.latitude - segmentStart.latitude) * ratio,
			longitude:
				segmentStart.longitude +
				(segmentEnd.longitude - segmentStart.longitude) * ratio,
		},
	};
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

const getNearestRouteDistance = (routeProfile, coordinate) => {
	if (!routeProfile || !coordinate) return null;
	const { points, cumulativeMeters } = routeProfile;
	let nearestRouteDistance = null;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (let i = 1; i < points.length; i += 1) {
		const segmentProjection = projectCoordinateOntoSegment(
			points[i - 1],
			points[i],
			coordinate
		);
		if (!segmentProjection) continue;
		if (segmentProjection.distanceMeters < nearestDistance) {
			nearestDistance = segmentProjection.distanceMeters;
			const segmentStartDistance = cumulativeMeters[i - 1] ?? 0;
			const segmentEndDistance = cumulativeMeters[i] ?? segmentStartDistance;
			nearestRouteDistance =
				segmentStartDistance +
				(segmentEndDistance - segmentStartDistance) * segmentProjection.ratio;
		}
	}
	return nearestRouteDistance;
};

const getNearestRouteProjection = (routeProfile, coordinate) => {
	if (!routeProfile || !coordinate) return null;
	const { points, cumulativeMeters } = routeProfile;
	let nearestProjection = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (let i = 1; i < points.length; i += 1) {
		const segmentProjection = projectCoordinateOntoSegment(
			points[i - 1],
			points[i],
			coordinate
		);
		if (!segmentProjection) continue;
		if (segmentProjection.distanceMeters < nearestDistance) {
			nearestDistance = segmentProjection.distanceMeters;
			const segmentStartDistance = cumulativeMeters[i - 1] ?? 0;
			const segmentEndDistance = cumulativeMeters[i] ?? segmentStartDistance;
			const routeDistanceMeters =
				segmentStartDistance +
				(segmentEndDistance - segmentStartDistance) * segmentProjection.ratio;
			nearestProjection = {
				routeDistanceMeters,
				projectedCoordinate: segmentProjection.projectedCoordinate,
				distanceMeters: segmentProjection.distanceMeters,
			};
		}
	}

	return nearestProjection;
};

const buildRouteSignature = (routeCoordinates = []) =>
	normalizeRoute(routeCoordinates)
		.map(
			(point) =>
				`${Number(point.latitude).toFixed(5)}:${Number(point.longitude).toFixed(5)}`
		)
		.join("|");

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
	const lastRouteDistanceRef = useRef(null);
	const responderLocationRef = useRef(responderLocation);
	const responderHeadingRef = useRef(responderHeading);
	const routeCoordinatesRef = useRef(routeCoordinates);
	const etaSecondsRef = useRef(ambulanceTripEtaSeconds);
	const initialProgressRef = useRef(initialProgress);
	const onAmbulanceUpdateRef = useRef(onAmbulanceUpdate);
	const routeSignature = buildRouteSignature(routeCoordinates);
	const hasLiveResponder = Boolean(
		responderLocation &&
			Number.isFinite(responderLocation.latitude) &&
			Number.isFinite(responderLocation.longitude)
	);

	useEffect(() => {
		routeCoordinatesRef.current = routeCoordinates;
	}, [routeCoordinates]);

	useEffect(() => {
		etaSecondsRef.current = ambulanceTripEtaSeconds;
	}, [ambulanceTripEtaSeconds]);

	useEffect(() => {
		initialProgressRef.current = initialProgress;
	}, [initialProgress]);

	useEffect(() => {
		onAmbulanceUpdateRef.current = onAmbulanceUpdate;
	}, [onAmbulanceUpdate]);

	useEffect(() => {
		responderLocationRef.current = responderLocation;
	}, [responderLocation]);

	useEffect(() => {
		responderHeadingRef.current = responderHeading;
	}, [responderHeading]);

	const stopAmbulanceAnimation = useCallback(() => {
		if (ambulanceTimerRef.current) {
			clearTimeout(ambulanceTimerRef.current);
			ambulanceTimerRef.current = null;
		}
		animationStartTimeRef.current = null;
	}, []);

	const startAmbulanceAnimation = useCallback(() => {
		stopAmbulanceAnimation();
		const routeProfile = buildRouteProfile(routeCoordinatesRef.current);
		routeProfileRef.current = routeProfile;
		const etaSeconds = Number(etaSecondsRef.current);
		const safeInitialProgress = Number.isFinite(initialProgressRef.current)
			? Math.min(1, Math.max(0, Number(initialProgressRef.current)))
			: 0;

		if (
			!routeProfile ||
			!Number.isFinite(etaSeconds) ||
			etaSeconds <= 0
		) {
			console.warn("[useAmbulanceAnimation] Invalid animation params");
			return;
		}

		const initialResponderLocation = responderLocationRef.current;
		const initialResponderHeading = responderHeadingRef.current;
		const responderProjection = initialResponderLocation
			? getNearestRouteProjection(routeProfile, initialResponderLocation)
			: null;
		const responderDistanceMeters = responderProjection?.routeDistanceMeters ?? null;
		const resumeProgress = Number.isFinite(lastRouteDistanceRef.current)
			? Math.min(
					1,
					Math.max(0, Number(lastRouteDistanceRef.current) / routeProfile.totalMeters)
				)
			: null;
		const responderProgress = Number.isFinite(responderDistanceMeters)
			? Math.min(1, Math.max(0, responderDistanceMeters / routeProfile.totalMeters))
			: null;
		const startProgress =
			Number.isFinite(responderProgress)
				? responderProgress
				: Number.isFinite(resumeProgress)
					? resumeProgress
					: safeInitialProgress;
		const usesResponderProgress = Number.isFinite(responderProgress);

		// Make marker visible immediately at the start of the route.
		const startCoordinate =
			responderProjection?.projectedCoordinate ||
			getCoordinateAtDistance(routeProfile, startProgress * routeProfile.totalMeters);
		lastRouteDistanceRef.current = startProgress * routeProfile.totalMeters;
		const lookaheadDistance =
			startProgress * routeProfile.totalMeters + HEADING_LOOKAHEAD_METERS;
		const lookaheadCoordinate = getCoordinateAtDistance(routeProfile, lookaheadDistance);
		const firstHeading = Number.isFinite(initialResponderHeading)
			? initialResponderHeading
			: calculateBearing(startCoordinate, lookaheadCoordinate);
		setAmbulanceCoordinate(startCoordinate);
		setAmbulanceHeading(firstHeading);

		animationStartTimeRef.current = Date.now();

		const animate = () => {
			const now = Date.now();
			const elapsedMs = now - animationStartTimeRef.current;
			const elapsedRatio = Math.min(
				1,
				elapsedMs / (etaSeconds * 1000)
			);
			const progressRatio = usesResponderProgress
				? Math.min(1, startProgress + elapsedRatio * (1 - startProgress))
				: Math.min(1, startProgress + elapsedRatio);
			const currentRoute = routeProfileRef.current;
			if (!currentRoute) {
				ambulanceTimerRef.current = null;
				return;
			}

			const traveledMeters = progressRatio * currentRoute.totalMeters;
			lastRouteDistanceRef.current = traveledMeters;
			const interpCoord = getCoordinateAtDistance(currentRoute, traveledMeters);
			const lookaheadCoord = getCoordinateAtDistance(
				currentRoute,
				traveledMeters + HEADING_LOOKAHEAD_METERS
			);
			const heading = calculateBearing(interpCoord, lookaheadCoord);

			setAmbulanceCoordinate(interpCoord);
			setAmbulanceHeading(heading);

			onAmbulanceUpdateRef.current?.({ coordinate: interpCoord, heading });

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
	}, [stopAmbulanceAnimation]);

	useEffect(() => {
		if (animateAmbulance && routeSignature && !hasLiveResponder) {
			startAmbulanceAnimation();
		} else {
			stopAmbulanceAnimation();
		}

		return () => {
			stopAmbulanceAnimation();
		};
	}, [
		animateAmbulance,
		ambulanceTripEtaSeconds,
		hasLiveResponder,
		initialProgress,
		routeSignature,
		startAmbulanceAnimation,
		stopAmbulanceAnimation,
	]);

	useEffect(() => {
		if (responderLocation) {
			const resolvedRouteProfile =
				routeProfileRef.current || buildRouteProfile(routeCoordinates);
			const responderProjection = getNearestRouteProjection(
				resolvedRouteProfile,
				responderLocation
			);
			const rawRouteDistance = responderProjection?.routeDistanceMeters;
			const resolvedRouteDistance = Number.isFinite(rawRouteDistance)
				? Number.isFinite(lastRouteDistanceRef.current)
					? Math.max(lastRouteDistanceRef.current, rawRouteDistance)
					: rawRouteDistance
				: null;
			if (Number.isFinite(resolvedRouteDistance)) {
				lastRouteDistanceRef.current = resolvedRouteDistance;
			}
			const projectedCoordinate = Number.isFinite(resolvedRouteDistance)
				? getCoordinateAtDistance(resolvedRouteProfile, resolvedRouteDistance)
				: responderProjection?.projectedCoordinate || responderLocation;
			setAmbulanceCoordinate(projectedCoordinate);
			if (
				!Number.isFinite(responderHeading) &&
				Number.isFinite(resolvedRouteDistance) &&
				resolvedRouteProfile
			) {
				const lookaheadCoordinate = getCoordinateAtDistance(
					resolvedRouteProfile,
					resolvedRouteDistance + HEADING_LOOKAHEAD_METERS
				);
				setAmbulanceHeading(
					calculateBearing(projectedCoordinate, lookaheadCoordinate)
				);
				return;
			}
		} else if (!animateAmbulance) {
			setAmbulanceCoordinate(null);
			lastRouteDistanceRef.current = null;
		}
		if (Number.isFinite(responderHeading)) {
			setAmbulanceHeading(responderHeading);
		}
	}, [animateAmbulance, responderLocation, responderHeading, routeCoordinates]);

	return {
		ambulanceCoordinate,
		ambulanceHeading,
		isAnimating: animateAmbulance && !!ambulanceTimerRef.current,
        startAmbulanceAnimation,
        stopAmbulanceAnimation
	};
};
