import { MAP_SHEET_SNAP_INDEX, MAP_SHEET_SNAP_STATES } from "./mapSheet.constants";

export function getResolvedMapSheetState({ presentationMode = "sheet", snapState, platformMotion }) {
	const isSidebar = presentationMode === "sidebar";
	const resolvedSnapState = isSidebar ? MAP_SHEET_SNAP_STATES.EXPANDED : snapState;
	const isCollapsed = resolvedSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const snapTarget =
		MAP_SHEET_SNAP_INDEX[resolvedSnapState] ??
		MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF];
	const shouldUseHeaderGestureRegion =
		!isSidebar && Boolean(platformMotion?.sheet?.enableHeaderGestureRegion);
	const shouldUseBodyGestureRegion =
		!isSidebar &&
		Boolean(platformMotion?.sheet?.enableBodyGestureRegion) &&
		(
			resolvedSnapState !== MAP_SHEET_SNAP_STATES.EXPANDED ||
			Boolean(platformMotion?.sheet?.enableBodyGestureInExpandedState)
		);

	return {
		isSidebar,
		resolvedSnapState,
		isCollapsed,
		snapTarget,
		shouldUseHeaderGestureRegion,
		shouldUseBodyGestureRegion,
	};
}

export function getMapSheetSidebarShapeStyle(sheetRadius) {
	return {
		borderTopLeftRadius: 0,
		borderTopRightRadius: sheetRadius,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: sheetRadius,
	};
}

export function getMapSheetContentPadding({ isSidebar, insets, topPadding, bottomPadding }) {
	return {
		contentPaddingTop: isSidebar ? insets.top + 12 : topPadding,
		contentPaddingBottom: isSidebar ? Math.max(insets.bottom, 14) : bottomPadding,
	};
}

export function getMapSheetHostLayout({
	isSidebar,
	useFloatingShell,
	shellWidth,
	sideInset,
	bottomInset,
	sheetHeight,
	dragTranslateY,
}) {
	if (isSidebar) {
		return {
			left: 0,
			top: 0,
			bottom: 0,
			width: useFloatingShell ? shellWidth : undefined,
			height: undefined,
			transform: [{ translateY: 0 }],
		};
	}

	return {
		left: useFloatingShell ? undefined : sideInset,
		right: useFloatingShell ? undefined : sideInset,
		width: useFloatingShell ? shellWidth : undefined,
		bottom: bottomInset,
		height: sheetHeight,
		transform: [{ translateY: dragTranslateY }],
	};
}
