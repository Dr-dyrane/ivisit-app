# Cascade + Codex - Division of Labour
# Location/Search/UX/Demo Audit Passes (2026-05-11)

> **Context**: The deep audit plan is at
> `docs/audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`
> (Passes A-I, with execution results already appended for session 2026-05-11).
>
> This file defines who does what for the remaining open items so both agents
> can work in parallel without collision.

---

## Ground Rules

- **Cascade owns UI/render/prop wiring** - anything that touches JSX, style,
  snap state, sheet behaviour, or icon libraries.
- **Codex owns hook/service/state logic** - anything that touches hook
  extraction, service contracts, state layer compliance, and utility modules.
- **Neither agent touches a file the other owns** until that agent has marked
  its item DONE in this file.
- **No commits without explicit user permission.**
- Both agents write PULLBACK NOTEs on any non-trivial logic change.

---

## Cascade Owns

### C-1 - F4: Forward `onFindNearbyHospitals` in orchestrator
**File**: `components/map/views/locationIntent/MapLocationIntentOrchestrator.jsx`  
**Change**: Add `onFindNearbyHospitals` to the destructured props and forward it
to `MapLocationIntentStageBase`.  
**Why Cascade**: Pure prop wiring, 2-line change, JSX surface.  
**Status**: DONE

---

### C-2 - F5: Standardize all chevron-forward to MCI `chevron-right`
**Files**:
- `MapLocationIntentStageParts.jsx` (3x `Ionicons chevron-forward`)
- `MapLocationIntentCandidatePanel.jsx` (3x `Ionicons chevron-forward`)
- `MapLocationIntentPlacesHubPanel.jsx` (2x `Ionicons chevron-forward`)
- `MapLocationIntentRecentsHubPanel.jsx` (1x `Ionicons chevron-forward`)
- `ManualStepCompletedSummaries.jsx` (1x `Ionicons chevron-forward`)

**Change**: Replace all `<Ionicons name="chevron-forward" ...>` with
`<MaterialCommunityIcons name="chevron-right" ...>`.  
Import `MaterialCommunityIcons` where not yet present; remove `Ionicons`
import if it becomes unused after the swap.  
**Why Cascade**: Icon library, UI rendering only.  
**Status**: DONE

---

### C-3 - F6: Full Ionicons -> MCI migration in `ManualStepActiveField.jsx`
**File**: `components/map/views/locationIntent/ManualStepActiveField.jsx`  
**Icons to replace**:
- `search-outline` -> `magnify`
- `close-circle` -> `close-circle` (MCI name is the same - verify)
- `checkmark-circle` -> `check-circle`
- `location-outline` -> `map-marker-outline`

**Why Cascade**: Icon library, UI rendering only.  
**Status**: DONE

---

### C-4 - F11: Replace remaining Ionicons in `MapLocationIntentStageParts.jsx`
**File**: `components/map/views/locationIntent/MapLocationIntentStageParts.jsx`  
**Icons to replace**:
- `search` (search pill) -> MCI `magnify`
- `close-circle` (clear button) -> MCI `close-circle`
- `location-outline` (search empty state) -> MCI `map-marker-outline`
- `locate-outline` (current location card) -> MCI `crosshairs-gps`
- `alert-circle-outline` (manual error row) -> MCI `alert-circle-outline`

**Why Cascade**: Icon library, UI rendering only.  
**Status**: DONE

---

### C-5 - F12: Visual QA - `subtextColor` contrast on "Add" orbs
**File**: `components/map/views/locationIntent/MapLocationIntentStageParts.jsx`  
**Action**: Review the accent `subtextColor` passed to "Add" orbs in both
light and dark mode. If contrast fails AA, adjust the alpha or switch to
`mutedColor` with opacity.  
**Why Cascade**: Visual/colour token decision.  
**Status**: DONE - Audit finding: raw accent colors (e.g. `#FB923C` orange) on near-white muted background fail WCAG AA in light mode (~2.9:1 vs 4.5:1 required). Fix: unset named place orbs now use `mutedColor` for "Add" subtext. "add" orb subtext is always empty string so color is irrelevant; passes `null` to defer to IntentOrb default.

---

## Codex Owns

### X-1 - F3: Delete duplicate `useLocationSearchQuery.ts`
**Files**:
- `hooks/search/useLocationSearchQuery.ts`
- `hooks/search/useLocationSearchQuery.js`

**Action**:
1. Run `rg -rn "useLocationSearchQuery"` across the whole repo to find all
   consumers.
2. Confirm which file each consumer imports (`.js` or `.ts` - or bare name
   resolved by bundler).
3. Migrate all consumers to the `.js` version (already has the `enabled`
   fix from this session).
4. Delete `useLocationSearchQuery.ts`.
5. If any consumer used the `.ts` signature (named params `{ query, proximity,
   enabled }` vs positional `(query, locationBias, options)`), update the
   call site to use positional.

**Why Codex**: Import audit, consumer migration, module cleanup - no JSX.  
**Status**: DONE - `rg` found no runtime consumers; deleted the stale `.ts` duplicate and kept the `.js` hook.

---

### X-2 - F1: Extract `useManualEntryHandlers` from `MapLocationIntentStageBase`
**Source file**: `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`
(currently 1038 lines - hard cap breach)

**Extract to**: `hooks/map/locationIntent/useManualEntryHandlers.js`

**Callbacks to move** (all `useCallback` blocks that touch `manualDraft`,
`manualStepIndex`, `manualError`, `manualDropQuery`, or `isResolvingManual`):
- `handleManualConfirm` (async, calls `addressAssistService`)
- `handleManualDraftChange`
- `handleManualDropQueryChange`
- `handleManualDropSelect`
- `handleManualCountrySelectInline`
- `handleManualUseTypedQuery`
- `handleNextManualStep`
- `handlePrevManualStep`
- `handleOpenManualStep`
- `manualNextActionLabel` (useMemo - move with the handlers)

**State ownership note**:
- `manualStepIndex`, `manualDraft`, `manualError`, and `isResolvingManual`
  stay in `MapLocationIntentStageBase` for now because
  `useManualDropController` and `useAddressCandidateController` both need the
  draft before the handler hook is created.
- `useManualEntryHandlers` owns the handler logic and receives the state values
  and setters as controlled inputs.

**Hook signature**:
```js
export default function useManualEntryHandlers({
  manualStepIndex,
  manualDraft,
  isResolvingManual,
  setManualStepIndex,
  setManualDraft,
  setManualError,
  setIsResolvingManual,
  locationBias,
  pendingPlaceLabel,
  buildSelectedLocation,
  setActiveCandidate,
  navigateToCandidateDecision,
  navigateToManualStep,
  navigateToDefaultAndClearSearch,
  onSnapStateChange,
  clearManualDrop,
  setManualDropQuery,
  manualDropQuery,
})
```

**Returns**:
```js
{
  manualNextActionLabel,
  handleManualConfirm,
  handleManualDraftChange,
  handleManualDropQueryChange,
  handleManualDropSelect,
  handleManualCountrySelectInline,
  handleManualUseTypedQuery,
  handleNextManualStep,
  handlePrevManualStep,
  handleOpenManualStep,
}
```

**Safety rules**:
- Do NOT move any render code - StageBase keeps its JSX.
- Do NOT move `useManualDropController` - it stays as a sibling call in StageBase.
- All PULLBACK NOTEs from existing `handleManualConfirm` must be preserved verbatim.
- After extraction, `MapLocationIntentStageBase` replaces the handler blocks
  with a single controlled `useManualEntryHandlers({...})` call.

**Why Codex**: Pure hook extraction, no JSX, no icon/style changes.  
**Status**: DONE - Completed in shared Cascade/Codex pass (2026-05-11). Hook created at `hooks/map/locationIntent/useManualEntryHandlers.js` (328 lines). Architecture note: state stays in StageBase because it is shared with `useManualDropController`; the hook is a pure handler factory receiving state values and setters as params. This is a deliberate controlled-hook compromise to avoid circular hook dependencies.

---

### X-3 - F1b: Extract `useCandidateHandlers` from `MapLocationIntentStageBase`
**Source file**: `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`

**Extract to**: `hooks/map/locationIntent/useCandidateHandlers.js`

**Callbacks to move**:
- `handlePickSearchResult`
- `handleUseCurrentLocationCandidate`
- `openSavedLocationManage`
- `returnToCandidateDecision`
- `handleSaveSelectedLocationAs`
- `handleSelectSaveCategory`
- `handleSavedManageAction`
- `handleSaveDetailsDraftChange`
- `handleConfirmSaveDetails`
- `handleEditSavedLocationDetails`
- `handleRemoveSavedLocation`

**State that travels with the hook**:
- `pendingSaveCategory` / `setPendingSaveCategory`
- `saveDetailsDraft` / `setSaveDetailsDraft`
- `savedPlaceFeedback` / `setSavedPlaceFeedback`
- `isConfirmingSavedRemove` / `setIsConfirmingSavedRemove`

**Hook signature**:
```js
export default function useCandidateHandlers({
  buildSelectedLocation,
  setActiveCandidate,
  commitLocation,
  commitSearchQuery,
  navigateToCandidateDecision,
  navigateToConfirm,
  navigateToSaveCategory,
  navigateToSaveDetails,
  navigateToSavedManage,
  navigateToDefaultAndClearSearch,
  replaceNavigationStack,
  navigateBackWithinLocationLoop,
  onSnapStateChange,
  setPendingPlaceLabel,
  pendingPlaceLabel,
  saveSelectedLocationAs,
  removeSavedEntry,
  markSavedAsUsed,
  setLocationSearchError,
  clearSearch,
  currentLocation,
  mode,
  selectedLocation,
})
```

**Why Codex**: Pure hook extraction, no JSX, no icon/style changes.  
**Status**: DONE - Completed by Cascade/Codex (2026-05-11). Hook created at `hooks/map/locationIntent/useCandidateHandlers.js` (310 lines). No owned state moved - all save state stays in `useSavedAddressActions`; hook is a pure handler factory.

---

### X-4 - F8: Fix `locationBias` object dep in `useAddressSearchController`
**File**: `components/map/views/locationIntent/useAddressSearchController.js`

**Problem**: `locationBias` is an object `{ latitude, longitude }` passed as a
`useEffect` dep. Object identity changes every render -> unnecessary re-fetch.

**Fix**: Destructure to primitives in the effect dep array:
```js
const lat = locationBias.latitude ?? null;
const lng = locationBias.longitude ?? null;

useEffect(() => {
  // use lat/lng instead of locationBias inside effect
  const bias = lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
  ...
  const results = await mapboxService.suggestAddresses(trimmed, bias);
  ...
}, [isActive, searchQuery, lat, lng]);
```

**Why Codex**: Hook logic change, no JSX.  
**Status**: DONE - effect now depends on latitude/longitude primitives and rebuilds a stable bias object inside the debounce.

---

### X-5 - Pass D: Audit `SearchContext.jsx` third debounce implementation
**File**: `contexts/SearchContext.jsx`

**Action**:
1. Confirm whether `SearchContext` uses its own debounced `suggestAddresses`
   call or delegates to `useMapSearchSheetModel`.
2. If it has its own call: confirm it is used ONLY inside `SearchBoundary`
   (i.e. only by `MapLocationIntentOrchestrator` and `MapSearchSheet`) and
   does NOT fire when the location sheet is inactive.
3. If it duplicates logic that belongs in `useAddressSearchController`: flag
   for extraction, document in the audit plan Pass D section.
4. Update Pass D execution result in the audit doc accordingly.

**Why Codex**: Context/hook audit, no JSX changes.  
**Status**: DONE - `SearchContext.jsx` still owns a separate 150ms Mapbox debounce. It is global to `SearchProvider`, so it can fire for any shared search query. Keep flagged for the later search-query unification pass.

---

## Codex Critical Fix Pass - 2026-05-11

### X-6 - Demo owner coverage fix
**Files**:
- `services/demoEcosystemService.js`

**Change**:
- `matchesDemoOwner()` now accepts `demoOwner`, `demo_owner`, `demoOwnerSlug`, `demo_owner_slug`, `demo_owner:` feature tags, and the `demo:<ownerSlug>:` place_id segment.

**Why**:
- The persisted coverage query already selects `features` and `place_id`, but not a normalized `demoOwner` field. The matcher can now validate same-user rows without requiring a mapped hospital object.

**Status**: DONE

---

### X-7 - Saved address persistence truth
**Files**:
- `services/savedLocationsSyncService.js`
- `hooks/map/locationIntent/useSavedAddressActions.js`

**Change**:
- Server sync now reads existing `view_preferences`, merges `savedLocations`, and uses `upsert` by `user_id`.
- Sync failures throw instead of only warning.
- Save/update/remove actions now await `forceSyncSavedLocations()` before showing final success.

**Why**:
- The previous flow could show "Saved" after local Zustand mutation even when Supabase persistence failed or updated zero rows.

**Status**: DONE

---

### X-8 - Saved location auth-user safety
**Files**:
- `hooks/map/useSavedLocationsBootstrap.js`
- `services/savedLocationsSyncService.js`

**Change**:
- Bootstrap is now keyed by authenticated `user.id`, not a process-lifetime boolean.
- Runtime sync subscriptions are reset on user changes.
- Saved locations are cleared on logout to avoid cross-account leakage.

**Why**:
- A shared runtime could previously skip hydration for a second user and leave the first user's saved places in memory.

**Status**: DONE

---

### X-9 - Manual flow safety fixes
**Files**:
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`
- `hooks/map/locationIntent/useManualEntryHandlers.js`

**Change**:
- Header back in manual mode now uses the same previous-step behavior as the sticky footer.
- Manual no-exact-match now attempts a low-confidence geography fallback before blocking.
- Manual confirm payload now explicitly carries unit and responder notes into the candidate controller.
- Save/remove handlers await the async persistence action.

**Why**:
- Back behavior must be predictable, and manual entry should build location confidence instead of hard-blocking on a perfect postal result.

**Status**: DONE

---

### X-10 - LocationSheet mode/snap transition ownership
**Files**:
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`
- `hooks/map/locationIntent/useManualEntryHandlers.js`
- `hooks/map/locationIntent/useCandidateHandlers.js`

**Problem**:
- LocationSheet already has `LOCATION_INTENT_MODE_SNAP_POLICY`, but mode
  changes and snap changes are still called separately in several handlers.
- This can produce visible correction: the sheet enters one snap, then the
  policy effect fixes it after the mode changes.
- The main search sheet avoids this because the shell owns its modal snap
  state internally and opens as one surface.

**Fix intent**:
- StageBase becomes the single owner for LocationSheet mode + snap transitions.
- Handlers receive transition-wrapped navigation callbacks, not raw navigation
  callbacks plus their own `onSnapStateChange` calls.
- `useLayoutEffect` remains only as a safety net if a future branch changes
  mode without using the transition helper.

**Rollback note**:
- If the transition helper causes regression, revert this pass by restoring raw
  `navigateToX` props to `useManualEntryHandlers` / `useCandidateHandlers` and
  restoring their direct `onSnapStateChange` calls.

**Status**: DONE - StageBase now owns transition-wrapped navigation callbacks
for search, manual, candidate decision, save details, saved manage, hubs, and
replace-stack returns. Manual/candidate handler hooks no longer issue direct
snap changes; `useLayoutEffect` remains as a defensive policy guard.

---

### X-10 - Restore manual fallback, recents empty state, and keyboard-aware sheet
**Files**:
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`
- `components/map/views/locationIntent/MapLocationIntentStageParts.jsx`
- `components/map/views/locationIntent/MapLocationIntentRecentsHubPanel.jsx`
- `components/map/views/locationIntent/ManualStepActiveField.jsx`
- `components/map/views/locationIntent/mapLocationIntent.styles.js`

**Change**:
- Restored the explicit "Can't find it? / Enter manually" fallback row in the default LocationSheet state.
- Added empty recents UI in the default sheet and the Recents Hub.
- Added keyboard-aware sheet resizing for search/manual phases using the app's existing `useAndroidKeyboardAwareModal` pattern.
- Added platform-aware keyboard props to manual active inputs.

**Why**:
- The manual fallback became too hidden as a small search-row icon.
- Empty recents need to explain state without looking broken.
- Manual entry must keep the sticky CTA and active field visible when the keyboard is open.

**Status**: DONE

---

## Collision Avoidance Map

| File | Owner | Other agent: hands off until DONE |
|---|---|---|
| `MapLocationIntentOrchestrator.jsx` | Cascade (C-1) | Codex |
| `MapLocationIntentStageParts.jsx` | Cascade (C-2, C-4, C-5) | Codex |
| `MapLocationIntentCandidatePanel.jsx` | Cascade (C-2) | Codex |
| `MapLocationIntentPlacesHubPanel.jsx` | Cascade (C-2) | Codex |
| `MapLocationIntentRecentsHubPanel.jsx` | Cascade (C-2) | Codex |
| `ManualStepCompletedSummaries.jsx` | Cascade (C-2) | Codex |
| `ManualStepActiveField.jsx` | Cascade (C-3) | Codex |
| `hooks/search/useLocationSearchQuery.ts` | Codex (X-1) | Cascade |
| `hooks/search/useLocationSearchQuery.js` | Codex (X-1) | Cascade |
| `hooks/map/locationIntent/useManualEntryHandlers.js` | Shared (X-2, DONE) | Coordinate |
| `hooks/map/locationIntent/useCandidateHandlers.js` | Shared (X-3, DONE) | Coordinate |
| `useAddressSearchController.js` | Codex (X-4) | Cascade |
| `contexts/SearchContext.jsx` | Codex (X-5, audit only) | Cascade |
| `MapLocationIntentStageBase.jsx` | **Shared - Codex edits first (X-2, X-3), Cascade reviews after** | Coordinate |

---

## Recommended Parallel Execution Order

**Cascade**: C-1 DONE, C-2 DONE, C-3 DONE, C-4 DONE, C-5 DONE, X-2 DONE, X-3 DONE -> NOW: review X-10 UI result if continuing visual QA.

**Codex**: X-1 DONE, X-3 DONE, X-4 DONE, X-5 DONE, X-6 DONE, X-7 DONE, X-8 DONE, X-9 DONE, X-10 DONE -> NOW: keep listening for Cascade updates.

**Sync point**: StageBase is 727 lines after X-10 restored the manual fallback UI and keyboard-aware shell behavior. Cascade can review X-10 visually; Codex can begin any new audit pass independently.

---

**Created**: 2026-05-11  
**Status**: Active - update item status as work completes
