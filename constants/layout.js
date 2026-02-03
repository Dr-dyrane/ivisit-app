// Layout constants - centralized spacing and sizing tokens

// Header spacing
export const STACK_TOP_PADDING = 80;

// Spacing scale (based on 4px grid)
export const SPACING = {
    xs: 4,      // 4px
    sm: 8,      // 8px
    md: 16,     // 16px
    lg: 24,     // 24px
    xl: 32,     // 32px
    xxl: 48,    // 48px
    xxxl: 64,   // 64px (mt-16)
};

// Auth page specific spacing
export const AUTH_LAYOUT = {
    sectionGap: SPACING.xxxl,      // Gap between auth content and footer (64px)
    footerPadding: SPACING.xl,     // Footer bottom padding (32px)
    contentPadding: SPACING.lg,    // Horizontal content padding (24px)
};

// Tab bar constants
export const TAB_BAR = {
    itemSize: 56,                  // Tab item circle size
    pillPadding: 8,                // Padding inside pill container
    pillGap: 8,                    // Gap between tab items
};

// FAB constants
export const FAB = {
    size: 56,                      // FAB circle diameter
    rightMargin: 20,               // Distance from right edge
};
