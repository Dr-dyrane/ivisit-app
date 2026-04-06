import React, { useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import WelcomeScreenOrchestrator from "../components/welcome/WelcomeScreenOrchestrator";

const WelcomeScreen = () => {
	const router = useRouter();
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();

	useFocusEffect(
		useCallback(() => {
			resetHeader();
			setHeaderState({
				hidden: true,
			});
		}, [resetHeader, setHeaderState])
	);

	const handleIntentPress = (intent) => {
		if (intent === "emergency") {
			router.push("/(auth)/request-help");
			return;
		}

		router.push({
			pathname: "/(auth)/signup",
			params: { intent },
		});
	};

	return (
		<WelcomeScreenOrchestrator
			onRequestHelp={() => handleIntentPress("emergency")}
			onFindHospitalBed={() => handleIntentPress("bed")}
			onSignIn={() => router.push("/(auth)/login")}
		/>
	);
};

export default WelcomeScreen;
