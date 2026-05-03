# MapTopLeftControl — Post-Implementation Record
**Date:** 2026-05-03  
**Author:** Cascade  
**Status:** POST — implementation complete, pending device review  
**Pre-doc:** `MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md`

---

## 1. Changes Made

### New: `components/map/views/shared/MapTopLeftControl.jsx`

44×44 floating circle rendered directly on the map canvas.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `isSignedIn` | bool | Switches between back chevron and profile avatar |
| `profileImageSource` | ImageSource | Avatar image — bleeds edge-to-edge when present |
| `onBack` | fn | Called for unauthenticated press → `router.replace("/(auth)/")`  |
| `onOpenProfile` | fn | Called for authenticated press → opens MiniProfileModal |
| `visible` | bool | Gate — `false` returns null immediately |

**Key implementation decisions:**
- `useSafeAreaInsets().top + 16` for top position — `browserInsetTop` is web-only and returns `0` on native
- `position: absolute`, `left: 16` — floats on map canvas, not in header system
- Avatar image: `overflow: hidden` on the Pressable itself, no inner wrapper — edges bleed as designed
- Frosted backdrop (`rgba` semi-transparent) for icon-only variants (guest + signed-in without image)
- Haptic feedback via `Haptics.selectionAsync()` on press
- Scale + opacity press animation inline on Pressable style function

### Modified: `screens/MapScreen.jsx`

- Added import: `MapTopLeftControl`
- Added render as last child of root screen `<View>` (renders above all layers including modals)
- Visibility guard: `!hasFocusedSheetPhase && !mapLoadingState?.visible`
- No `topInset` prop — removed after safe area refactor

---

## 2. Invariant Verification

| Invariant | Verified |
|---|---|
| Hidden during any focused sheet phase (`SEARCH`, `HOSPITAL_DETAIL`, `COMMIT_*`, etc.) | ✅ `hasFocusedSheetPhase` guard |
| Hidden while map loading overlay is active | ✅ `!mapLoadingState?.visible` guard |
| `TRACKING` phase: control hidden | ✅ `TRACKING !== EXPLORE_INTENT` → `hasFocusedSheetPhase = true` |
| No new state introduced in MapScreen | ✅ All inputs already existed |
| Safe area respected on iOS notch + Android status bar | ✅ `useSafeAreaInsets().top` |
| `router.replace` not `router.back` | ✅ Deterministic navigation |

---

## 3. Deferred Items

- **Sidebar layout suppression** — on wide web/tablet the sidebar is always expanded and the left panel may visually overlap the control. A `!usesSidebarLayout` guard should be added in a follow-up.
- **Fade/scale animation** on `hasFocusedSheetPhase` toggle — deferred to HIG animation pass.
- **Guest back-to-welcome permanence** — this behaviour may be removed once Welcome HIG work is complete, or kept as a permanent escape hatch. Decision deferred.

---

## 4. Files Changed

| File | Change |
|---|---|
| `components/map/views/shared/MapTopLeftControl.jsx` | Created |
| `screens/MapScreen.jsx` | Import + render added |
| `docs/audit/map/MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md` | Created (pre-doc) |
| `docs/audit/map/MAP_TOP_LEFT_CONTROL_POST_2026-05-03.md` | This file |
| `docs/audit/map/README.md` | Index updated |
