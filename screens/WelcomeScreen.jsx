import React, { useCallback, useEffect } from "react";
import { Animated } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useWelcomeExitTransition } from "../hooks/ui/useWelcomeExitTransition";
import { useAtom } from "jotai";
import { WELCOME_COPY } from "../components/welcome/welcomeContent";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useGlobalLocation } from "../contexts/GlobalLocationContext";
import { useLocationStore } from "../stores/locationStore";
import { isOpeningEmergencyAtom } from "../atoms/welcomeScreenAtoms";
import WelcomeScreenOrchestrator from "../components/welcome/WelcomeScreenOrchestrator";

const WelcomeScreen = () => {
	const router = useRouter();
	const [isOpeningEmergency, setIsOpeningEmergency] = useAtom(isOpeningEmergencyAtom);
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();
	const { userLocation } = useGlobalLocation();
	const setUserLocationStore = useLocationStore((s) => s.setUserLocation);
	const { screenOpacity, startExitTransition, resetOpacity } = useWelcomeExitTransition();

	useFocusEffect(
		useCallback(() => {
			setIsOpeningEmergency(false);
			resetHeader();
			setHeaderState({ hidden: true });
			resetOpacity();
		}, [resetHeader, resetOpacity, setHeaderState, setIsOpeningEmergency])
	);

	useEffect(() => {
		if (!userLocation?.latitude || !userLocation?.longitude) {
			return;
		}

		const current = useLocationStore.getState().userLocation;
		const sameCoordinate =
			Number(current?.latitude) === Number(userLocation.latitude) &&
			Number(current?.longitude) === Number(userLocation.longitude);

		if (sameCoordinate) return;

		setUserLocationStore({
			latitude: Number(userLocation.latitude),
			longitude: Number(userLocation.longitude),
			latitudeDelta: Number(current?.latitudeDelta) || 0.04,
			longitudeDelta: Number(current?.longitudeDelta) || 0.04,
		});
	}, [setUserLocationStore, userLocation?.latitude, userLocation?.longitude]);

	const handleIntentPress = (intent) => {
		if (intent === "emergency") {
			setIsOpeningEmergency(true);
			startExitTransition(
				() => router.replace("/(auth)/map"),
				{ onRecovery: () => setIsOpeningEmergency(false) },
			);
			return;
		}

		router.push({
			pathname: "/(auth)/onboarding",
			params: { intent },
		});
	};

	return (
		<Animated.View style={{ flex: 1, opacity: screenOpacity }}>
			<WelcomeScreenOrchestrator
				onRequestHelp={() => handleIntentPress("emergency")}
				onFindHospitalBed={() => handleIntentPress("bed")}
				onSignIn={() => router.push("/(auth)/login")}
				primaryActionLabel={isOpeningEmergency ? WELCOME_COPY.openingLabel : undefined}
				isRequestOpening={isOpeningEmergency}
			/>
		</Animated.View>
	);
};

export default WelcomeScreen;
