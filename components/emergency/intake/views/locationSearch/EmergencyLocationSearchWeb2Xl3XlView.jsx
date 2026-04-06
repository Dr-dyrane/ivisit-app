import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchWeb2Xl3XlView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="web-2xl-3xl"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
