import React from "react";
import EmergencyIOSMobileIntakeView from "./EmergencyIOSMobileIntakeView";

export default function EmergencyAndroidMobileIntakeView(props) {
	return (
		<EmergencyIOSMobileIntakeView
			{...props}
			locationSheetBehavior="android"
		/>
	);
}
