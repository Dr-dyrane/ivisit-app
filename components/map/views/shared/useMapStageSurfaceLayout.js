import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
	isSidebarMapVariant,
	MAP_VIEWPORT_VARIANTS,
} from "../../core/mapViewportConfig";

const STAGE_SHELL_WIDTHS = {
	[MAP_VIEWPORT_VARIANTS.ANDROID_FOLD]: 620,
	[MAP_VIEWPORT_VARIANTS.IOS_PAD]: 420,
	[MAP_VIEWPORT_VARIANTS.ANDROID_TABLET]: 430,
	[MAP_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK]: 456,
	[MAP_VIEWPORT_VARIANTS.WEB_SM_WIDE]: 620,
	[MAP_VIEWPORT_VARIANTS.WEB_MD]: 412,
	[MAP_VIEWPORT_VARIANTS.MACBOOK]: 432,
	[MAP_VIEWPORT_VARIANTS.WEB_LG]: 452,
	[MAP_VIEWPORT_VARIANTS.WEB_XL]: 480,
	[MAP_VIEWPORT_VARIANTS.WEB_2XL_3XL]: 512,
	[MAP_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE]: 540,
};

const STAGE_CONTENT_WIDTHS = {
	[MAP_VIEWPORT_VARIANTS.ANDROID_FOLD]: 560,
	[MAP_VIEWPORT_VARIANTS.IOS_PAD]: 382,
	[MAP_VIEWPORT_VARIANTS.ANDROID_TABLET]: 388,
	[MAP_VIEWPORT_VARIANTS.ANDROID_CHROMEBOOK]: 412,
	[MAP_VIEWPORT_VARIANTS.WEB_SM_WIDE]: 560,
	[MAP_VIEWPORT_VARIANTS.WEB_MD]: 372,
	[MAP_VIEWPORT_VARIANTS.MACBOOK]: 392,
	[MAP_VIEWPORT_VARIANTS.WEB_LG]: 408,
	[MAP_VIEWPORT_VARIANTS.WEB_XL]: 432,
	[MAP_VIEWPORT_VARIANTS.WEB_2XL_3XL]: 458,
	[MAP_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE]: 486,
};

export default function useMapStageSurfaceLayout() {
	const { width } = useWindowDimensions();
	const viewportVariant = useMemo(
		() => getMapViewportVariant({ platform: Platform.OS, width }),
		[width],
	);
	const surfaceConfig = useMemo(
		() => getMapViewportSurfaceConfig(viewportVariant),
		[viewportVariant],
	);
	const isSidebarPresentation = isSidebarMapVariant(viewportVariant);
	const isCenteredModalVariant =
		viewportVariant === MAP_VIEWPORT_VARIANTS.ANDROID_FOLD ||
		viewportVariant === MAP_VIEWPORT_VARIANTS.WEB_SM_WIDE;
	const presentationMode = isSidebarPresentation
		? "sidebar"
		: isCenteredModalVariant
			? "modal"
			: "sheet";
	const targetShellWidth = STAGE_SHELL_WIDTHS[viewportVariant] || null;
	const targetContentWidth = STAGE_CONTENT_WIDTHS[viewportVariant] || null;
	const shellWidth = useMemo(
		() => {
			if (isSidebarPresentation) {
				return Math.min(
					targetShellWidth ||
						surfaceConfig.sidebarMaxWidth ||
						Math.max(400, width * 0.36),
					Math.max(320, width - 48),
				);
			}

			if (isCenteredModalVariant) {
				return Math.min(targetShellWidth || 620, Math.max(320, width - 32));
			}

			return null;
		},
		[
			isCenteredModalVariant,
			isSidebarPresentation,
			surfaceConfig.sidebarMaxWidth,
			targetShellWidth,
			width,
		],
	);
	const centerContent = isSidebarPresentation || isCenteredModalVariant;
	const contentMaxWidth = useMemo(() => {
		if (isCenteredModalVariant) {
			return Math.min(targetContentWidth || 560, Math.max(320, (shellWidth || 0) - 40));
		}
		if (isSidebarPresentation && shellWidth) {
			return Math.min(targetContentWidth || Math.max(320, shellWidth - 40), Math.max(320, shellWidth - 40));
		}
		return null;
	}, [isCenteredModalVariant, isSidebarPresentation, shellWidth, targetContentWidth]);

	return {
		width,
		viewportVariant,
		surfaceConfig,
		isSidebarPresentation,
		isCenteredModalVariant,
		centerContent,
		contentMaxWidth,
		presentationMode,
		shellWidth,
	};
}
