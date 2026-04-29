// PULLBACK NOTE: Pass 7 finalization — single source of truth for sidebar layout
// Used by PaymentScreenOrchestrator (header containerLeft) and PaymentStageBase (row layout).
// Mirrors the map's MapExploreLoadingOverlay sidebar formula and HIG sidebar gutters.
import { STACK_VIEWPORT_VARIANTS } from '../../utils/ui/stackViewportConfig';

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
 * Compute third column (right context island) layout for XL+ viewports.
 * Returns usesThirdColumn=false on all non-XL variants — callers gate on this.
 *
 * Geometry contract:
 *   - Right island is position:absolute, right=sidebarGutter, mirrors left island width
 *   - At WEB_XL minimum (1280px) island narrows to min(320, sidebarWidth) to keep center breathable
 *   - Center panel gets an explicit marginRight = thirdIslandWidth + sidebarGutter so content
 *     never slides under the right island
 *   - centerPanelMaxWidth raised to 800 for all desktop variants (even without third island)
 */
export function computeThirdColumnLayout({ layout, viewportVariant }) {
	const isXL =
		viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_XL ||
		viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_2XL_3XL ||
		viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE;

	if (!layout?.usesSidebarLayout || !isXL) {
		return { usesThirdColumn: false, thirdIslandWidth: 0, thirdIslandRight: 0, centerPanelMarginRight: 0 };
	}

	const { sidebarWidth, sidebarGutter } = layout;
	// Narrow slightly at WEB_XL minimum to keep the center panel comfortably wide
	const thirdIslandWidth =
		viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_XL
			? Math.min(320, sidebarWidth)
			: sidebarWidth;

	const thirdIslandRight = sidebarGutter;
	const centerPanelMarginRight = thirdIslandWidth + sidebarGutter;

	return { usesThirdColumn: true, thirdIslandWidth, thirdIslandRight, centerPanelMarginRight };
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
