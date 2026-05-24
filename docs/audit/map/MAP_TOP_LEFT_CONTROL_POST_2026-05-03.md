---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# MapTopLeftControl â€” Post-Implementation Record
**Date:** 2026-05-03  
**Author:** Cascade  
**Status:** POST â€” implementation complete + sidebar layout follow-up applied 2026-05-03  
**Pre-doc:** `MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md`

---

## 1. Changes Made

### New: `components/map/views/shared/MapTopLeftControl.jsx`

44Ã—44 floating circle rendered directly on the map canvas.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `isSignedIn` | bool | Switches between back chevron and profile avatar |
| `profileImageSource` | ImageSource | Avatar image â€” bleeds edge-to-edge when present |
| `onBack` | fn | Called for unauthenticated press â†’ `router.replace("/(auth)/")`  |
| `onOpenProfile` | fn | Called for authenticated press â†’ opens MiniProfileModal |
| `visible` | bool | Gate â€” `false` returns null immediately |
| `usesSidebarLayout` | bool | Default `false`. On web sidebar variants: hides component entirely. On native tablet sidebar: shifts `left` to clear the panel. |
| `sidebarOcclusionWidth` | number | `sidebarWidth + sidebarOuterInset`. Used to compute `leftInset` on native tablet sidebar. |

**Key implementation decisions:**
- `useSafeAreaInsets().top + 16` for top position â€” `browserInsetTop` is web-only and returns `0` on native
- `position: absolute` â€” `left` is now always set **inline** (dynamic), removed from stylesheet
- Avatar image: `overflow: hidden` on the Pressable itself, no inner wrapper â€” edges bleed as designed
- Frosted backdrop (`rgba` semi-transparent) for icon-only variants (guest + signed-in without image)
- Haptic feedback via `Haptics.selectionAsync()` on press
- Scale + opacity press animation inline on Pressable style function

### Modified: `screens/MapScreen.jsx`

- Added import: `MapTopLeftControl`
- Added render as last child of root screen `<View>` (renders above all layers including modals)
- Visibility guard: `!hasFocusedSheetPhase && !mapLoadingState?.visible`
- No `topInset` prop â€” removed after safe area refactor

---

## 2. Invariant Verification

| Invariant | Verified |
|---|---|
| Hidden during any focused sheet phase (`SEARCH`, `HOSPITAL_DETAIL`, `COMMIT_*`, etc.) | âœ… `hasFocusedSheetPhase` guard |
| Hidden while map loading overlay is active | âœ… `!mapLoadingState?.visible` guard |
| `TRACKING` phase: control hidden | âœ… `TRACKING !== EXPLORE_INTENT` â†’ `hasFocusedSheetPhase = true` |
| No new state introduced in MapScreen | âœ… All inputs already existed |
| Safe area respected on iOS notch + Android status bar | âœ… `useSafeAreaInsets().top` |
| `router.replace` not `router.back` | âœ… Deterministic navigation |

---

## 3. Follow-up Pass Applied â€” Sidebar Layout (2026-05-03)

**Problem**: On web sidebar variants (`WEB_LG`, `WEB_XL`, `WEB_2XL_3XL`, `WEB_ULTRA_WIDE`, `WEB_MD`, `MACBOOK`, `IOS_PAD`, `ANDROID_TABLET`, `ANDROID_CHROMEBOOK`), the control rendered at `left: 16` â€” directly behind the left sheet panel. On web specifically, the sheet header already contains its own avatar/profile trigger, making this a duplicate side-by-side control.

**Fix applied**:
- **Web + sidebar**: `if (usesSidebarLayout && Platform.OS === "web") return null` â€” control hidden entirely. The sheet's own avatar trigger is the canonical profile affordance on wide web.
- **Native tablet + sidebar**: `leftInset = sidebarOcclusionWidth + 12` â€” control shifts right to clear the panel edge.
- **Mobile (all platforms)**: `leftInset = Math.max(insets.left, 0) + 16` â€” absorbs safe-area left inset (landscape notch), same visual behaviour as before.
- `left: 16` removed from `StyleSheet` â€” `left` is always set inline.

**Props added**: `usesSidebarLayout` (default `false`), `sidebarOcclusionWidth` (default `0`) â€” both backwards-safe.

**`MapScreen.jsx` change**: passes `usesSidebarLayout` and `sidebarOcclusionWidth` (already destructured from `useMapShell`).

## 4. Remaining Deferred Items

- **Fade/scale animation** on `hasFocusedSheetPhase` toggle â€” deferred to HIG animation pass.
- **Guest back-to-welcome permanence** â€” may be removed once Welcome HIG work is complete, or kept as permanent escape hatch. Decision deferred.

---

## 5. Files Changed

| File | Change |
|---|---|
| `components/map/views/shared/MapTopLeftControl.jsx` | Created; sidebar props + Platform guard added in follow-up |
| `screens/MapScreen.jsx` | Import + render; `usesSidebarLayout` + `sidebarOcclusionWidth` props added in follow-up |
| `docs/audit/map/MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md` | Created (pre-doc) |
| `docs/audit/map/MAP_TOP_LEFT_CONTROL_POST_2026-05-03.md` | This file |
