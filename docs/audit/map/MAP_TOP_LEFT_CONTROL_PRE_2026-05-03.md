# MapTopLeftControl — Pre-Implementation Audit
**Date:** 2026-05-03  
**Author:** Cascade  
**Status:** PRE — changes not yet committed  
**Post-doc:** `MAP_TOP_LEFT_CONTROL_POST_2026-05-03.md` (to be created after implementation)

---

## 1. Problem Statement

During native development (Expo Go, Metro), there is no way to navigate from the map screen back to the Welcome screen without:
- Reloading the app (iOS)
- Changing the URL in the browser address bar (web)
- Android persisting on `/map` after Metro reload (no path back to Welcome at all)

This blocks iterative HIG audit work on the Welcome screen from native devices.

Beyond dev utility, this surfaces a real UX gap: **the map's `EXPLORE_INTENT` phase has no persistent top-left affordance**. The tracking phase has one (medkit icon via `trackingHeaderLeftComponent`). All sheet phases own their own close/back buttons. Only `EXPLORE_INTENT` is bare.

---

## 2. Existing Surface Audit

### What currently occupies the map top-left

| Phase | Top-left slot | Owner |
|---|---|---|
| `EXPLORE_INTENT` | **Empty** | — |
| `TRACKING` | Medkit icon (triage) | `useMapTrackingHeader` → `trackingHeaderLeftComponent` → `setHeaderState` |
| `SEARCH`, `HOSPITAL_DETAIL`, `HOSPITAL_LIST`, `SERVICE_DETAIL`, `COMMIT_*` | Sheet-owned close/back buttons | Individual stage components |

The header system (`ScrollAwareHeader`) is **hidden** during `EXPLORE_INTENT` (`setHeaderState({ hidden: true })`). The top-left slot is therefore a floating canvas position, not a header slot.

### Existing boolean: `hasFocusedSheetPhase`

```js
// screens/MapScreen.jsx:300
const hasFocusedSheetPhase = sheetPhase !== MAP_SHEET_PHASES.EXPLORE_INTENT;
```

Already computed. No new state needed to gate the control.

### Existing profile avatar: `MapExploreIntentProfileTrigger`

The explore intent sheet surface renders a profile avatar in its own top-right area as part of the sheet content. This is a separate surface from the floating canvas position being added here.

### Existing `profileImageSource` and `isSignedIn`

Both are already destructured from `useMapExploreFlow` in `MapScreen.jsx` and passed to `MapSheetOrchestrator`. Available without any new data fetching.

### Existing `handleOpenProfile`

Already wired in `MapScreen.jsx`. Opens `MiniProfileModal` for signed-in users, `MapGuestProfileModal` for guests. Used here directly.

---

## 3. Design Decision

### Circle, not squircle

A raw circle (44×44, `borderRadius: 22`) with no surrounding card, shadow, or padding. Avatar image bleeds edge-to-edge. Icon-only variants use a semi-transparent backdrop (frosted glass tone). This matches the visual language of `MapHeaderIconButton` (circle, `borderRadius: 999`) but is positioned on the canvas, not inside a header.

### Phase-aware visibility

Visible only when `!hasFocusedSheetPhase && !mapLoadingState?.visible`.

- Hidden during any sheet phase (sheet owns its own navigation)
- Hidden while the map loading overlay is active (would overlap/confuse)
- Revealed only in `EXPLORE_INTENT` — the browsing state

### Auth-split behaviour

| State | Icon | Action |
|---|---|---|
| Unauthenticated | `chevron-back` on frosted circle | `router.replace("/(auth)/")`  → Welcome |
| Authenticated, has avatar | Profile image fills circle | `handleOpenProfile()` |
| Authenticated, no avatar | `person` icon on frosted circle | `handleOpenProfile()` |

### Position

```
top:  useSafeAreaInsets().top + 16   (respects status bar / notch on all platforms)
left: 16
```

`browserInsetTop` from `useAuthViewport` is **web-only** (returns `0` on native). Safe area insets must be read directly inside the component via `useSafeAreaInsets()` from `react-native-safe-area-context`. This is consistent with how `MapExploreLoadingOverlay`, `MapModalShell`, and `FullScreenEmergencyMap` handle top positioning.

### No `pointerEvents="box-none"` wrapper needed

`MapTopLeftControl` is `position: absolute` and is itself interactive (Pressable). It is the last child of the root screen `View` so it renders above all other layers. No wrapper required.

---

## 4. Files Affected

| File | Change |
|---|---|
| `components/map/views/shared/MapTopLeftControl.jsx` | **New** — floating circle component |
| `screens/MapScreen.jsx` | Import + render `MapTopLeftControl` after last modal |

---

## 5. Invariants

1. **Never rendered during any focused sheet phase** — `hasFocusedSheetPhase` guard is non-negotiable. Sheet surfaces own their own back/close affordances.
2. **Never rendered while loading overlay is visible** — would create overlapping tap targets during an inert loading state.
3. **Tracking phase must not be affected** — `TRACKING` sets `hasFocusedSheetPhase = false` ... wait: `TRACKING !== EXPLORE_INTENT` so `hasFocusedSheetPhase = true`. Control correctly hidden. ✅
4. **No new state introduced** — all inputs (`isSignedIn`, `profileImageSource`, `hasFocusedSheetPhase`, `browserInsetTop`) are already available in `MapScreen`.
5. **`router.replace("/(auth)/")` not `router.back()`** — back() is unreliable when the map was the initial route (deep link, Android persistence). Replace is deterministic.

---

## 6. Out of Scope for This Pass

- Animation (fade/scale in/out as `hasFocusedSheetPhase` toggles) — deferred
- Sidebar layout variant consideration — control should be suppressed on sidebar (wide web layout) where the sheet is always expanded and the left panel may overlap. Deferred.
- Removing `MapTopLeftControl` once HIG work on Welcome is complete — this control has permanent value for authenticated users (profile avatar shortcut). Guest back-to-welcome behaviour may be removed once Welcome HIG work is done or kept permanently.

---

## 7. Post-Doc Checklist

- [ ] Component created at correct path
- [ ] Unused imports removed
- [ ] `hasFocusedSheetPhase` guard verified in MapScreen
- [ ] `!mapLoadingState?.visible` guard verified
- [ ] Guest path: `router.replace("/(auth)/")`  tested on iOS + Android
- [ ] Authenticated path: `handleOpenProfile` opens `MiniProfileModal`
- [ ] Tracking phase: control not visible
- [ ] Any focused sheet phase: control not visible
- [ ] `browserInsetTop` correctly applied (notch/status bar safe)
- [ ] Sidebar layout impact noted (deferred suppression)
