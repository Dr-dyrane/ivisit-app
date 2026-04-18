import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value);

export default function useMapStageResponsiveMetrics({
	presentationMode = "sheet",
} = {}) {
	const { width, height } = useWindowDimensions();

	return useMemo(() => {
		const baseWidth =
			presentationMode === "sheet"
				? Math.min(width || 393, 430)
				: Math.min(width || 393, 520);
		const viewportHeight = Math.max(height || 852, 640);
		const titleWeight = Platform.OS === "web" ? "700" : "800";
		const mediumWeight = Platform.OS === "web" ? "500" : "600";
		const compactWeight = Platform.OS === "web" ? "400" : "500";

		const topHorizontal = round(clamp(baseWidth * 0.034, 12, 18));
		const heroRadius = round(clamp(baseWidth * 0.072, 26, 32));
		const heroMinHeight = round(clamp(viewportHeight * 0.185, 154, 176));
		const heroPaddingX = round(clamp(baseWidth * 0.041, 14, 18));
		const heroPaddingY = round(clamp(viewportHeight * 0.015, 11, 15));
		const metaPillHeight = round(clamp(viewportHeight * 0.035, 28, 32));
		const switchPillHeight = round(clamp(viewportHeight * 0.049, 40, 46));
		const switchGap = round(clamp(baseWidth * 0.018, 6, 8));
		const routeRadius = round(clamp(baseWidth * 0.066, 24, 28));
		const cardRadius = round(clamp(baseWidth * 0.061, 22, 26));
		const expandedRadius = round(clamp(baseWidth * 0.053, 18, 22));
		const footerButtonHeight = round(clamp(viewportHeight * 0.06, 50, 56));
		const footerButtonRadius = round(clamp(baseWidth * 0.061, 22, 28));
		const bedSwitchPillWidth = round(clamp(baseWidth / 3.38, 82, 114));

		return {
			width,
			height: viewportHeight,
			topSlot: {
				containerStyle: {
					paddingHorizontal: topHorizontal,
					paddingBottom: round(clamp(viewportHeight * 0.012, 8, 11)),
				},
				titleStyle: {
					fontSize: round(clamp(baseWidth * 0.066, 24, 28)),
					lineHeight: round(clamp(baseWidth * 0.074, 28, 32)),
					fontWeight: titleWeight,
					letterSpacing: Platform.OS === "web" ? -0.4 : -0.6,
				},
				subtitleStyle: {
					fontSize: round(clamp(baseWidth * 0.03, 11, 12)),
					lineHeight: round(clamp(baseWidth * 0.041, 15, 16)),
					fontWeight: "400",
				},
			},
			section: {
				gapStyle: {
					height: round(clamp(viewportHeight * 0.016, 12, 16)),
				},
				spacerStyle: {
					height: round(clamp(viewportHeight * 0.018, 14, 18)),
				},
				largeSpacerStyle: {
					height: round(clamp(viewportHeight * 0.022, 18, 22)),
				},
			},
			hero: {
				cardStyle: {
					borderRadius: heroRadius,
					paddingHorizontal: heroPaddingX,
					paddingTop: heroPaddingY,
					paddingBottom: heroPaddingY,
					minHeight: heroMinHeight,
				},
				artworkStyle: {
					right: round(clamp(baseWidth * -0.026, -12, -8)),
					left: round(clamp(baseWidth * 0.122, 44, 56)),
					top: round(clamp(viewportHeight * 0.007, 6, 8)),
					bottom: round(clamp(viewportHeight * -0.005, -4, -2)),
				},
				detailChipStyle: {
					width: round(clamp(baseWidth * 0.076, 30, 34)),
					height: round(clamp(baseWidth * 0.076, 30, 34)),
				},
				titleStyle: {
					fontSize: round(clamp(baseWidth * 0.056, 20, 24)),
					lineHeight: round(clamp(baseWidth * 0.066, 24, 28)),
					fontWeight: titleWeight,
					letterSpacing: Platform.OS === "web" ? -0.28 : -0.45,
				},
				summaryStyle: {
					fontSize: round(clamp(baseWidth * 0.036, 13, 15)),
					lineHeight: round(clamp(baseWidth * 0.051, 18, 20)),
					fontWeight: mediumWeight,
				},
				metaRowStyle: {
					gap: switchGap,
					marginTop: round(clamp(viewportHeight * 0.013, 9, 12)),
				},
				metaPillStyle: {
					height: metaPillHeight,
					paddingHorizontal: round(clamp(baseWidth * 0.028, 10, 12)),
					borderRadius: round(metaPillHeight / 2),
				},
				metaLabelStyle: {
					fontSize: round(clamp(baseWidth * 0.03, 11, 12)),
					lineHeight: round(clamp(baseWidth * 0.036, 13, 14)),
					fontWeight: compactWeight,
				},
			},
			switch: {
				rowStyle: {
					gap: switchGap,
				},
				pillStyle: {
					minHeight: switchPillHeight,
					paddingHorizontal: round(clamp(baseWidth * 0.02, 7, 10)),
					paddingVertical: round(clamp(viewportHeight * 0.005, 3, 5)),
					borderRadius: round(clamp(baseWidth * 0.041, 15, 18)),
				},
				labelStyle: {
					fontSize: round(clamp(baseWidth * 0.028, 10, 12)),
					lineHeight: round(clamp(baseWidth * 0.031, 11, 13)),
					fontWeight: "400",
				},
				railContentStyle: {
					gap: switchGap,
				},
				bedPillWidth: bedSwitchPillWidth,
			},
			route: {
				cardStyle: {
					borderRadius: routeRadius,
					paddingHorizontal: round(clamp(baseWidth * 0.041, 14, 18)),
					paddingVertical: round(clamp(viewportHeight * 0.012, 9, 12)),
				},
				connectorStyle: {
					height: round(clamp(viewportHeight * 0.031, 22, 28)),
				},
				stopGapStyle: {
					height: round(clamp(viewportHeight * 0.021, 14, 20)),
				},
				titleStyle: {
					fontSize: round(clamp(baseWidth * 0.041, 15, 17)),
					lineHeight: round(clamp(baseWidth * 0.046, 18, 20)),
					fontWeight: mediumWeight,
				},
				metaStyle: {
					fontSize: round(clamp(baseWidth * 0.033, 12, 13)),
					lineHeight: round(clamp(baseWidth * 0.043, 16, 17)),
					fontWeight: "400",
				},
				metricPrimaryStyle: {
					fontSize: round(clamp(baseWidth * 0.041, 15, 17)),
					lineHeight: round(clamp(baseWidth * 0.048, 18, 20)),
					fontWeight: titleWeight,
				},
				metricSecondaryStyle: {
					fontSize: round(clamp(baseWidth * 0.03, 11, 12)),
					lineHeight: round(clamp(baseWidth * 0.038, 14, 15)),
					fontWeight: compactWeight,
				},
			},
			panel: {
				cardStyle: {
					borderRadius: cardRadius,
					paddingHorizontal: round(clamp(baseWidth * 0.041, 14, 18)),
					paddingVertical: round(clamp(viewportHeight * 0.016, 12, 16)),
				},
				summaryStyle: {
					fontSize: round(clamp(baseWidth * 0.036, 13, 14)),
					lineHeight: round(clamp(baseWidth * 0.048, 18, 20)),
					fontWeight: compactWeight,
				},
				featureStyle: {
					fontSize: round(clamp(baseWidth * 0.033, 12, 13)),
					lineHeight: round(clamp(baseWidth * 0.046, 17, 19)),
					fontWeight: "400",
				},
			},
			expanded: {
				rowStyle: {
					minHeight: round(clamp(viewportHeight * 0.091, 74, 84)),
					borderRadius: expandedRadius,
					paddingHorizontal: round(clamp(baseWidth * 0.036, 13, 15)),
					paddingVertical: round(clamp(viewportHeight * 0.012, 10, 12)),
				},
				iconWrapStyle: {
					width: round(clamp(baseWidth * 0.091, 34, 38)),
					height: round(clamp(baseWidth * 0.091, 34, 38)),
					borderRadius: round(clamp(baseWidth * 0.046, 17, 19)),
				},
				titleStyle: {
					fontSize: round(clamp(baseWidth * 0.043, 16, 18)),
					lineHeight: round(clamp(baseWidth * 0.051, 20, 22)),
					fontWeight: titleWeight,
				},
				metaStyle: {
					fontSize: round(clamp(baseWidth * 0.033, 12, 13)),
					lineHeight: round(clamp(baseWidth * 0.043, 16, 17)),
					fontWeight: "400",
				},
				imageStyle: {
					width: round(clamp(baseWidth * 0.183, 68, 84)),
					height: round(clamp(viewportHeight * 0.068, 52, 60)),
				},
			},
			footer: {
				dockStyle: {
					paddingHorizontal: round(clamp(baseWidth * 0.03, 10, 14)),
					paddingTop: round(clamp(viewportHeight * 0.009, 6, 10)),
					paddingBottom: round(clamp(viewportHeight * 0.012, 8, 12)),
				},
				buttonHeight: footerButtonHeight,
				buttonRadius: footerButtonRadius,
			},
		};
	}, [height, presentationMode, width]);
}
