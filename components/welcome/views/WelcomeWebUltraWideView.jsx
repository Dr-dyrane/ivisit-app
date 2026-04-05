import React from "react";
import createWelcomeWebUltraWideTheme from "../welcomeWebUltraWide.styles";
import WelcomeWideWebView from "./WelcomeWideWebView";

export default function WelcomeWebUltraWideView(props) {
	return (
		<WelcomeWideWebView
			{...props}
			createTheme={createWelcomeWebUltraWideTheme}
			animation={{ duration: 240, tension: 44, friction: 10 }}
		/>
	);
}
