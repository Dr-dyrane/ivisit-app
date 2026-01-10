import { useState, useCallback, useRef, useEffect } from "react";
import { calculateBearing } from "../../utils/mapUtils";
import { AMBULANCE_CONFIG } from "../../constants/mapConfig";

export const useAmbulanceAnimation = ({
	routeCoordinates,
	animateAmbulance,
	ambulanceTripEtaSeconds,
	responderLocation,
	responderHeading,
	onAmbulanceUpdate,
}) => {
	const [ambulanceCoordinate, setAmbulanceCoordinate] = useState(null);
	const [ambulanceHeading, setAmbulanceHeading] = useState(0);
	const ambulanceTimerRef = useRef(null);
	const animationStartTimeRef = useRef(null);

	const startAmbulanceAnimation = useCallback(() => {
		if (
			!routeCoordinates ||
			routeCoordinates.length < 2 ||
			!Number.isFinite(ambulanceTripEtaSeconds)
		) {
			console.warn("[useAmbulanceAnimation] Invalid animation params");
			return;
		}

		animationStartTimeRef.current = Date.now();

		const animate = () => {
			const now = Date.now();
			const elapsedMs = now - animationStartTimeRef.current;
			const progressRatio = Math.min(1, elapsedMs / (ambulanceTripEtaSeconds * 1000));

			const totalDistance = routeCoordinates.length - 1;
			const segmentProgress = progressRatio * totalDistance;
			const currentSegmentIndex = Math.floor(segmentProgress);
			const segmentRatio = segmentProgress - currentSegmentIndex;

			if (currentSegmentIndex >= routeCoordinates.length - 1) {
				const lastCoord = routeCoordinates[routeCoordinates.length - 1];
				setAmbulanceCoordinate(lastCoord);
				setAmbulanceHeading(
					calculateBearing(
						routeCoordinates[routeCoordinates.length - 2],
						lastCoord
					)
				);
				ambulanceTimerRef.current = null;
				return;
			}

			const currentCoord = routeCoordinates[currentSegmentIndex];
			const nextCoord = routeCoordinates[currentSegmentIndex + 1];

			const interpCoord = {
				latitude:
					currentCoord.latitude +
					(nextCoord.latitude - currentCoord.latitude) * segmentRatio,
				longitude:
					currentCoord.longitude +
					(nextCoord.longitude - currentCoord.longitude) * segmentRatio,
			};

			const heading = calculateBearing(currentCoord, nextCoord);

			setAmbulanceCoordinate(interpCoord);
			setAmbulanceHeading(heading);

			onAmbulanceUpdate?.({ coordinate: interpCoord, heading });

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
		routeCoordinates,
		ambulanceTripEtaSeconds,
		onAmbulanceUpdate,
	]);

	const stopAmbulanceAnimation = useCallback(() => {
		if (ambulanceTimerRef.current) {
			clearTimeout(ambulanceTimerRef.current);
			ambulanceTimerRef.current = null;
		}
		animationStartTimeRef.current = null;
	}, []);

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
		}
		if (Number.isFinite(responderHeading)) {
			setAmbulanceHeading(responderHeading);
		}
	}, [responderLocation, responderHeading]);

	return {
		ambulanceCoordinate,
		ambulanceHeading,
		isAnimating: animateAmbulance && !!ambulanceTimerRef.current,
	};
};
