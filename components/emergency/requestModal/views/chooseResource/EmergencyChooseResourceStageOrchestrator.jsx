import React from "react";
import EmergencyChooseResourceStageBase from "./EmergencyChooseResourceStageBase";

export default function EmergencyChooseResourceStageOrchestrator({
	variant = "ios-mobile",
	...props
}) {
	switch (variant) {
		case "ios-pad":
		case "android-mobile":
		case "android-fold":
		case "android-tablet":
		case "android-chromebook":
		case "macbook":
		case "web-mobile":
		case "web-sm-wide":
		case "web-md":
		case "web-lg":
		case "web-xl":
		case "web-2xl-3xl":
		case "web-ultra-wide":
		case "ios-mobile":
		default:
			return <EmergencyChooseResourceStageBase {...props} variant={variant} />;
	}
}
