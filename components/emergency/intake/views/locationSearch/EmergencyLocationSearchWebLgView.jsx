import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWebLgView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-lg"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
