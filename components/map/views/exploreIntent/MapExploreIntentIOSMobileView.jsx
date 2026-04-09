import React from "react";
import MapExploreIntentStageBase from "./MapExploreIntentStageBase";
import { MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import { getMapExploreIntentScreenConfig } from "./mapExploreIntent.screenConfigs";

export default function MapExploreIntentIOSMobileView(props) {
	return (
		<MapExploreIntentStageBase
			{...props}
			variant={MAP_INTENT_VARIANTS.IOS_MOBILE}
			screenConfig={getMapExploreIntentScreenConfig(MAP_INTENT_VARIANTS.IOS_MOBILE)}
		/>
	);
}
