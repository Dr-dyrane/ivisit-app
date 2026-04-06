import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchAndroidFoldView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="android-fold"
			keyboardAwareMode="android"
			presentationMode="sheet"
		/>
	);
}
