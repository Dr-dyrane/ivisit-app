import buildWideWebWelcomeTheme from "./buildWideWebWelcomeTheme";

export function createWelcomeWebXlTheme({
	viewportHeight = 1040,
	viewportWidth = 1280,
	isDarkMode = true,
} = {}) {
	return buildWideWebWelcomeTheme({
		surface: "web-xl",
		viewportHeight,
		viewportWidth,
		isDarkMode,
		panelDark: "rgba(12, 18, 32, 0.48)",
		panelLight: "rgba(255,255,255,0.58)",
		panelRingLight: "rgba(255,255,255,0.86)",
		resolveMetrics: ({ viewportHeight: currentHeight, viewportWidth: currentWidth }) => ({
			viewportHeight: currentHeight,
			topPadding: currentHeight < 920 ? 42 : 58,
			bottomPadding: 40,
			horizontalPadding: 56,
			stageWidth: Math.min(Math.max(currentWidth - 120, 1400), 1660),
			leftColumnWidth: Math.min(Math.max(currentWidth * 0.31, 470), 560),
			logoSize: 58,
			brandSize: 36,
			brandMarginTop: 12,
			brandLetterSpacing: -1.1,
			heroWidth: Math.min(Math.max(currentWidth * 0.36, 620), 760),
			heroHeight: Math.min(Math.max(currentHeight * 0.48, 430), 560),
			heroPanelExtraHeight: 90,
			heroPanelRadius: 48,
			heroShadowRadius: 30,
			heroShadowHeight: 20,
			heroRingScale: 0.8,
			headlineSize: currentWidth >= 1680 ? 80 : 74,
			headlineLineHeight: currentWidth >= 1680 ? 84 : 78,
			headlineLetterSpacing: -2,
			helperSize: 23,
			helperLineHeight: 34,
			helperMaxWidth: 500,
			primaryActionHeight: 68,
			secondaryActionHeight: 62,
			actionsMaxWidth: 500,
			secondaryActionMaxWidth: 450,
			signInSize: 18,
			signInLineHeight: 24,
			stageSpacing: {
				brandToHeadline: 38,
				headlineToHelper: 18,
				helperToChip: 20,
				chipToActions: 40,
				actionGap: 14,
				signInTop: 18,
				columnGap: currentWidth >= 1680 ? 96 : 76,
			},
		}),
	});
}

export default createWelcomeWebXlTheme;
