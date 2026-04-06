import React from "react";
import createWelcomeAndroidFoldTheme from "../welcomeAndroidFold.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeAndroidFoldView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeAndroidFoldTheme}
			forceShowChip={true}
			animation={{ duration: 220, tension: 52, friction: 10 }}
		/>
	);
}
