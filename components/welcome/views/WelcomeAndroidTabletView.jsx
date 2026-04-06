import React from "react";
import createWelcomeAndroidTabletTheme from "../welcomeAndroidTablet.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeAndroidTabletView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeAndroidTabletTheme}
			layout="split"
			forceShowChip={true}
			animation={{ duration: 240, tension: 48, friction: 10 }}
		/>
	);
}
