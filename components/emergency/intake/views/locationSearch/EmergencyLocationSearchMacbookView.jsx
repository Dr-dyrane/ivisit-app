import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchMacbookView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="macbook"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
