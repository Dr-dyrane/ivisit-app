import { Platform } from "react-native";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value);

export function getViewportSurfaceMetrics({
	width = 393,
	height = 852,
	platform = Platform.OS,
	presentationMode = "sheet",
} = {}) {
	const safeWidth = Math.max(Number(width) || 393, 320);
	const safeHeight = Math.max(Number(height) || 852, 640);
	const isWeb = platform === "web";
	const isWide = safeWidth >= 768;
	const wideWidth = presentationMode === "sheet" ? Math.min(safeWidth, 430) : Math.min(safeWidth, 560);

	const horizontalInset = round(clamp(safeWidth * (isWide ? 0.026 : 0.042), 16, isWide ? 34 : 24));
	const contentInset = round(clamp(safeWidth * (isWide ? 0.03 : 0.046), 18, isWide ? 36 : 28));
	const sectionGap = round(clamp(safeHeight * 0.016, 12, 18));
	const largeGap = round(clamp(safeHeight * 0.022, 18, 24));
	const sheetRadius = round(clamp(wideWidth * 0.082, 28, 38));
	const cardRadius = round(clamp(wideWidth * 0.066, 22, 30));
	const modalRadius = round(clamp(wideWidth * 0.074, 26, 36));
	const chipRadius = round(clamp(wideWidth * 0.038, 14, 18));
	const orbRadius = round(clamp(wideWidth * 0.11, 22, 56));
	const titleWeight = "700";
	const bodyWeight = isWeb ? "400" : "500";
	const primaryButtonHeight = round(clamp(safeHeight * (isWide ? 0.068 : 0.06), 50, isWide ? 68 : 60));
	const secondaryButtonHeight = round(clamp(primaryButtonHeight - 4, 46, 62));
	const ctaRadius = round(clamp(wideWidth * 0.061, 22, 30));

	return {
		insets: {
			horizontal: horizontalInset,
			contentHorizontal: contentInset,
			sectionGap,
			largeGap,
		},
		radius: {
			sheet: sheetRadius,
			card: cardRadius,
			modal: modalRadius,
			chip: chipRadius,
			orb: orbRadius,
		},
		type: {
			headerTitle: round(clamp(wideWidth * 0.054, 20, 28)),
			headerLineHeight: round(clamp(wideWidth * 0.062, 24, 32)),
			titleWeight,
			title: round(clamp(wideWidth * 0.05, 18, 24)),
			titleLineHeight: round(clamp(wideWidth * 0.058, 22, 28)),
			headline: round(clamp(safeWidth * (isWide ? 0.062 : 0.104), 34, isWide ? 92 : 58)),
			headlineLineHeight: round(clamp(safeWidth * (isWide ? 0.068 : 0.116), 38, isWide ? 104 : 62)),
			body: round(clamp(safeWidth * (isWide ? 0.015 : 0.041), 16, 20)),
			bodyLineHeight: round(clamp(safeWidth * (isWide ? 0.021 : 0.058), 24, 30)),
			caption: round(clamp(wideWidth * 0.03, 12, 14)),
			captionLineHeight: round(clamp(wideWidth * 0.038, 15, 18)),
			bodyWeight,
		},
		cta: {
			primaryHeight: primaryButtonHeight,
			secondaryHeight: secondaryButtonHeight,
			radius: ctaRadius,
		},
		welcome: {
			stageMaxWidth: isWide ? Math.min(safeWidth * 0.84, 1180) : safeWidth,
			contentMaxWidth: isWide ? Math.min(safeWidth * 0.42, 560) : safeWidth,
			heroWidth: round(clamp(safeWidth * (isWide ? 0.36 : 0.84), 300, isWide ? 940 : 420)),
			heroHeight: round(clamp(safeHeight * (isWide ? 0.46 : 0.3), 240, isWide ? 680 : 340)),
			logoSize: round(clamp(safeWidth * (isWide ? 0.028 : 0.13), 46, 72)),
			brandSize: round(clamp(safeWidth * (isWide ? 0.022 : 0.078), 28, 44)),
			topPadding: round(clamp(safeHeight * (isWide ? 0.06 : 0.038), 18, 72)),
			bottomPadding: round(clamp(safeHeight * (isWide ? 0.04 : 0.024), 18, 42)),
		},
		modal: {
			contentPadding: round(clamp(wideWidth * 0.046, 18, 34)),
			headerHeight: round(clamp(safeHeight * 0.076, 64, 84)),
			headerButtonSize: round(clamp(wideWidth * 0.092, 38, 46)),
			titleSize: round(clamp(wideWidth * 0.048, 19, 24)),
			titleLineHeight: round(clamp(wideWidth * 0.056, 22, 28)),
		},
		map: {
			sheetSideInset: round(clamp(safeWidth * 0.03, 12, 18)),
			handleWidth: round(clamp(wideWidth * 0.11, 44, 58)),
			handleHeight: 5,
			headerHeight: round(clamp(safeHeight * 0.09, 72, 92)),
			loadingSheetRadius: round(clamp(wideWidth * 0.082, 28, 44)),
			loadingHeaderRadius: round(clamp(wideWidth * 0.054, 24, 30)),
			marker: {
				labelMaxWidth: round(clamp(safeWidth * (isWide ? 0.12 : 0.36), 144, 188)),
				pinSize: round(clamp(safeWidth * 0.058, 22, 30)),
				userHaloSize: round(clamp(safeWidth * 0.074, 28, 36)),
				userRingSize: round(clamp(safeWidth * 0.046, 18, 22)),
				userCoreSize: round(clamp(safeWidth * 0.03, 12, 14)),
			},
		},
	};
}

export default getViewportSurfaceMetrics;
