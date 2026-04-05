import React from "react";
import createWelcomeWeb2Xl3XlTheme from "../welcomeWeb2Xl3Xl.styles";
import WelcomeWideWebView from "./WelcomeWideWebView";

export default function WelcomeWeb2Xl3XlView(props) {
	return (
		<WelcomeWideWebView
			{...props}
			createTheme={createWelcomeWeb2Xl3XlTheme}
			animation={{ duration: 240, tension: 46, friction: 10 }}
		/>
	);
}
