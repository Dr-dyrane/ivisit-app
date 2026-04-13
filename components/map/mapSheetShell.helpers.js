import { MAP_SHEET_SNAP_INDEX, MAP_SHEET_SNAP_STATES } from "./core/mapSheet.constants";

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
	insets,
	sidebarTopInset = 14,
	sidebarBottomInset = 14,
	sidebarContentTopPadding = 6,
	sidebarContentBottomPadding = 6,
}) {
	const sidebarSafeTopOffset = Math.max(0, (insets?.top || 0) - sidebarTopInset);
	const sidebarSafeBottomOffset = Math.max(0, (insets?.bottom || 0) - sidebarBottomInset);
	return {
		contentPaddingTop: isSidebar ? sidebarContentTopPadding + sidebarSafeTopOffset : topPadding,
		contentPaddingBottom: isSidebar
			? sidebarContentBottomPadding + sidebarSafeBottomOffset
			: bottomPadding,
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
	viewportHeight,
	sidebarOuterInset = 14,
	sidebarTopInset = 14,
	sidebarBottomInset = 14,
	sidebarMaxHeightRatio = 0.92,
}) {
	if (isSidebar) {
		const availableHeight = Math.max(320, (viewportHeight || 0) - sidebarTopInset - sidebarBottomInset);
		const resolvedSidebarHeight =
			viewportHeight && sidebarMaxHeightRatio
				? Math.min(availableHeight, Math.max(320, viewportHeight * sidebarMaxHeightRatio))
				: availableHeight;
		const sidebarVerticalOffset = Math.max(0, (availableHeight - resolvedSidebarHeight) / 2);
		return {
			left: Math.max(0, sidebarOuterInset),
			top: Math.max(0, sidebarTopInset + sidebarVerticalOffset),
			width: useFloatingShell ? shellWidth : undefined,
			height: resolvedSidebarHeight,
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
