import React from "react";
import EmergencyLocationSearchSheet from "../../EmergencyLocationSearchSheet";

export default function EmergencyLocationSearchStageBase({
	variant = "ios-mobile",
	keyboardAwareMode,
	presentationMode,
	...props
}) {
	return (
		<EmergencyLocationSearchSheet
			{...props}
			variant={variant}
			keyboardAwareMode={keyboardAwareMode}
			presentationMode={presentationMode}
		/>
	);
}
