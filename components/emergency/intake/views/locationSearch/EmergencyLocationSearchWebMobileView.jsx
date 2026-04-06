import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWebMobileView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-mobile"
			keyboardAwareMode="ios"
			presentationMode="sheet"
		/>
	);
}
