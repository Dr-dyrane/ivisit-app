import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchIOSMobileView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="ios-mobile"
			keyboardAwareMode="ios"
			presentationMode="sheet"
		/>
	);
}
