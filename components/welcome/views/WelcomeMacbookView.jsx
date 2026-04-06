import React from "react";
import createWelcomeMacbookTheme from "../welcomeMacbook.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeMacbookView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeMacbookTheme}
			layout="split"
			forceShowChip={true}
			animation={{ duration: 260, tension: 48, friction: 10 }}
		/>
	);
}
