import React from "react";
import EmergencyIOSMobileIntakeView from "./EmergencyIOSMobileIntakeView";

export default function EmergencyAndroidFoldIntakeView(props) {
	return (
		<EmergencyIOSMobileIntakeView
			{...props}
			locationSheetBehavior="android"
			locationSheetPresentation="sheet"
		/>
	);
}
