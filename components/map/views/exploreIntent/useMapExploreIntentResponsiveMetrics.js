import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import getViewportSurfaceMetrics from "../../../../utils/ui/viewportSurfaceMetrics";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value);

export default function useMapExploreIntentResponsiveMetrics() {
	const { width, height } = useWindowDimensions();

	return useMemo(() => {
		const viewportMetrics = getViewportSurfaceMetrics({
			width,
			height,
			platform: Platform.OS,
			presentationMode: "sheet",
		});
		const baseWidth = Math.min(width || 393, 430);
		const baseHeight = Math.max(height || 852, 640);
		const isTight = width <= 390 || height <= 760;
		const isVeryTight = width <= 360 || height <= 700;
		const searchPillHeight = clamp(round(baseHeight * 0.055), 38, 44);
		const searchPillCollapsedHeight = clamp(searchPillHeight - 6, 34, 38);
		const orbSize = clamp(round(baseWidth * 0.2), 68, 88);
		const orbIconSize = clamp(round(orbSize * 0.42), 28, 38);
		const sectionInset = clamp(round(baseWidth * 0.044), 14, 18);
		const compactInset = clamp(round(baseWidth * 0.036), 12, 16);
		const panelCardPaddingX = clamp(round(baseWidth * 0.036), 13, 16);
		const panelCardPaddingY = clamp(round(baseHeight * 0.017), 12, 15);
		const featureGap = isVeryTight ? 8 : 10;
		const featurePadding = isVeryTight ? 12 : 14;

		return {
			isTight,
			isVeryTight,
			topRow: {
				rowStyle: isTight
					? {
							paddingHorizontal: compactInset,
							gap: isVeryTight ? 8 : 9,
							marginBottom: isVeryTight ? 16 : 18,
					  }
					: null,
				searchPillStyle: isTight
					? {
							minHeight: searchPillHeight,
							paddingHorizontal: isVeryTight ? 13 : 14,
							gap: isVeryTight ? 7 : 8,
					  }
					: null,
				searchPillCollapsedStyle: isTight
					? {
							minHeight: searchPillCollapsedHeight,
							paddingHorizontal: 11,
					  }
					: null,
				searchIconSize: isTight ? 18 : 19,
				searchIconCollapsedSize: isTight ? 16 : 17,
				searchTextStyle: isTight
					? {
							fontSize: isVeryTight ? 14 : 15,
							lineHeight: isVeryTight ? 18 : 19,
					  }
					: null,
				avatarSize: isTight ? clamp(round(baseWidth * 0.102), 38, 40) : 42,
				avatarCollapsedSize: isTight ? clamp(round(baseWidth * 0.094), 34, 36) : 38,
				avatarGlyphSize: isTight ? (isVeryTight ? 38 : 40) : 42,
				avatarGlyphCollapsedSize: isTight ? 34 : 38,
				avatarDotSize: isTight ? 10 : 12,
				avatarDotCollapsedSize: isTight ? 8 : 10,
			},
			body: {
				scrollContentStyle: isTight
					? {
							paddingBottom: clamp(round(baseHeight * 0.015), 8, 12),
					  }
					: null,
				scrollContentWebMobileStyle: isTight
					? {
							paddingBottom: clamp(round(baseHeight * 0.018), 10, 14),
					  }
					: null,
			},
			section: {
				labelStyle: isTight
					? {
							fontSize: isVeryTight ? 14 : 15,
							lineHeight: isVeryTight ? 18 : 19,
					  }
					: null,
				triggerStyle: isTight
					? {
							marginBottom: isVeryTight ? 18 : 20,
					  }
					: null,
				contentInsetStyle: isTight ? { paddingHorizontal: sectionInset } : null,
				contentInsetWebMobileStyle: isTight ? { paddingHorizontal: compactInset } : null,
				contentInsetWebMobileMdStyle: isTight ? { paddingHorizontal: sectionInset } : null,
				panelRowStyle: isTight ? { gap: isVeryTight ? 12 : 14 } : null,
				expandedSectionStyle: isTight ? { marginTop: isVeryTight ? 18 : 20 } : null,
				expandedHeaderStyle: isTight
					? {
							paddingHorizontal: sectionInset,
							marginBottom: isVeryTight ? 8 : 10,
					  }
					: null,
				footerTextStyle: isTight
					? {
							fontSize: 12,
							lineHeight: 16,
					  }
					: null,
			},
			care: {
				rowStyle: isTight
					? {
							gap: isVeryTight ? 4 : 6,
							paddingRight: isVeryTight ? 2 : 6,
					  }
					: null,
				orb: {
					actionStyle: isTight ? { paddingVertical: 0 } : null,
					shadowWrapStyle: isTight
						? {
								width: orbSize,
								height: orbSize,
								borderRadius: Math.round(orbSize / 2),
								marginBottom: isVeryTight ? 8 : 9,
						  }
						: null,
					iconWrapStyle: isTight
						? {
								width: orbSize,
								height: orbSize,
								borderRadius: Math.round(orbSize / 2),
						  }
						: null,
					iconSize: isTight ? orbIconSize : 38,
					labelStyle: isTight
						? {
								fontSize: isVeryTight ? 13 : 14,
								lineHeight: isVeryTight ? 17 : 18,
						  }
						: null,
					subtextStyle: isTight
						? {
								marginTop: 2,
								fontSize: 11,
								lineHeight: 14,
						  }
						: null,
				},
				panelGridStyle: isTight ? { gap: isVeryTight ? 8 : 10 } : null,
				panelBottomRowStyle: isTight ? { gap: isVeryTight ? 4 : 6 } : null,
				actionStackStyle: isTight ? { gap: isVeryTight ? 8 : 10 } : null,
				actionRowStyle: isTight ? { gap: isVeryTight ? 4 : 6 } : null,
				cardSurfaceStyle: isTight
					? {
							paddingHorizontal: panelCardPaddingX,
							paddingVertical: panelCardPaddingY,
							borderRadius: isVeryTight ? 20 : 22,
					  }
					: null,
				cardSurfacePrimaryStyle: isTight
					? {
							minHeight: isVeryTight ? 92 : 98,
							paddingLeft: isVeryTight ? 16 : 18,
							paddingRight: 11,
					  }
					: null,
				cardSurfaceSecondaryStyle: isTight
					? {
							minHeight: isVeryTight ? 76 : 82,
					  }
					: null,
				cardIconWrapStyle: isTight
					? {
							width: isVeryTight ? 38 : 40,
							height: isVeryTight ? 38 : 40,
							borderRadius: isVeryTight ? 12 : 13,
					  }
					: null,
				cardPrimaryIconSize: isTight ? 22 : 24,
				cardSecondaryIconSize: isTight ? 19 : 21,
				cardLabelStyle: isTight
					? {
							marginTop: isVeryTight ? 12 : 14,
							fontSize: isVeryTight ? 15 : 16,
							lineHeight: isVeryTight ? 18 : 19,
					  }
					: null,
				cardSubtextStyle: isTight
					? {
							marginTop: 3,
							fontSize: 11,
							lineHeight: 14,
					  }
					: null,
				cardChevronStyle: isTight
					? {
							width: 20,
							height: 20,
							borderRadius: 10,
					  }
					: null,
				cardCheckStyle: isTight
					? {
							width: 20,
							height: 20,
							borderRadius: 10,
					  }
					: null,
			},
			summary: {
				iconSize: isTight ? clamp(round(viewportMetrics.radius.orb * 0.92), 36, 40) : 42,
				compactIconSize: isTight ? clamp(round(viewportMetrics.radius.orb * 0.7), 28, 32) : 30,
				cardStyle: isTight
					? {
							paddingHorizontal: isVeryTight ? 12 : 13,
							paddingVertical: isVeryTight ? 11 : 12,
							gap: isVeryTight ? 11 : 12,
							marginBottom: isVeryTight ? 18 : 20,
					  }
					: null,
				heroCardStyle: isTight
					? {
							marginBottom: isVeryTight ? 18 : 20,
							paddingHorizontal: isVeryTight ? 14 : 16,
							paddingTop: isVeryTight ? 14 : 16,
							paddingBottom: isVeryTight ? 13 : 14,
					  }
					: null,
				eyebrowStyle: isTight ? { fontSize: 10, lineHeight: 13 } : null,
				titleStyle: isTight
					? {
							marginTop: 3,
							fontSize: isVeryTight ? 16 : 17,
							lineHeight: isVeryTight ? 20 : 21,
					  }
					: null,
				metaStyle: isTight
					? {
							marginTop: 3,
							fontSize: 12,
							lineHeight: 16,
					  }
					: null,
				signalPillStyle: isTight ? { paddingHorizontal: 9, paddingVertical: 5 } : null,
				signalTextStyle: isTight ? { fontSize: 10, lineHeight: 13 } : null,
			},
			featured: {
				scrollContentStyle: isTight
					? {
							paddingLeft: featurePadding,
							paddingRight: featurePadding,
							gap: featureGap,
					  }
					: null,
				containedScrollContentStyle: isTight
					? {
							paddingLeft: 2,
							paddingRight: 2,
							gap: featureGap,
					  }
					: null,
				minCardWidth: isVeryTight ? 160 : isTight ? 168 : 172,
				maxCardWidth: isVeryTight ? 198 : isTight ? 204 : 208,
				containedMaxCardWidth: isVeryTight ? 224 : isTight ? 230 : 236,
				heightRatio: isTight ? 1.24 : 1.32,
				containedHeightRatio: isTight ? 1.18 : 1.24,
				headerStyle: isTight
					? {
							paddingHorizontal: isVeryTight ? 8 : 10,
							paddingTop: isVeryTight ? 8 : 9,
					  }
					: null,
				topPillStyle: isTight ? { paddingHorizontal: 8, paddingVertical: 4 } : null,
				topPillTextStyle: isTight ? { fontSize: 10, lineHeight: 13 } : null,
				contentStyle: isTight
					? {
							paddingHorizontal: isVeryTight ? 10 : 11,
							paddingVertical: isVeryTight ? 10 : 11,
					  }
					: null,
				titleStyle: isTight
					? {
							fontSize: isVeryTight ? 15 : 16,
							lineHeight: isVeryTight ? 19 : 20,
					  }
					: null,
				metaStyle: isTight ? { fontSize: 11, lineHeight: 14 } : null,
			},
		};
	}, [height, width]);
}
