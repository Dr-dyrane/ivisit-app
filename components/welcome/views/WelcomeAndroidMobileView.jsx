import React from "react";
import createWelcomeAndroidMobileTheme from "../welcomeAndroidMobile.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeAndroidMobileView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeAndroidMobileTheme}
			actionContainer="well"
			animation={{ duration: 220, tension: 54, friction: 10 }}
		/>
	);
}
