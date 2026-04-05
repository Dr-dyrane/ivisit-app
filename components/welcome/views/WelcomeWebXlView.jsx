import React from "react";
import createWelcomeWebXlTheme from "../welcomeWebXl.styles";
import WelcomeWideWebView from "./WelcomeWideWebView";

export default function WelcomeWebXlView(props) {
	return (
		<WelcomeWideWebView
			{...props}
			createTheme={createWelcomeWebXlTheme}
			animation={{ duration: 240, tension: 48, friction: 10 }}
		/>
	);
}
