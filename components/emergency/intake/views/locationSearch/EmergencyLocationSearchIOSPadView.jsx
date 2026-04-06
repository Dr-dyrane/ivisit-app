import React from "react";
import EmergencyLocationSearchStageBase from "./EmergencyLocationSearchStageBase";

export default function EmergencyLocationSearchIOSPadView(props) {
	return (
		<EmergencyLocationSearchStageBase
			{...props}
			variant="ios-pad"
			keyboardAwareMode="ios"
			presentationMode="dialog"
		/>
	);
}
