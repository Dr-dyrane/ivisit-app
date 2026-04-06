import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchAndroidMobileView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="android-mobile"
			keyboardAwareMode="android"
			presentationMode="sheet"
		/>
	);
}
