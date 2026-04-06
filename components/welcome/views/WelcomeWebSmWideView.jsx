import React from "react";
import createWelcomeWebSmWideTheme from "../welcomeWebSmWide.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeWebSmWideView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeWebSmWideTheme}
			actionContainer="well"
			useActionSlots={true}
			useWebChrome={true}
			scrollNativeID="welcome-web-sm-wide-scroll"
			scrollbarStyleId="welcome-web-sm-wide-scrollbar-style"
			animation={{ duration: 220, tension: 54, friction: 10 }}
		/>
	);
}
