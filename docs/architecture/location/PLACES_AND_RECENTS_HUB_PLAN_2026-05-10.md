# Places Hub & Recents Hub — LocationSheet Phase Plan

**Date:** 2026-05-10
**Status:** PLANNED — ready to implement after LS-9
**Owner:** `components/map/views/locationIntent/`
**Depends on:** LS-1 through LS-9 complete, `LOCATION_SHEET_ARCHITECTURE_PLAN.md`

---

# Philosophy

Both hubs extend the LocationSheet without introducing new screens or routes.

They are **sheet phases** — navigated to via `useLocationSheetNavigation`, rendered inline within the existing `MapSheetShell`, and dismissed with the same back / close chrome.

The pattern mirrors the existing `CANDIDATE_DECISION` → `SAVE_DETAILS` → `SAVED_MANAGE` chain: each mode self-guards with `mode === TARGET_MODE` and returns null when inactive.

---

# LS-10: Places Hub

## Mode

```js
LOCATION_INTENT_MODES.PLACES_HUB = "placesHub"
```

## Entry Point

Tapping the **"Places" section header** chevron in DEFAULT view.

The section header is already rendered as a `Pressable` in `MapLocationIntentBodyContent`. Wire `onPress` → `openPlacesHub` from `useLocationSheetNavigation`.

## What it shows

Full saved places management surface — everything the user can do with a saved place, in one focused panel:

```
[ Section: Pinned ]
  🏠 Home          → address or "Add"
  💼 Work          → address or "Add"

[ Section: Saved Places ]
  Each saved place → row: icon + label + address + chevron
  [ + Add a place ]

[ Empty state if none ]
```

Each row taps → `openSavedManage(place)` (same SAVED_MANAGE phase already wired).

"Add a place" row → `openAddressSearch()` + `setPendingPlaceLabel("other")`.

## What it is NOT

- Not a new screen or route
- Not a modal
- Not a full replacement for SAVED_MANAGE — that phase handles the single-item detail/edit/remove actions

## Navigation

```
DEFAULT
  → [tap Places header] → PLACES_HUB
    → [tap any place]   → SAVED_MANAGE (existing)
      → [tap Edit]      → SAVE_DETAILS (existing)
    → [tap Add]         → ADDRESS_SEARCH (existing)
  ← [back]             → DEFAULT
```

## Sheet snap

Force EXPANDED on entry — same as ADDRESS_SEARCH.

## Files to touch

| File | Change |
|---|---|
| `mapLocationIntent.model.js` | Add `PLACES_HUB` to `LOCATION_INTENT_MODES` |
| `useLocationSheetNavigation.js` | Add `openPlacesHub` action |
| `MapLocationIntentStageParts.jsx` | Wire Places section header `onPress` → `openPlacesHub`; add `MapLocationIntentPlacesHubPanel` |
| `MapLocationIntentPlacesHubPanel.jsx` | New extracted component (target: ≤250 lines) |
| `MapLocationIntentStageBase.jsx` | Pass `openPlacesHub` down; pass `onSnapStateChange(EXPANDED)` on entry |

## Component structure

```
MapLocationIntentPlacesHubPanel
  ├─ isActive guard (mode !== PLACES_HUB → null)
  ├─ ScrollView
  │    ├─ Pinned section (Home, Work)
  │    │    └─ SavedPlaceRow × 2
  │    └─ Saved Places section
  │         ├─ ManagedSavedPlaceRow × n
  │         └─ AddPlaceRow
  └─ (no footer — back is the top chrome)
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
- `hasLocation: true` → `"Close by"`
- `hasLocation: false` → `"Add"`
- `key: "add"` → `""` (no subtext)

## onSelectSavedPlace decision tree

Every orb tap and Places Hub row tap flows through the same handler in `MapLocationIntentStageBase`:

```
onSelectSavedPlace(place)
│
├─ place.key === "add"
│    └─ setPendingPlaceLabel("other")
│       openAddressSearch()
│       → ADDRESS_SEARCH mode, after selection → SAVE_CATEGORY
│
├─ place.location === null  (Home/Work slot not yet set)
│    └─ setPendingPlaceLabel(place.key)   ← "home" or "work"
│       openAddressSearch()
│       → ADDRESS_SEARCH mode, after selection → CANDIDATE_DECISION
│         with "Set as Home" / "Set as Work" as primary CTA
│
└─ place.location exists  (slot already filled)
     └─ mapStoredLocationToCandidate(place.location, place.label)
        setPendingPlaceLabel(null)
        setActiveCandidate(candidate)
        navigateToCandidateDecision()
        → CANDIDATE_DECISION showing:
          [ Use as Pickup ] (primary)
          [ Set as Home / Work / Save Place ] (secondary — skipped if already saved)
          [ Saved feedback checkmark ] (if just saved)
          [ Choose Another ] (tertiary)
```

## CANDIDATE_DECISION → save flow CRUD surfaces

Once a candidate is selected, the save flow is driven by `useSavedAddressActions` (Jotai-backed).

### CRUD state machine (`crudReducer`)

```
IDLE → SAVING → SAVED
                 ↑
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
| `pendingPlaceLabel` | `"home"` / `"work"` / `"other"` / `null` — drives primary CTA label in CANDIDATE_DECISION |
| `pendingSaveCategory` | Category selected in SAVE_CATEGORY phase |
| `savedPlaceFeedback` | Label string shown as "Saved Home" / "Saved Work" / "Saved Place" confirmation row |
| `isConfirmingSavedRemove` | Two-tap confirmation guard for destructive delete |
| `saveDetailsDraft` | `{ label, unit, responderNote }` — free-text details edited in SAVE_DETAILS |

### Mode chain for saving a new place

```
CANDIDATE_DECISION
  │  [Set as Home]  → save("home")    → SAVED feedback inline
  │  [Set as Work]  → save("work")    → SAVED feedback inline
  │  [Save Place]   → openSaveCategory()
  ↓
SAVE_CATEGORY
  │  [tap a category] → setPendingSaveCategory(cat)
  │                    openSaveDetails()
  ↓
SAVE_DETAILS
  │  [Confirm]  → handleConfirmSaveDetails()
  │               save(category, { label, unit, responderNote, savedLocationId })
  │               navigateBack → CANDIDATE_DECISION (new save)
  │               OR replaceStack → SAVED_MANAGE (editing existing)
  ↓
CANDIDATE_DECISION or SAVED_MANAGE
```

### Mode chain for managing an existing saved place (from Places Hub)

```
PLACES_HUB
  │  [tap any saved place row]
  ↓
SAVED_MANAGE
  Rows: [ Use as Pickup ] [ Edit Details ] [ Remove / Confirm Remove ]
  │
  ├─ [Use as Pickup]    → setActiveCandidate → CANDIDATE_DECISION
  ├─ [Edit Details]     → openSaveDetails()
  │                        SAVE_DETAILS with pre-filled saveDetailsDraft
  │                        on confirm → replaceStack → SAVED_MANAGE
  └─ [Remove]           → isConfirmingSavedRemove = true  (row turns red)
       [Confirm Remove] → removeSavedLocation(id)
                          navigateBack → PLACES_HUB (or CANDIDATE_DECISION)
```

## Places Hub row rendering

In `MapLocationIntentPlacesHubPanel`, each row needs to show the same decision context as the orbs, without the orb shape:

```
[ Icon ] [ Label ]          [ address or "Not set" ]   [ chevron ]
  🏠       Home               123 Main St, Lagos          →
  💼       Work               Not set                     →  (muted)
  📍       Mum's Place        Block B, Lekki              →
  📍       School             Victoria Island             →
           [ + Add a place ]
```

Tap logic is identical to orb tap: reuse `onSelectSavedPlace(place)` — no new handler needed.

For "Not set" slots: muted address text, muted chevron — still tappable (goes to ADDRESS_SEARCH with `pendingPlaceLabel` set).

---

# LS-11: Recents Hub

## Mode

```js
LOCATION_INTENT_MODES.RECENTS_HUB = "recentsHub"
```

## Entry Point

Tapping the **"Recents" section header** chevron in DEFAULT view (expanded state).

## What it shows

Full unified recent locations list — pickup memory + visit history, deduped:

```
[ Section: Recent Pickups ]
  Each item → icon + label + address + time label + chevron
  (source: savedLocations where source="recent")

[ Section: Recent Visits ]
  Each item → icon + facility name + address + time label + chevron
  (source: visit history with facilityCoordinate)

[ Empty state if none ]
```

## Data sources

Same logic as `combinedRecentLocationItems` already computed in `MapLocationIntentBodyContent` — lift that memo into `MapLocationIntentRecentsHubPanel` or pass it down as a prop.

## Tap action

Tapping any recent item → `navigateToCandidateDecision` with that location pre-loaded:

```js
const candidate = mapStoredLocationToCandidate(item, item.label || "Recent pickup");
setActiveCandidate(normalized);
navigateToCandidateDecision();
onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
```

Mirrors `onSelectRecentLocation` already wired in DEFAULT view — same handler, same path.

## Navigation

```
DEFAULT (expanded)
  → [tap Recents header] → RECENTS_HUB
    → [tap any recent]   → CANDIDATE_DECISION (existing)
  ← [back]              → DEFAULT
```

## Sheet snap

EXPANDED on entry, drops to HALF after selecting a recent (same as candidate decision).

## Files to touch

| File | Change |
|---|---|
| `mapLocationIntent.model.js` | Add `RECENTS_HUB` to `LOCATION_INTENT_MODES` |
| `useLocationSheetNavigation.js` | Add `openRecentsHub` action |
| `MapLocationIntentStageParts.jsx` | Wire Recents section header `onPress` → `openRecentsHub`; add `MapLocationIntentRecentsHubPanel` |
| `MapLocationIntentRecentsHubPanel.jsx` | New extracted component (target: ≤200 lines) |
| `MapLocationIntentStageBase.jsx` | Pass `openRecentsHub` down |

## Component structure

```
MapLocationIntentRecentsHubPanel
  ├─ isActive guard (mode !== RECENTS_HUB → null)
  ├─ ScrollView
  │    ├─ Recent Pickups section
  │    │    └─ RecentLocationRow × n
  │    ├─ Recent Visits section
  │    │    └─ RecentLocationRow × n
  │    └─ Empty state (if both empty)
  └─ (no footer — back is top chrome)
```

`RecentLocationRow` reuses existing `MapHistoryGroup` row primitive already in `MapLocationIntentBodyContent`.

---

# Shared Architecture Rules

Both hubs follow the same pattern:

1. **Mode guard at top of component** — `if (mode !== TARGET) return null` — no conditional hooks.
2. **No new nav stack entries beyond the hub itself** — internal taps use existing modes (`CANDIDATE_DECISION`, `SAVED_MANAGE`).
3. **No new sheet chrome** — header back button + close button are inherited from `MapLocationIntentActiveTopRow`.
4. **No new state** — both panels consume existing props already passed to `MapLocationIntentBodyContent`.
5. **File size target** — each panel ≤250 lines; extract sub-rows if needed.
6. **Snap state on entry** — always `EXPANDED`; tapping an item degrades to `HALF` as appropriate.

---

# Sequence

```
LS-9  Manual Entry Redesign      ← current
LS-10 Places Hub                 ← next
LS-11 Recents Hub                ← after LS-10
```

LS-10 and LS-11 are independent of each other once LS-9 is stable.
LS-11 can be implemented in parallel if needed — no shared new state.

---

# Open Questions

- Should Places Hub show a search bar at the top (filter saved places inline)? Low priority — only relevant if the user has >6 saved places.
- Should Recents Hub expose a "Clear recents" destructive action? Defer to LS-11 implementation — add if product decision is made.
- Should both hubs get dedicated section headers in DEFAULT even on HALF snap (not just EXPANDED)? Current: Recents is expanded-only. Places header is always visible. Review in LS-10 implementation.
