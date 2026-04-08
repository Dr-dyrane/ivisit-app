import React, { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { WELCOME_COPY } from "../components/welcome/welcomeContent";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import WelcomeScreenOrchestrator from "../components/welcome/WelcomeScreenOrchestrator";

const WelcomeScreen = () => {
	const router = useRouter();
	const [isOpeningEmergency, setIsOpeningEmergency] = useState(false);
	const { setHeaderState } = useHeaderState();
	const { resetHeader } = useScrollAwareHeader();

	useFocusEffect(
		useCallback(() => {
			setIsOpeningEmergency(false);
			resetHeader();
			setHeaderState({
				hidden: true,
			});
		}, [resetHeader, setHeaderState])
	);

	const handleIntentPress = (intent) => {
		if (intent === "emergency") {
			setIsOpeningEmergency(true);
			router.push("/(auth)/request-help");
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
