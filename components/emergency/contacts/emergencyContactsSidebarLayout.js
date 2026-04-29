import { STACK_VIEWPORT_VARIANTS } from "../../../utils/ui/stackViewportConfig";

// PULLBACK NOTE: EmergencyContacts wide-shell geometry mirrors payment.
// Owns: sidebar/header/third-column math so the screen and header use one responsive contract.

export const EMERGENCY_CONTACTS_SIDEBAR_HIG = Object.freeze({
  HEADER_ISLAND_HEIGHT: 56,
  HEADER_BREATHING: 28,
  SIDEBAR_CORNER_RADIUS: 24,
  SIDEBAR_INNER_PADDING_FALLBACK: 16,
  SIDEBAR_INNER_PADDING_HORIZONTAL: 12,
  GUTTER_FALLBACK: 16,
  HEADER_TOP_INSET_REDUCTION: 0.6,
});

export function getEmergencyContactsSidebarGlassTokens({ isDarkMode }) {
  return {
    blurIntensity: isDarkMode ? 44 : 52,
    ghostSurface: isDarkMode ? "rgba(8,15,27,0.74)" : "rgba(248,250,252,0.76)",
    tint: isDarkMode ? "dark" : "light",
  };
}

export function computeEmergencyContactsSidebarLayout({
  width,
  surfaceConfig,
}) {
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

  const sidebarWidth = Math.min(
    surfaceConfig.overlaySheetMaxWidth ||
      surfaceConfig.sidebarMaxWidth ||
      Math.max(380, width * 0.38),
    Math.max(320, width - 64),
  );

  const sidebarGutter =
    surfaceConfig.overlaySheetSideInset ??
    surfaceConfig.sidebarOuterInset ??
    EMERGENCY_CONTACTS_SIDEBAR_HIG.GUTTER_FALLBACK;

  const sidebarLeft = sidebarGutter;
  const sidebarInnerPadding =
    surfaceConfig.headerSideInset ??
    EMERGENCY_CONTACTS_SIDEBAR_HIG.SIDEBAR_INNER_PADDING_FALLBACK;
  const sidebarInnerPaddingHorizontal =
    EMERGENCY_CONTACTS_SIDEBAR_HIG.SIDEBAR_INNER_PADDING_HORIZONTAL;
  const headerContainerLeft = sidebarLeft + sidebarWidth + sidebarGutter;

  return {
    usesSidebarLayout: true,
    sidebarWidth,
    sidebarLeft,
    sidebarGutter,
    sidebarInnerPadding,
    sidebarInnerPaddingHorizontal,
    rightPanelLeftPadding: 0,
    rightPanelRightPadding: sidebarGutter,
    headerContainerLeft,
  };
}

export function computeEmergencyContactsThirdColumnLayout({
  layout,
  viewportVariant,
}) {
  const isXL =
    viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_XL ||
    viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_2XL_3XL ||
    viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_ULTRA_WIDE;

  if (!layout?.usesSidebarLayout || !isXL) {
    return {
      usesThirdColumn: false,
      thirdIslandWidth: 0,
      thirdIslandRight: 0,
      centerPanelMarginRight: 0,
    };
  }

  const { sidebarWidth, sidebarGutter } = layout;
  const thirdIslandWidth =
    viewportVariant === STACK_VIEWPORT_VARIANTS.WEB_XL
      ? Math.min(320, sidebarWidth)
      : sidebarWidth;

  return {
    usesThirdColumn: true,
    thirdIslandWidth,
    thirdIslandRight: sidebarGutter,
    centerPanelMarginRight: thirdIslandWidth + sidebarGutter,
  };
}

export function computeEmergencyContactsHeaderClearance({
  surfaceConfig,
  insetsTop = 0,
}) {
  return (
    EMERGENCY_CONTACTS_SIDEBAR_HIG.HEADER_ISLAND_HEIGHT +
    (surfaceConfig?.headerTopInset ?? 14) +
    insetsTop +
    EMERGENCY_CONTACTS_SIDEBAR_HIG.HEADER_BREATHING
  );
}
