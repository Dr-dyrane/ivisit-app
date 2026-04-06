import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWebUltraWideView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-ultra-wide"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
