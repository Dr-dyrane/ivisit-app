import React from "react";
import createWelcomeAndroidChromebookTheme from "../welcomeAndroidChromebook.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeAndroidChromebookView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeAndroidChromebookTheme}
			layout="split"
			forceShowChip={true}
			animation={{ duration: 240, tension: 48, friction: 10 }}
		/>
	);
}
