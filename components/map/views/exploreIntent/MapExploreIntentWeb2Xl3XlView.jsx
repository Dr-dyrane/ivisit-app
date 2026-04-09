import React from "react";
import MapExploreIntentStageBase from "./MapExploreIntentStageBase";
import { MAP_INTENT_VARIANTS } from "./mapExploreIntent.content";
import { getMapExploreIntentScreenConfig } from "./mapExploreIntent.screenConfigs";

export default function MapExploreIntentWeb2Xl3XlView(props) {
	return (
		<MapExploreIntentStageBase
			{...props}
			variant={MAP_INTENT_VARIANTS.WEB_2XL_3XL}
			screenConfig={getMapExploreIntentScreenConfig(MAP_INTENT_VARIANTS.WEB_2XL_3XL)}
		/>
	);
}
