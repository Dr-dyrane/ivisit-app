import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchAndroidChromebookView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="android-chromebook"
			keyboardAwareMode="android"
			presentationMode="sheet"
		/>
	);
}
