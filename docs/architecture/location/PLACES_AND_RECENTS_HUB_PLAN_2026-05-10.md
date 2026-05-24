---
status: living
owner: architecture
last_updated: 2026-05-10
---

# Places Hub & Recents Hub â€” LocationSheet Phase Plan

**Date:** 2026-05-10
**Status:** PLANNED â€” ready to implement after LS-9
**Owner:** `components/map/views/locationIntent/`
**Depends on:** LS-1 through LS-9 complete, `LOCATION_SHEET_ARCHITECTURE_PLAN.md`

---

# Philosophy

Both hubs extend the LocationSheet without introducing new screens or routes.

They are **sheet phases** â€” navigated to via `useLocationSheetNavigation`, rendered inline within the existing `MapSheetShell`, and dismissed with the same back / close chrome.

The pattern mirrors the existing `CANDIDATE_DECISION` â†’ `SAVE_DETAILS` â†’ `SAVED_MANAGE` chain: each mode self-guards with `mode === TARGET_MODE` and returns null when inactive.

---

# LS-10: Places Hub

## Mode

```js
LOCATION_INTENT_MODES.PLACES_HUB = "placesHub"
```

## Entry Point

Tapping the **"Places" section header** chevron in DEFAULT view.

The section header is already rendered as a `Pressable` in `MapLocationIntentBodyContent`. Wire `onPress` â†’ `openPlacesHub` from `useLocationSheetNavigation`.

## What it shows

Full saved places management surface â€” everything the user can do with a saved place, in one focused panel:

```
[ Section: Pinned ]
  ðŸ  Home          â†’ address or "Add"
  ðŸ’¼ Work          â†’ address or "Add"

[ Section: Saved Places ]
  Each saved place â†’ row: icon + label + address + chevron
  [ + Add a place ]

[ Empty state if none ]
```

Each row taps â†’ `openSavedManage(place)` (same SAVED_MANAGE phase already wired).

"Add a place" row â†’ `openAddressSearch()` + `setPendingPlaceLabel("other")`.

## What it is NOT

- Not a new screen or route
- Not a modal
- Not a full replacement for SAVED_MANAGE â€” that phase handles the single-item detail/edit/remove actions

## Navigation

```
DEFAULT
  â†’ [tap Places header] â†’ PLACES_HUB
    â†’ [tap any place]   â†’ SAVED_MANAGE (existing)
      â†’ [tap Edit]      â†’ SAVE_DETAILS (existing)
    â†’ [tap Add]         â†’ ADDRESS_SEARCH (existing)
  â† [back]             â†’ DEFAULT
```

## Sheet snap

Force EXPANDED on entry â€” same as ADDRESS_SEARCH.

## Files to touch

| File | Change |
|---|---|
| `mapLocationIntent.model.js` | Add `PLACES_HUB` to `LOCATION_INTENT_MODES` |
| `useLocationSheetNavigation.js` | Add `openPlacesHub` action |
| `MapLocationIntentStageParts.jsx` | Wire Places section header `onPress` â†’ `openPlacesHub`; add `MapLocationIntentPlacesHubPanel` |
| `MapLocationIntentPlacesHubPanel.jsx` | New extracted component (target: â‰¤250 lines) |
| `MapLocationIntentStageBase.jsx` | Pass `openPlacesHub` down; pass `onSnapStateChange(EXPANDED)` on entry |

## Component structure

```
MapLocationIntentPlacesHubPanel
  â”œâ”€ isActive guard (mode !== PLACES_HUB â†’ null)
  â”œâ”€ ScrollView
  â”‚    â”œâ”€ Pinned section (Home, Work)
  â”‚    â”‚    â””â”€ SavedPlaceRow Ã— 2
  â”‚    â””â”€ Saved Places section
  â”‚         â”œâ”€ ManagedSavedPlaceRow Ã— n
  â”‚         â””â”€ AddPlaceRow
  â””â”€ (no footer â€” back is the top chrome)
```

`SavedPlaceRow` and `ManagedSavedPlaceRow` reuse existing row primitives from `MapLocationIntentCandidatePanel`.

---

# LS-10 Appendix: Places Orb Decision Tree

The DEFAULT view always shows 3 orbs: **Home**, **Work**, and **+Add**.
The Places Hub exposes the full management surface for all saved places.
Both surfaces share the same `onSelectSavedPlace` dispatch function and the same downstream decision tree.

## Orb visual states

Each orb carries a computed `hierarchy` from `getPlaceOrbHierarchy(place, index, savedPlaces)`:

| Condition | Hierarchy | Visual treatment |
|---|---|---|
| `place.key === "add"` AND no orb needs Add | `"primary"` | Filled gradient, full CTA |
| `place.key === "add"` AND another orb needs Add | `"tertiary"` | Muted, secondary affordance |
| `place.hasLocation === true` | `"tertiary"` | Muted label, no CTA urgency |
| `place.hasLocation === false` AND first empty orb | `"primary"` | Filled gradient, beckons tap |
| `place.hasLocation === false` AND not first empty | `"secondary"` | Lighter gradient |

Subtext from `getPlaceOrbSubtext`:
- `hasLocation: true` â†’ `"Close by"`
- `hasLocation: false` â†’ `"Add"`
- `key: "add"` â†’ `""` (no subtext)

## onSelectSavedPlace decision tree

Every orb tap and Places Hub row tap flows through the same handler in `MapLocationIntentStageBase`:

```
onSelectSavedPlace(place)
â”‚
â”œâ”€ place.key === "add"
â”‚    â””â”€ setPendingPlaceLabel("other")
â”‚       openAddressSearch()
â”‚       â†’ ADDRESS_SEARCH mode, after selection â†’ SAVE_CATEGORY
â”‚
â”œâ”€ place.location === null  (Home/Work slot not yet set)
â”‚    â””â”€ setPendingPlaceLabel(place.key)   â† "home" or "work"
â”‚       openAddressSearch()
â”‚       â†’ ADDRESS_SEARCH mode, after selection â†’ CANDIDATE_DECISION
â”‚         with "Set as Home" / "Set as Work" as primary CTA
â”‚
â””â”€ place.location exists  (slot already filled)
     â””â”€ mapStoredLocationToCandidate(place.location, place.label)
        setPendingPlaceLabel(null)
        setActiveCandidate(candidate)
        navigateToCandidateDecision()
        â†’ CANDIDATE_DECISION showing:
          [ Use as Pickup ] (primary)
          [ Set as Home / Work / Save Place ] (secondary â€” skipped if already saved)
          [ Saved feedback checkmark ] (if just saved)
          [ Choose Another ] (tertiary)
```

## CANDIDATE_DECISION â†’ save flow CRUD surfaces

Once a candidate is selected, the save flow is driven by `useSavedAddressActions` (Jotai-backed).

### CRUD state machine (`crudReducer`)

```
IDLE â†’ SAVING â†’ SAVED
                 â†‘
              FAILED
```

| State | When | UI treatment |
|---|---|---|
| `IDLE` | Nothing in progress | Normal action rows |
| `SAVING` | Store write in flight | Spinner on active action |
| `SAVED` | Write confirmed | `savedPlaceFeedback` label shown, checkmark row |
| `FAILED` | Store threw | Inline error text under action |

### Save flow atom fields (`locationSaveFlowAtom`)

| Field | Purpose |
|---|---|
| `pendingPlaceLabel` | `"home"` / `"work"` / `"other"` / `null` â€” drives primary CTA label in CANDIDATE_DECISION |
| `pendingSaveCategory` | Category selected in SAVE_CATEGORY phase |
| `savedPlaceFeedback` | Label string shown as "Saved Home" / "Saved Work" / "Saved Place" confirmation row |
| `isConfirmingSavedRemove` | Two-tap confirmation guard for destructive delete |
| `saveDetailsDraft` | `{ label, unit, responderNote }` â€” free-text details edited in SAVE_DETAILS |

### Mode chain for saving a new place

```
CANDIDATE_DECISION
  â”‚  [Set as Home]  â†’ save("home")    â†’ SAVED feedback inline
  â”‚  [Set as Work]  â†’ save("work")    â†’ SAVED feedback inline
  â”‚  [Save Place]   â†’ openSaveCategory()
  â†“
SAVE_CATEGORY
  â”‚  [tap a category] â†’ setPendingSaveCategory(cat)
  â”‚                    openSaveDetails()
  â†“
SAVE_DETAILS
  â”‚  [Confirm]  â†’ handleConfirmSaveDetails()
  â”‚               save(category, { label, unit, responderNote, savedLocationId })
  â”‚               navigateBack â†’ CANDIDATE_DECISION (new save)
  â”‚               OR replaceStack â†’ SAVED_MANAGE (editing existing)
  â†“
CANDIDATE_DECISION or SAVED_MANAGE
```

### Mode chain for managing an existing saved place (from Places Hub)

```
PLACES_HUB
  â”‚  [tap any saved place row]
  â†“
SAVED_MANAGE
  Rows: [ Use as Pickup ] [ Edit Details ] [ Remove / Confirm Remove ]
  â”‚
  â”œâ”€ [Use as Pickup]    â†’ setActiveCandidate â†’ CANDIDATE_DECISION
  â”œâ”€ [Edit Details]     â†’ openSaveDetails()
  â”‚                        SAVE_DETAILS with pre-filled saveDetailsDraft
  â”‚                        on confirm â†’ replaceStack â†’ SAVED_MANAGE
  â””â”€ [Remove]           â†’ isConfirmingSavedRemove = true  (row turns red)
       [Confirm Remove] â†’ removeSavedLocation(id)
                          navigateBack â†’ PLACES_HUB (or CANDIDATE_DECISION)
```

## Places Hub row rendering

In `MapLocationIntentPlacesHubPanel`, each row needs to show the same decision context as the orbs, without the orb shape:

```
[ Icon ] [ Label ]          [ address or "Not set" ]   [ chevron ]
  ðŸ        Home               123 Main St, Lagos          â†’
  ðŸ’¼       Work               Not set                     â†’  (muted)
  ðŸ“       Mum's Place        Block B, Lekki              â†’
  ðŸ“       School             Victoria Island             â†’
           [ + Add a place ]
```

Tap logic is identical to orb tap: reuse `onSelectSavedPlace(place)` â€” no new handler needed.

For "Not set" slots: muted address text, muted chevron â€” still tappable (goes to ADDRESS_SEARCH with `pendingPlaceLabel` set).

---

# LS-11: Recents Hub

## Mode

```js
LOCATION_INTENT_MODES.RECENTS_HUB = "recentsHub"
```

## Entry Point

Tapping the **"Recents" section header** chevron in DEFAULT view (expanded state).

## What it shows

Full unified recent locations list â€” pickup memory + visit history, deduped:

```
[ Section: Recent Pickups ]
  Each item â†’ icon + label + address + time label + chevron
  (source: savedLocations where source="recent")

[ Section: Recent Visits ]
  Each item â†’ icon + facility name + address + time label + chevron
  (source: visit history with facilityCoordinate)

[ Empty state if none ]
```

## Data sources

Same logic as `combinedRecentLocationItems` already computed in `MapLocationIntentBodyContent` â€” lift that memo into `MapLocationIntentRecentsHubPanel` or pass it down as a prop.

## Tap action

Tapping any recent item â†’ `navigateToCandidateDecision` with that location pre-loaded:

```js
const candidate = mapStoredLocationToCandidate(item, item.label || "Recent pickup");
setActiveCandidate(normalized);
navigateToCandidateDecision();
onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
```

Mirrors `onSelectRecentLocation` already wired in DEFAULT view â€” same handler, same path.

## Navigation

```
DEFAULT (expanded)
  â†’ [tap Recents header] â†’ RECENTS_HUB
    â†’ [tap any recent]   â†’ CANDIDATE_DECISION (existing)
  â† [back]              â†’ DEFAULT
```

## Sheet snap

EXPANDED on entry, drops to HALF after selecting a recent (same as candidate decision).

## Files to touch

| File | Change |
|---|---|
| `mapLocationIntent.model.js` | Add `RECENTS_HUB` to `LOCATION_INTENT_MODES` |
| `useLocationSheetNavigation.js` | Add `openRecentsHub` action |
| `MapLocationIntentStageParts.jsx` | Wire Recents section header `onPress` â†’ `openRecentsHub`; add `MapLocationIntentRecentsHubPanel` |
| `MapLocationIntentRecentsHubPanel.jsx` | New extracted component (target: â‰¤200 lines) |
| `MapLocationIntentStageBase.jsx` | Pass `openRecentsHub` down |

## Component structure

```
MapLocationIntentRecentsHubPanel
  â”œâ”€ isActive guard (mode !== RECENTS_HUB â†’ null)
  â”œâ”€ ScrollView
  â”‚    â”œâ”€ Recent Pickups section
  â”‚    â”‚    â””â”€ RecentLocationRow Ã— n
  â”‚    â”œâ”€ Recent Visits section
  â”‚    â”‚    â””â”€ RecentLocationRow Ã— n
  â”‚    â””â”€ Empty state (if both empty)
  â””â”€ (no footer â€” back is top chrome)
```

`RecentLocationRow` reuses existing `MapHistoryGroup` row primitive already in `MapLocationIntentBodyContent`.

---

# Shared Architecture Rules

Both hubs follow the same pattern:

1. **Mode guard at top of component** â€” `if (mode !== TARGET) return null` â€” no conditional hooks.
2. **No new nav stack entries beyond the hub itself** â€” internal taps use existing modes (`CANDIDATE_DECISION`, `SAVED_MANAGE`).
3. **No new sheet chrome** â€” header back button + close button are inherited from `MapLocationIntentActiveTopRow`.
4. **No new state** â€” both panels consume existing props already passed to `MapLocationIntentBodyContent`.
5. **File size target** â€” each panel â‰¤250 lines; extract sub-rows if needed.
6. **Snap state on entry** â€” always `EXPANDED`; tapping an item degrades to `HALF` as appropriate.

---

# Sequence

```
LS-9  Manual Entry Redesign      â† current
LS-10 Places Hub                 â† next
LS-11 Recents Hub                â† after LS-10
```

LS-10 and LS-11 are independent of each other once LS-9 is stable.
LS-11 can be implemented in parallel if needed â€” no shared new state.

---

# Open Questions

- Should Places Hub show a search bar at the top (filter saved places inline)? Low priority â€” only relevant if the user has >6 saved places.
- Should Recents Hub expose a "Clear recents" destructive action? Defer to LS-11 implementation â€” add if product decision is made.
- Should both hubs get dedicated section headers in DEFAULT even on HALF snap (not just EXPANDED)? Current: Recents is expanded-only. Places header is always visible. Review in LS-10 implementation.
