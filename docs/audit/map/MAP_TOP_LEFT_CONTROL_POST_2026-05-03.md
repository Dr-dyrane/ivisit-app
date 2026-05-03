# MapTopLeftControl — Post-Implementation Record
**Date:** 2026-05-03  
**Author:** Cascade  
**Status:** POST — implementation complete + sidebar layout follow-up applied 2026-05-03  
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
| `usesSidebarLayout` | bool | Default `false`. On web sidebar variants: hides component entirely. On native tablet sidebar: shifts `left` to clear the panel. |
| `sidebarOcclusionWidth` | number | `sidebarWidth + sidebarOuterInset`. Used to compute `leftInset` on native tablet sidebar. |

**Key implementation decisions:**
- `useSafeAreaInsets().top + 16` for top position — `browserInsetTop` is web-only and returns `0` on native
- `position: absolute` — `left` is now always set **inline** (dynamic), removed from stylesheet
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

## 3. Follow-up Pass Applied — Sidebar Layout (2026-05-03)

**Problem**: On web sidebar variants (`WEB_LG`, `WEB_XL`, `WEB_2XL_3XL`, `WEB_ULTRA_WIDE`, `WEB_MD`, `MACBOOK`, `IOS_PAD`, `ANDROID_TABLET`, `ANDROID_CHROMEBOOK`), the control rendered at `left: 16` — directly behind the left sheet panel. On web specifically, the sheet header already contains its own avatar/profile trigger, making this a duplicate side-by-side control.

**Fix applied**:
- **Web + sidebar**: `if (usesSidebarLayout && Platform.OS === "web") return null` — control hidden entirely. The sheet's own avatar trigger is the canonical profile affordance on wide web.
- **Native tablet + sidebar**: `leftInset = sidebarOcclusionWidth + 12` — control shifts right to clear the panel edge.
- **Mobile (all platforms)**: `leftInset = Math.max(insets.left, 0) + 16` — absorbs safe-area left inset (landscape notch), same visual behaviour as before.
- `left: 16` removed from `StyleSheet` — `left` is always set inline.

**Props added**: `usesSidebarLayout` (default `false`), `sidebarOcclusionWidth` (default `0`) — both backwards-safe.

**`MapScreen.jsx` change**: passes `usesSidebarLayout` and `sidebarOcclusionWidth` (already destructured from `useMapShell`).

## 4. Remaining Deferred Items

- **Fade/scale animation** on `hasFocusedSheetPhase` toggle — deferred to HIG animation pass.
- **Guest back-to-welcome permanence** — may be removed once Welcome HIG work is complete, or kept as permanent escape hatch. Decision deferred.

---

## 5. Files Changed

| File | Change |
|---|---|
| `components/map/views/shared/MapTopLeftControl.jsx` | Created; sidebar props + Platform guard added in follow-up |
| `screens/MapScreen.jsx` | Import + render; `usesSidebarLayout` + `sidebarOcclusionWidth` props added in follow-up |
| `docs/audit/map/MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md` | Created (pre-doc) |
| `docs/audit/map/MAP_TOP_LEFT_CONTROL_POST_2026-05-03.md` | This file |
