import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWebXlView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-xl"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
