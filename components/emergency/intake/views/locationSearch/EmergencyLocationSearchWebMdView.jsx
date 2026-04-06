import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWebMdView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-md"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
