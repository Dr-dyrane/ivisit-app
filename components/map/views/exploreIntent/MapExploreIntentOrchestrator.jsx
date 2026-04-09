import React from "react";
import { Platform, useWindowDimensions } from "react-native";
import MapExploreIntentAndroidChromebookView from "./MapExploreIntentAndroidChromebookView";
import MapExploreIntentAndroidFoldView from "./MapExploreIntentAndroidFoldView";
import MapExploreIntentAndroidMobileView from "./MapExploreIntentAndroidMobileView";
import MapExploreIntentAndroidTabletView from "./MapExploreIntentAndroidTabletView";
import MapExploreIntentIOSMobileView from "./MapExploreIntentIOSMobileView";
import MapExploreIntentIOSPadView from "./MapExploreIntentIOSPadView";
import MapExploreIntentMacbookView from "./MapExploreIntentMacbookView";
import MapExploreIntentWeb2Xl3XlView from "./MapExploreIntentWeb2Xl3XlView";
import MapExploreIntentWebLgView from "./MapExploreIntentWebLgView";
import MapExploreIntentWebMobileMdView from "./MapExploreIntentWebMobileMdView";
import MapExploreIntentWebMobileSmView from "./MapExploreIntentWebMobileSmView";
import MapExploreIntentWebSmWideView from "./MapExploreIntentWebSmWideView";
import MapExploreIntentWebUltraWideView from "./MapExploreIntentWebUltraWideView";
import MapExploreIntentWebXlView from "./MapExploreIntentWebXlView";
import { MAP_INTENT_VARIANTS, getMapIntentVariant } from "./mapExploreIntent.content";

export { MAP_INTENT_VARIANTS, getMapIntentVariant } from "./mapExploreIntent.content";

export default function MapExploreIntentOrchestrator(props) {
	const { width } = useWindowDimensions();
	const variant = getMapIntentVariant({ platform: Platform.OS, width });

	switch (variant) {
		case MAP_INTENT_VARIANTS.ANDROID_CHROMEBOOK:
			return <MapExploreIntentAndroidChromebookView {...props} />;
		case MAP_INTENT_VARIANTS.ANDROID_TABLET:
			return <MapExploreIntentAndroidTabletView {...props} />;
		case MAP_INTENT_VARIANTS.ANDROID_FOLD:
			return <MapExploreIntentAndroidFoldView {...props} />;
		case MAP_INTENT_VARIANTS.MACBOOK:
			return <MapExploreIntentMacbookView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_LG:
			return <MapExploreIntentWebLgView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_XL:
			return <MapExploreIntentWebXlView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_2XL_3XL:
			return <MapExploreIntentWeb2Xl3XlView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_ULTRA_WIDE:
			return <MapExploreIntentWebUltraWideView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_MD:
			return <MapExploreIntentWebMobileMdView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_SM_WIDE:
			return <MapExploreIntentWebSmWideView {...props} />;
		case MAP_INTENT_VARIANTS.IOS_PAD:
			return <MapExploreIntentIOSPadView {...props} />;
		case MAP_INTENT_VARIANTS.ANDROID_MOBILE:
			return <MapExploreIntentAndroidMobileView {...props} />;
		case MAP_INTENT_VARIANTS.WEB_MOBILE:
			return <MapExploreIntentWebMobileSmView {...props} />;
		case MAP_INTENT_VARIANTS.IOS_MOBILE:
		default:
			return <MapExploreIntentIOSMobileView {...props} />;
	}
}
