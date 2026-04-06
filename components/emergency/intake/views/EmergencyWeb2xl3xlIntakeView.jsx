import React from "react";
import EmergencyWebLgIntakeView from "./EmergencyWebLgIntakeView";

export default function EmergencyWeb2xl3xlIntakeView(props) {
	return (
		<EmergencyWebLgIntakeView
			{...props}
			scrollElementId="emergency-web-2xl-3xl-scroll"
			scrollbarStyleId="emergency-web-2xl-3xl-scrollbar-style"
		/>
	);
}
