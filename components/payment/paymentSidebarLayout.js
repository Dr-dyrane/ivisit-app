// PULLBACK NOTE: Pass 7 finalization — single source of truth for sidebar layout
// Used by PaymentScreenOrchestrator (header containerLeft) and PaymentStageBase (row layout).
// Mirrors the map's MapExploreLoadingOverlay sidebar formula and HIG sidebar gutters.

// HIG-tuned constants
export const PAYMENT_SIDEBAR_HIG = Object.freeze({
	HEADER_ISLAND_HEIGHT: 56, // ScrollAwareHeader pill nominal height
	HEADER_BREATHING: 28, // breathing room between header pill and content
	SIDEBAR_CORNER_RADIUS: 24, // squircle radius — matches map sheet feel
	SIDEBAR_INNER_PADDING_FALLBACK: 16, // when headerSideInset missing
	SIDEBAR_INNER_PADDING_HORIZONTAL: 12, // tighter horizontal padding on sidebar
	GUTTER_FALLBACK: 16, // gutter when surfaceConfig misses values
	HEADER_TOP_INSET_REDUCTION: 0.6, // multiplier on surfaceConfig.headerTopInset
});

/**
 * Liquid-glass surface tokens (mirrors map MapExploreLoadingOverlay sheet).
 * Apply to sidebar BlurView for parity with map sheet.
 */
export function getPaymentSidebarGlassTokens({ isDarkMode }) {
	return {
		blurIntensity: isDarkMode ? 44 : 52,
		ghostSurface: isDarkMode ? "rgba(8,15,27,0.74)" : "rgba(248,250,252,0.76)",
		tint: isDarkMode ? "dark" : "light",
	};
}

/**
 * Compute sidebar layout values for the payment screen.
 * Returns null when sidebar layout is not active (compact viewports).
 */
export function computePaymentSidebarLayout({ width, surfaceConfig }) {
	const usesSidebarLayout = surfaceConfig?.overlayLayout === "left-sidebar";

	if (!usesSidebarLayout) {
		return {
			usesSidebarLayout: false,
			sidebarWidth: 0,
			sidebarLeft: 0,
			sidebarGutter: 0,
			sidebarInnerPadding: 0,
			sidebarInnerPaddingHorizontal: 0,
			rightPanelLeftPadding: 0,
			rightPanelRightPadding: 0,
			headerContainerLeft: 0,
		};
	}

	// Sidebar width — mirrors map's MapExploreLoadingOverlay formula exactly
	const sidebarWidth = Math.min(
		surfaceConfig.overlaySheetMaxWidth ||
			surfaceConfig.sidebarMaxWidth ||
			Math.max(380, width * 0.38),
		Math.max(320, width - 64),
	);

	// Outer gutter — HIG-tuned via surfaceConfig.overlaySheetSideInset
	const sidebarGutter =
		surfaceConfig.overlaySheetSideInset ??
		surfaceConfig.sidebarOuterInset ??
		PAYMENT_SIDEBAR_HIG.GUTTER_FALLBACK;

	const sidebarLeft = sidebarGutter;

	// Inner vertical padding aligns with header's internal padding (visual alignment of content edges)
	const sidebarInnerPadding =
		surfaceConfig.headerSideInset ?? PAYMENT_SIDEBAR_HIG.SIDEBAR_INNER_PADDING_FALLBACK;
	// Inner horizontal padding — intentionally tighter so cards have more room
	const sidebarInnerPaddingHorizontal = PAYMENT_SIDEBAR_HIG.SIDEBAR_INNER_PADDING_HORIZONTAL;

	// Header containerLeft — sits past sidebar's right edge + gutter (consistent rhythm)
	const headerContainerLeft = sidebarLeft + sidebarWidth + sidebarGutter;

	return {
		usesSidebarLayout: true,
		sidebarWidth,
		sidebarLeft,
		sidebarGutter,
		sidebarInnerPadding,
		sidebarInnerPaddingHorizontal,
		rightPanelLeftPadding: 0, // sidebar's marginRight provides the gap
		rightPanelRightPadding: sidebarGutter,
		headerContainerLeft,
	};
}

/**
 * Compute the top padding the right panel needs to clear the floating header island.
 */
export function computeHeaderClearance({ surfaceConfig, insetsTop = 0 }) {
	return (
		PAYMENT_SIDEBAR_HIG.HEADER_ISLAND_HEIGHT +
		(surfaceConfig?.headerTopInset ?? 14) +
		insetsTop +
		PAYMENT_SIDEBAR_HIG.HEADER_BREATHING
	);
}
