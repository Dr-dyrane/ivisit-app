import { useMemo } from "react";
import { Platform } from "react-native";
import useAuthViewport from "./useAuthViewport";
import getViewportSurfaceMetrics from "../../utils/ui/viewportSurfaceMetrics";

export default function useResponsiveSurfaceMetrics({
	presentationMode = "sheet",
} = {}) {
	const viewport = useAuthViewport();
	const width = viewport.visibleWidth || viewport.width;
	const height = viewport.visibleHeight || viewport.height;

	return useMemo(
		() =>
			getViewportSurfaceMetrics({
				width,
				height,
				platform: Platform.OS,
				presentationMode,
			}),
		[height, presentationMode, width],
	);
}
