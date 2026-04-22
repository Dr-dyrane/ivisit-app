import React from "react";
import createWelcomeWebMdTheme from "../welcomeWebMd.styles";
import WelcomeStageBase from "./WelcomeStageBase";

export default function WelcomeWebMdView(props) {
	return (
		<WelcomeStageBase
			{...props}
			createTheme={createWelcomeWebMdTheme}
			layout="split"
			resolveThemeOverrides={({ width }) => ({
				horizontalPadding: width >= 960 ? 40 : 32,
			})}
			useActionSlots={true}
			useWebChrome={true}
			animation={{ duration: 240, tension: 52, friction: 10 }}
		/>
	);
}
