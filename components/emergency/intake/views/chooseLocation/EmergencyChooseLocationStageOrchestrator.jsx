import React from "react";
import EmergencyChooseLocationIOSMobileView from "./EmergencyChooseLocationIOSMobileView";
import EmergencyChooseLocationIOSPadView from "./EmergencyChooseLocationIOSPadView";
import EmergencyChooseLocationAndroidMobileView from "./EmergencyChooseLocationAndroidMobileView";
import EmergencyChooseLocationAndroidFoldView from "./EmergencyChooseLocationAndroidFoldView";
import EmergencyChooseLocationAndroidTabletView from "./EmergencyChooseLocationAndroidTabletView";
import EmergencyChooseLocationAndroidChromebookView from "./EmergencyChooseLocationAndroidChromebookView";
import EmergencyChooseLocationMacbookView from "./EmergencyChooseLocationMacbookView";
import EmergencyChooseLocationWebMobileView from "./EmergencyChooseLocationWebMobileView";
import EmergencyChooseLocationWebSmWideView from "./EmergencyChooseLocationWebSmWideView";
import EmergencyChooseLocationWebMdView from "./EmergencyChooseLocationWebMdView";
import EmergencyChooseLocationWebLgView from "./EmergencyChooseLocationWebLgView";
import EmergencyChooseLocationWebXlView from "./EmergencyChooseLocationWebXlView";
import EmergencyChooseLocationWeb2Xl3XlView from "./EmergencyChooseLocationWeb2Xl3XlView";
import EmergencyChooseLocationWebUltraWideView from "./EmergencyChooseLocationWebUltraWideView";

export default function EmergencyChooseLocationStageOrchestrator({
	variant = "ios-mobile",
	...props
}) {
	switch (variant) {
		case "ios-pad":
			return <EmergencyChooseLocationIOSPadView {...props} />;
		case "android-mobile":
			return <EmergencyChooseLocationAndroidMobileView {...props} />;
		case "android-fold":
			return <EmergencyChooseLocationAndroidFoldView {...props} />;
		case "android-tablet":
			return <EmergencyChooseLocationAndroidTabletView {...props} />;
		case "android-chromebook":
			return <EmergencyChooseLocationAndroidChromebookView {...props} />;
		case "macbook":
			return <EmergencyChooseLocationMacbookView {...props} />;
		case "web-mobile":
			return <EmergencyChooseLocationWebMobileView {...props} />;
		case "web-sm-wide":
			return <EmergencyChooseLocationWebSmWideView {...props} />;
		case "web-md":
			return <EmergencyChooseLocationWebMdView {...props} />;
		case "web-lg":
			return <EmergencyChooseLocationWebLgView {...props} />;
		case "web-xl":
			return <EmergencyChooseLocationWebXlView {...props} />;
		case "web-2xl-3xl":
			return <EmergencyChooseLocationWeb2Xl3XlView {...props} />;
		case "web-ultra-wide":
			return <EmergencyChooseLocationWebUltraWideView {...props} />;
		case "ios-mobile":
		default:
			return <EmergencyChooseLocationIOSMobileView {...props} />;
	}
}
