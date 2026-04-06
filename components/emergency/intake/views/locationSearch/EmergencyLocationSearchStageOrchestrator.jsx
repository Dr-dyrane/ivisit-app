import React from "react";
import EmergencyLocationSearchIOSMobileView from "./EmergencyLocationSearchIOSMobileView";
import EmergencyLocationSearchIOSPadView from "./EmergencyLocationSearchIOSPadView";
import EmergencyLocationSearchAndroidMobileView from "./EmergencyLocationSearchAndroidMobileView";
import EmergencyLocationSearchAndroidFoldView from "./EmergencyLocationSearchAndroidFoldView";
import EmergencyLocationSearchAndroidTabletView from "./EmergencyLocationSearchAndroidTabletView";
import EmergencyLocationSearchAndroidChromebookView from "./EmergencyLocationSearchAndroidChromebookView";
import EmergencyLocationSearchMacbookView from "./EmergencyLocationSearchMacbookView";
import EmergencyLocationSearchWebMobileView from "./EmergencyLocationSearchWebMobileView";
import EmergencyLocationSearchWebSmWideView from "./EmergencyLocationSearchWebSmWideView";
import EmergencyLocationSearchWebMdView from "./EmergencyLocationSearchWebMdView";
import EmergencyLocationSearchWebLgView from "./EmergencyLocationSearchWebLgView";
import EmergencyLocationSearchWebXlView from "./EmergencyLocationSearchWebXlView";
import EmergencyLocationSearchWeb2Xl3XlView from "./EmergencyLocationSearchWeb2Xl3XlView";
import EmergencyLocationSearchWebUltraWideView from "./EmergencyLocationSearchWebUltraWideView";

export default function EmergencyLocationSearchStageOrchestrator({
	variant = "ios-mobile",
	...props
}) {
	switch (variant) {
		case "ios-pad":
			return <EmergencyLocationSearchIOSPadView {...props} />;
		case "android-mobile":
			return <EmergencyLocationSearchAndroidMobileView {...props} />;
		case "android-fold":
			return <EmergencyLocationSearchAndroidFoldView {...props} />;
		case "android-tablet":
			return <EmergencyLocationSearchAndroidTabletView {...props} />;
		case "android-chromebook":
			return <EmergencyLocationSearchAndroidChromebookView {...props} />;
		case "macbook":
			return <EmergencyLocationSearchMacbookView {...props} />;
		case "web-mobile":
			return <EmergencyLocationSearchWebMobileView {...props} />;
		case "web-sm-wide":
			return <EmergencyLocationSearchWebSmWideView {...props} />;
		case "web-md":
			return <EmergencyLocationSearchWebMdView {...props} />;
		case "web-lg":
			return <EmergencyLocationSearchWebLgView {...props} />;
		case "web-xl":
			return <EmergencyLocationSearchWebXlView {...props} />;
		case "web-2xl-3xl":
			return <EmergencyLocationSearchWeb2Xl3XlView {...props} />;
		case "web-ultra-wide":
			return <EmergencyLocationSearchWebUltraWideView {...props} />;
		case "ios-mobile":
		default:
			return <EmergencyLocationSearchIOSMobileView {...props} />;
	}
}
