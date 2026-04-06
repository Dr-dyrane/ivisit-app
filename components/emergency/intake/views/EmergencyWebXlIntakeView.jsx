import React from "react";
import EmergencyWebLgIntakeView from "./EmergencyWebLgIntakeView";

export default function EmergencyWebXlIntakeView(props) {
	return (
		<EmergencyWebLgIntakeView
			{...props}
			scrollElementId="emergency-web-xl-scroll"
			scrollbarStyleId="emergency-web-xl-scrollbar-style"
		/>
	);
}
