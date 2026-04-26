/**
 * useEmergencyLocationSync.js
 *
 * Owns: userLocation state + sync from GlobalLocationContext.
 * Also exposes parseEtaToSeconds (pure util used by server sync + actions).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalLocation } from "../../contexts/GlobalLocationContext";
import { DEFAULT_APP_REGION } from "../../constants/locationDefaults";

export function useEmergencyLocationSync() {
	const { userLocation: globalUserLocation } = useGlobalLocation();
	const [userLocation, setUserLocation] = useState(null);
	const userLocationRef = useRef(userLocation);

	useEffect(() => {
		userLocationRef.current = userLocation;
	}, [userLocation]);

	// Seed from global location once — never overwrite a user-set location
	useEffect(() => {
		const latitude = Number(globalUserLocation?.latitude);
		const longitude = Number(globalUserLocation?.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

		setUserLocation((current) => {
			const currentLat = Number(current?.latitude);
			const currentLng = Number(current?.longitude);
			if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) return current;
			return {
				latitude,
				longitude,
				latitudeDelta: Number(current?.latitudeDelta) || DEFAULT_APP_REGION.latitudeDelta,
				longitudeDelta: Number(current?.longitudeDelta) || DEFAULT_APP_REGION.longitudeDelta,
			};
		});
	}, [globalUserLocation?.latitude, globalUserLocation?.longitude]);

	const parseEtaToSeconds = useCallback((eta) => {
		if (eta === null || eta === undefined) return null;
		if (typeof eta === "number") return eta;
		if (typeof eta !== "string") return null;
		const lower = eta.toLowerCase();
		if (lower === "unknown" || lower === "8-12 mins") return 600;
		const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
		if (minutesMatch) return Number(minutesMatch[1]) * 60;
		const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
		if (secondsMatch) return Number(secondsMatch[1]);
		if (/^\d+$/.test(eta)) return Number(eta);
		return 600;
	}, []);

	return {
		userLocation,
		setUserLocation,
		userLocationRef,
		parseEtaToSeconds,
	};
}
