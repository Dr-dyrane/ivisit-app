# Android Glass Layer Pattern

Last Updated: 2026-03-02

## Problem

Android renders translucent surfaces and native elevation shadows together with muddy edges ("smudge").  
The issue appears when one view does both:

1. semi-transparent background
2. native shadow/elevation

## Standard Pattern (Android Only)

Use two layers:

1. `Shadow underlay` (absolute, aligned footprint)
2. `Glass surface` (translucent, no native shadow)

Keep iOS rendering unchanged.

## Rules

1. Do not apply Android `elevation` to translucent glass surfaces.
2. Keep underlay and surface aligned on left/right/radius.
3. Use small vertical depth only: `top: 2`, `bottom: -2`.
4. Keep underlay low-alpha and neutral/brand-aware.
5. Continue using iOS blur/shadow as-is.

## Reference Snippet

```jsx
const isAndroid = Platform.OS === "android";

const glassSurface = isAndroid
  ? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(255, 255, 255, 0.80)")
  : iosSurface;

const shadowLayer = isSelected
  ? (isDarkMode ? "rgba(134, 16, 14, 0.20)" : "rgba(134, 16, 14, 0.12)")
  : (isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)");

<Pressable style={{ backgroundColor: glassSurface, shadowOpacity: isAndroid ? 0 : 0.2, elevation: isAndroid ? 0 : 4 }}>
  {isAndroid && (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 2,
        left: 0,
        right: 0,
        bottom: -2,
        borderRadius: 36,
        backgroundColor: shadowLayer,
      }}
    />
  )}
  {children}
</Pressable>
```

## Applied Components

This pattern is currently applied in:

- `components/visits/VisitCard.jsx`
- `components/emergency/HospitalCard.jsx`
- `components/navigation/AnimatedTabBar.jsx`
- `components/ThemeToggle.jsx`
- `components/emergency/EmergencySearchBar.jsx`
- `components/headers/ScrollAwareHeader.jsx`
- `components/emergency/ServiceTypeSelector.jsx`
- `components/emergency/SpecialtySelector.jsx`
- `components/visits/VisitFilters.jsx`
- `components/notifications/NotificationCard.jsx`
- `components/notifications/NotificationFilters.jsx`
- `components/emergency/requestModal/AmbulanceTypeCard.jsx`
- `components/emergency/requestModal/BedBookingOptions.jsx`
- `components/ui/GlassCard.jsx`

## Review Checklist

When touching a glass-like Android surface:

1. Is the foreground translucent?
2. Is native Android shadow disabled on foreground?
3. Is underlay added and aligned (`left/right/radius`)?
4. Is depth subtle (`top: 2`, `bottom: -2`)?
5. Is iOS path unchanged?
