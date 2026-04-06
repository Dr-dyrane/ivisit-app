import React from "react";
import createWelcomePadTheme from "../welcomePad.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeIOSPadView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomePadTheme}
			forceShowChip={true}
			animation={{ duration: 260, tension: 50, friction: 10 }}
		/>
	);
}
