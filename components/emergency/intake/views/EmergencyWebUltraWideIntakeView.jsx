import React from "react";
import EmergencyWebLgIntakeView from "./EmergencyWebLgIntakeView";

export default function EmergencyWebUltraWideIntakeView(props) {
	return (
		<EmergencyWebLgIntakeView
			{...props}
			scrollElementId="emergency-web-ultra-wide-scroll"
			scrollbarStyleId="emergency-web-ultra-wide-scrollbar-style"
		/>
	);
}
