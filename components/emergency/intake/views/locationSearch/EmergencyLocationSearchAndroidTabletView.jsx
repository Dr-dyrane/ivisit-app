import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchAndroidTabletView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="android-tablet"
			keyboardAwareMode="android"
			presentationMode="sheet"
		/>
	);
}
