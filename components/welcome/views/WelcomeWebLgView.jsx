import React from "react";
import createWelcomeWebLgTheme from "../welcomeWebLg.styles";
import WelcomeWideWebView from "./WelcomeWideWebView";

export default function WelcomeWebLgView(props) {
	return (
		<WelcomeWideWebView
			{...props}
			createTheme={createWelcomeWebLgTheme}
			animation={{ duration: 240, tension: 50, friction: 10 }}
		/>
	);
}
