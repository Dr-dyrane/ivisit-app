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
		borderTopLeftRadius: sheetRadius,
		borderTopRightRadius: sheetRadius,
		borderBottomLeftRadius: sheetRadius,
		borderBottomRightRadius: sheetRadius,
	};
}

export function getMapSheetContentPadding({
	isSidebar,
	topPadding,
	bottomPadding,
	sidebarContentTopPadding = 6,
	sidebarContentBottomPadding = 6,
}) {
	return {
		contentPaddingTop: isSidebar ? sidebarContentTopPadding : topPadding,
		contentPaddingBottom: isSidebar ? sidebarContentBottomPadding : bottomPadding,
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
	insets,
	sidebarOuterInset = 14,
	sidebarTopInset = 14,
	sidebarBottomInset = 14,
}) {
	if (isSidebar) {
		return {
			left: Math.max(0, sidebarOuterInset),
			top: Math.max(insets?.top || 0, sidebarTopInset),
			bottom: Math.max(insets?.bottom || 0, sidebarBottomInset),
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
