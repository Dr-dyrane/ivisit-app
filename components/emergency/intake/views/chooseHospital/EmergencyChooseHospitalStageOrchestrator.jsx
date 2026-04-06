import React from "react";
import EmergencyChooseHospitalIOSMobileView from "./EmergencyChooseHospitalIOSMobileView";
import EmergencyChooseHospitalIOSPadView from "./EmergencyChooseHospitalIOSPadView";
import EmergencyChooseHospitalAndroidMobileView from "./EmergencyChooseHospitalAndroidMobileView";
import EmergencyChooseHospitalAndroidFoldView from "./EmergencyChooseHospitalAndroidFoldView";
import EmergencyChooseHospitalAndroidTabletView from "./EmergencyChooseHospitalAndroidTabletView";
import EmergencyChooseHospitalAndroidChromebookView from "./EmergencyChooseHospitalAndroidChromebookView";
import EmergencyChooseHospitalMacbookView from "./EmergencyChooseHospitalMacbookView";
import EmergencyChooseHospitalWebMobileView from "./EmergencyChooseHospitalWebMobileView";
import EmergencyChooseHospitalWebSmWideView from "./EmergencyChooseHospitalWebSmWideView";
import EmergencyChooseHospitalWebMdView from "./EmergencyChooseHospitalWebMdView";
import EmergencyChooseHospitalWebLgView from "./EmergencyChooseHospitalWebLgView";
import EmergencyChooseHospitalWebXlView from "./EmergencyChooseHospitalWebXlView";
import EmergencyChooseHospitalWeb2Xl3XlView from "./EmergencyChooseHospitalWeb2Xl3XlView";
import EmergencyChooseHospitalWebUltraWideView from "./EmergencyChooseHospitalWebUltraWideView";

export default function EmergencyChooseHospitalStageOrchestrator({
	variant = "ios-mobile",
	...props
}) {
	switch (variant) {
		case "ios-pad":
			return <EmergencyChooseHospitalIOSPadView {...props} />;
		case "android-mobile":
			return <EmergencyChooseHospitalAndroidMobileView {...props} />;
		case "android-fold":
			return <EmergencyChooseHospitalAndroidFoldView {...props} />;
		case "android-tablet":
			return <EmergencyChooseHospitalAndroidTabletView {...props} />;
		case "android-chromebook":
			return <EmergencyChooseHospitalAndroidChromebookView {...props} />;
		case "macbook":
			return <EmergencyChooseHospitalMacbookView {...props} />;
		case "web-mobile":
			return <EmergencyChooseHospitalWebMobileView {...props} />;
		case "web-sm-wide":
			return <EmergencyChooseHospitalWebSmWideView {...props} />;
		case "web-md":
			return <EmergencyChooseHospitalWebMdView {...props} />;
		case "web-lg":
			return <EmergencyChooseHospitalWebLgView {...props} />;
		case "web-xl":
			return <EmergencyChooseHospitalWebXlView {...props} />;
		case "web-2xl-3xl":
			return <EmergencyChooseHospitalWeb2Xl3XlView {...props} />;
		case "web-ultra-wide":
			return <EmergencyChooseHospitalWebUltraWideView {...props} />;
		case "ios-mobile":
		default:
			return <EmergencyChooseHospitalIOSMobileView {...props} />;
	}
}
