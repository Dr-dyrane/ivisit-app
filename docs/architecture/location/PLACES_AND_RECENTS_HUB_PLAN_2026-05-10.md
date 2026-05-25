---
status: living
owner: architecture
last_updated: 2026-05-10
---

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
  ðŸ  Home          → address or "Add"
  ðŸ’¼ Work          → address or "Add"

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
  â”œâ”€ isActive guard (mode !== PLACES_HUB → null)
  â”œâ”€ ScrollView
  â”‚    â”œâ”€ Pinned section (Home, Work)
  â”‚    â”‚    â””â”€ SavedPlaceRow Ã— 2
  â”‚    â””â”€ Saved Places section
  â”‚         â”œâ”€ ManagedSavedPlaceRow Ã— n
  â”‚         â””â”€ AddPlaceRow
  â””â”€ (no footer — back is the top chrome)
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
â”‚
â”œâ”€ place.key === "add"
â”‚    â””â”€ setPendingPlaceLabel("other")
â”‚       openAddressSearch()
â”‚       → ADDRESS_SEARCH mode, after selection → SAVE_CATEGORY
â”‚
â”œâ”€ place.location === null  (Home/Work slot not yet set)
â”‚    â””â”€ setPendingPlaceLabel(place.key)   ← "home" or "work"
â”‚       openAddressSearch()
â”‚       → ADDRESS_SEARCH mode, after selection → CANDIDATE_DECISION
â”‚         with "Set as Home" / "Set as Work" as primary CTA
â”‚
â””â”€ place.location exists  (slot already filled)
     â””â”€ mapStoredLocationToCandidate(place.location, place.label)
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
  â”‚  [Set as Home]  → save("home")    → SAVED feedback inline
  â”‚  [Set as Work]  → save("work")    → SAVED feedback inline
  â”‚  [Save Place]   → openSaveCategory()
  ↓
SAVE_CATEGORY
  â”‚  [tap a category] → setPendingSaveCategory(cat)
  â”‚                    openSaveDetails()
  ↓
SAVE_DETAILS
  â”‚  [Confirm]  → handleConfirmSaveDetails()
  â”‚               save(category, { label, unit, responderNote, savedLocationId })
  â”‚               navigateBack → CANDIDATE_DECISION (new save)
  â”‚               OR replaceStack → SAVED_MANAGE (editing existing)
  ↓
CANDIDATE_DECISION or SAVED_MANAGE
```

### Mode chain for managing an existing saved place (from Places Hub)

```
PLACES_HUB
  â”‚  [tap any saved place row]
  ↓
SAVED_MANAGE
  Rows: [ Use as Pickup ] [ Edit Details ] [ Remove / Confirm Remove ]
  â”‚
  â”œâ”€ [Use as Pickup]    → setActiveCandidate → CANDIDATE_DECISION
  â”œâ”€ [Edit Details]     → openSaveDetails()
  â”‚                        SAVE_DETAILS with pre-filled saveDetailsDraft
  â”‚                        on confirm → replaceStack → SAVED_MANAGE
  â””â”€ [Remove]           → isConfirmingSavedRemove = true  (row turns red)
       [Confirm Remove] → removeSavedLocation(id)
                          navigateBack → PLACES_HUB (or CANDIDATE_DECISION)
```

## Places Hub row rendering

In `MapLocationIntentPlacesHubPanel`, each row needs to show the same decision context as the orbs, without the orb shape:

```
[ Icon ] [ Label ]          [ address or "Not set" ]   [ chevron ]
  ðŸ        Home               123 Main St, Lagos          →
  ðŸ’¼       Work               Not set                     →  (muted)
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
  â”œâ”€ isActive guard (mode !== RECENTS_HUB → null)
  â”œâ”€ ScrollView
  â”‚    â”œâ”€ Recent Pickups section
  â”‚    â”‚    â””â”€ RecentLocationRow Ã— n
  â”‚    â”œâ”€ Recent Visits section
  â”‚    â”‚    â””â”€ RecentLocationRow Ã— n
  â”‚    â””â”€ Empty state (if both empty)
  â””â”€ (no footer — back is top chrome)
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

---

## Reconciliation Note - 2026-05-24

> Appended during the 2026-05-24 docs update sweep (Pass 4 - shipped-plans batch). The plan body above is the LS-10 / LS-11 design. Both hubs have shipped against current HEAD.

**Status of original plan**

- **LS-10 Places Hub** - **Shipped** as `components/map/views/locationIntent/MapLocationIntentPlacesHubPanel.jsx`. Mode entry, `openPlacesHub`, and pinned + saved row pattern all match the plan.
- **LS-11 Recents Hub** - **Shipped** as `components/map/views/locationIntent/MapLocationIntentRecentsHubPanel.jsx`. Section split (Recent Pickups / Recent Visits) and tap -> `CANDIDATE_DECISION` handoff match the plan.
- **Navigation glue (`openPlacesHub`, `openRecentsHub`)** - **Shipped** in `useLocationSheetNavigation.js`.
- **Mode constants (`PLACES_HUB`, `RECENTS_HUB`)** - **Shipped** in `mapLocationIntent.model.js`.
- **Shared row primitives reused (no new state)** - **Verified** - both panels self-guard with `mode !== TARGET -> null` per plan rule #1.

**Open questions revisit**

- Inline place-name search in Places Hub - still optional; defer until user count of saved places justifies it.
- "Clear recents" destructive action - not in current implementation; track as a low-priority follow-up if product asks.

**Carryforward** - none required. Plan is fully shipped.
