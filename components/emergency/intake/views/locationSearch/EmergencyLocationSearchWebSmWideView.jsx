import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWebSmWideView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-sm-wide"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
