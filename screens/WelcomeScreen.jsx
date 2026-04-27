import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { WELCOME_COPY } from "../components/welcome/welcomeContent";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useGlobalLocation } from "../contexts/GlobalLocationContext";
// PULLBACK NOTE: Phase 6d — WelcomeScreen: setUserLocation/userLocation/refreshHospitals migrated
// OLD: all three from useEmergency() — context-wide re-render on any field change
// NEW: setUserLocation/userLocation from useLocationStore; refreshHospitals stays on useEmergency()
import { useEmergency } from "../contexts/EmergencyContext";
import { useLocationStore } from "../stores/locationStore";
import WelcomeScreenOrchestrator from "../components/welcome/WelcomeScreenOrchestrator";

const WelcomeScreen = () => {
	const router = useRouter();
	const [isOpeningEmergency, setIsOpeningEmergency] = useState(false);
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();
	const { userLocation } = useGlobalLocation();
	const { refreshHospitals } = useEmergency();
	const emergencyUserLocation = useLocationStore((s) => s.userLocation);
	const setUserLocationStore = useLocationStore((s) => s.setUserLocation);
	const hasPrewarmedEmergencyRef = useRef(false);
	const awaitingEmergencyLocationSyncRef = useRef(false);

	useFocusEffect(
		useCallback(() => {
			setIsOpeningEmergency(false);
			resetHeader();
			setHeaderState({
				hidden: true,
			});
		}, [resetHeader, setHeaderState])
	);

	useEffect(() => {
		if (!userLocation?.latitude || !userLocation?.longitude) {
			return;
		}

		const current = useLocationStore.getState().userLocation;
		const sameCoordinate =
			Number(current?.latitude) === Number(userLocation.latitude) &&
			Number(current?.longitude) === Number(userLocation.longitude);

		if (sameCoordinate) {
			awaitingEmergencyLocationSyncRef.current = false;
			return;
		}

		awaitingEmergencyLocationSyncRef.current = true;
		setUserLocationStore({
			latitude: Number(userLocation.latitude),
			longitude: Number(userLocation.longitude),
			latitudeDelta: Number(current?.latitudeDelta) || 0.04,
			longitudeDelta: Number(current?.longitudeDelta) || 0.04,
		});
	}, [setUserLocationStore, userLocation?.latitude, userLocation?.longitude]);

	useEffect(() => {
		if (hasPrewarmedEmergencyRef.current) {
			return;
		}
		if (!userLocation?.latitude || !userLocation?.longitude) {
			return;
		}
		if (!emergencyUserLocation?.latitude || !emergencyUserLocation?.longitude) {
			return;
		}

		const sameCoordinate =
			Number(emergencyUserLocation.latitude) === Number(userLocation.latitude) &&
			Number(emergencyUserLocation.longitude) === Number(userLocation.longitude);

		if (!sameCoordinate) {
			return;
		}

		if (awaitingEmergencyLocationSyncRef.current) {
			awaitingEmergencyLocationSyncRef.current = false;
			return;
		}

		hasPrewarmedEmergencyRef.current = true;
		const warmupTimer = setTimeout(() => {
			refreshHospitals?.();
		}, 0);

		return () => clearTimeout(warmupTimer);
	}, [
		emergencyUserLocation?.latitude,
		emergencyUserLocation?.longitude,
		refreshHospitals,
		userLocation?.latitude,
		userLocation?.longitude,
	]);

	const handleIntentPress = (intent) => {
		if (intent === "emergency") {
			setIsOpeningEmergency(true);
			router.replace("/(auth)/map");
			return;
		}

		router.push({
			pathname: "/(auth)/onboarding",
			params: { intent },
		});
	};

	return (
		<WelcomeScreenOrchestrator
			onRequestHelp={() => handleIntentPress("emergency")}
			onFindHospitalBed={() => handleIntentPress("bed")}
			onSignIn={() => router.push("/(auth)/login")}
			primaryActionLabel={isOpeningEmergency ? WELCOME_COPY.openingLabel : undefined}
			isRequestOpening={isOpeningEmergency}
		/>
	);
};

export default WelcomeScreen;
