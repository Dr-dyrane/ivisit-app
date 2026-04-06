import React from "react";
import EmergencyIOSMobileIntakeView from "./EmergencyIOSMobileIntakeView";

export default function EmergencyAndroidChromebookIntakeView(props) {
	return (
		<EmergencyIOSMobileIntakeView
			{...props}
			locationSheetBehavior="android"
			locationSheetPresentation="sheet"
		/>
	);
}
