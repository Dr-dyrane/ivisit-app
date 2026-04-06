import React from "react";
import createWelcomeMobileTheme from "../welcomeMobile.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeIOSMobileView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeMobileTheme}
			actionContainer="well"
			animation={{ duration: 240, tension: 52, friction: 10 }}
		/>
	);
}
