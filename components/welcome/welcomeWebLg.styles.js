import buildWideWebWelcomeTheme from "./buildWideWebWelcomeTheme";

export function createWelcomeWebLgTheme({
	viewportHeight = 980,
	viewportWidth = 1024,
	isDarkMode = true,
} = {}) {
	return buildWideWebWelcomeTheme({
		surface: "web-lg",
		viewportHeight,
		viewportWidth,
		isDarkMode,
		panelDark: "rgba(12, 18, 32, 0.52)",
		panelLight: "rgba(255,255,255,0.58)",
		panelRingLight: "rgba(255,255,255,0.86)",
		resolveMetrics: ({ viewportHeight: currentHeight, viewportWidth: currentWidth }) => ({
			viewportHeight: currentHeight,
			topPadding: currentHeight < 860 ? 38 : 52,
			bottomPadding: 36,
			horizontalPadding: 48,
			stageWidth: Math.min(Math.max(currentWidth - 96, 1160), 1380),
			leftColumnWidth: Math.min(Math.max(currentWidth * 0.34, 430), 500),
			logoSize: 56,
			brandSize: 34,
			brandMarginTop: 12,
			brandLetterSpacing: -1.1,
			heroWidth: Math.min(Math.max(currentWidth * 0.34, 470), 620),
			heroHeight: Math.min(Math.max(currentHeight * 0.42, 360), 470),
			heroPanelExtraHeight: 72,
			heroPanelRadius: 44,
			heroShadowRadius: 28,
			heroShadowHeight: 18,
			heroRingScale: 0.82,
			headlineSize: currentWidth >= 1440 ? 72 : 66,
			headlineLineHeight: currentWidth >= 1440 ? 76 : 70,
			headlineLetterSpacing: -1.8,
			helperSize: 22,
			helperLineHeight: 32,
			helperMaxWidth: 460,
			primaryActionHeight: 66,
			secondaryActionHeight: 60,
			actionsMaxWidth: 460,
			secondaryActionMaxWidth: 420,
			signInSize: 18,
			signInLineHeight: 24,
			stageSpacing: {
				brandToHeadline: 36,
				headlineToHelper: 18,
				helperToChip: 18,
				chipToActions: 36,
				actionGap: 14,
				signInTop: 18,
				columnGap: currentWidth >= 1440 ? 76 : 60,
			},
		}),
	});
}

export default createWelcomeWebLgTheme;
