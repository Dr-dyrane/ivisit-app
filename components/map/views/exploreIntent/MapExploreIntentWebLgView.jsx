import React from "react";
import MapExploreIntentStageBase from "./MapExploreIntentStageBase";
import { MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import { getMapExploreIntentScreenConfig } from "./mapExploreIntent.screenConfigs";

export default function MapExploreIntentWebLgView(props) {
	return (
		<MapExploreIntentStageBase
			{...props}
			variant={MAP_INTENT_VARIANTS.WEB_LG}
			screenConfig={getMapExploreIntentScreenConfig(MAP_INTENT_VARIANTS.WEB_LG)}
		/>
	);
}
