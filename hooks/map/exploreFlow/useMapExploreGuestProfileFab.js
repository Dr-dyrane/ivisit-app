import { useEffect } from "react";
import { useFABActions } from "../../../contexts/FABContext";

export function useMapExploreGuestProfileFab({
	guestProfileVisible,
}) {
	const { unregisterFAB } = useFABActions();

	useEffect(() => {
		unregisterFAB("map-guest-profile-continue");

		if (!guestProfileVisible) {
			return undefined;
		}

		return () => unregisterFAB("map-guest-profile-continue");
	}, [guestProfileVisible, unregisterFAB]);
}

export default useMapExploreGuestProfileFab;
