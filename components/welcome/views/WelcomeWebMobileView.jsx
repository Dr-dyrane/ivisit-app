import React from "react";
import createWelcomeWebMobileTheme from "../welcomeWebMobile.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeWebMobileView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeWebMobileTheme}
			actionContainer="well"
			useWebChrome={true}
			scrollNativeID="welcome-web-mobile-scroll"
			scrollbarStyleId="welcome-web-mobile-scrollbar-style"
			animation={{ duration: 220, tension: 54, friction: 10 }}
		/>
	);
}
