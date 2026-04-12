import { useEffect } from "react";
import { Platform } from "react-native";
import { useFABActions } from "../../../contexts/FABContext";

export function useMapExploreGuestProfileFab({
	guestProfileVisible,
	onContinue,
}) {
	const { registerFAB, unregisterFAB } = useFABActions();

	useEffect(() => {
		unregisterFAB("map-guest-profile-continue");

		if (!guestProfileVisible || Platform.OS === "web") {
			return undefined;
		}

		registerFAB("map-guest-profile-continue", {
			icon: "arrow-forward",
			label: "Next",
			visible: true,
			style: "primary",
			priority: 40,
			allowInStack: true,
			isFixed: true,
			onPress: onContinue,
		});

		return () => unregisterFAB("map-guest-profile-continue");
	}, [guestProfileVisible, onContinue, registerFAB, unregisterFAB]);
}

export default useMapExploreGuestProfileFab;
