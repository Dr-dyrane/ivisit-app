# App-Wide Surface Audit For Location

**Date:** 2026-05-10
**Status:** Design and implementation audit, no code changes
**Purpose:** Prevent LocationSheet from inventing alien UI surfaces while completing search, manual, saved address, recents, and mini profile entry flows.

---

## Sources Read

Design and architecture references:

- `docs/design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md`
- `docs/design/MINI_PROFILE_UI_DOCTRINE_V1.md`
- `docs/research/APPLE_MAPS_IPHONE_UI_REFERENCE.md`
- `docs/REFACTORING_GUARDRAILS.md`
- `docs/architecture/refactoring/TRACKING_SHEET_LEARNINGS.md`
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
- `docs/flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md`
- `docs/audit/map/MAP_CTA_STATE_CONTRACT_AUDIT_2026-05-02.md`
- `docs/architecture/ux/MODAL_RECOVERY_PASS_OTA_RATING_V1.md`
- `docs/architecture/ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md`

Implemented surfaces inspected:

- Explore Intent
- Search Sheet
- Tracking
- Commit Details
- Commit Payment
- Service Detail
- Mini Profile
- OTA update modal
- Rating modal recovery pass
- Shared map primitives

---

## Audit Conclusions

Location should not introduce a new visual system.

It should compose from these existing families:

1. **Map sheet shell family**
   - `MapSheetShell`
   - `MapStageBodyScroll`
   - `MapPhaseTransitionView`
   - `MapHeaderIconButton`
   - `MapStageGlassPanel`

2. **Search result / entity row family**
   - `SearchResultRow`
   - `ResultsSection`
   - grouped result surfaces from the search sheet

3. **Mini profile / settings row family**
   - orb-leading grouped rows
   - muted category tones
   - hairline content dividers
   - chevron/right meta
   - 56px minimum row height

4. **Commit/payment action group family**
   - grouped action rows
   - explicit disabled/loading states
   - sticky/docked footer for terminal actions

5. **Modal recovery family**
   - explicit close affordance
   - progressive optional sections
   - footer CTAs outside scroll body

---

## 2026-05-11 Implementation Checkpoint

Recent code now partially follows this audit:

- Manual step identity moved into the sheet header.
- Body-level manual progress dots were removed.
- Manual input helper copy was shortened.
- Context summaries were removed from input placeholders where completed summaries already render that context.
- Typed fallback was added as a recovery path for weak/no provider search results.
- Manual search state now uses a TanStack-query-backed controller instead of component-owned provider timers.

New audit risk:

- The functional fixes are useful, but the LocationSheet implementation is now large enough to hide UI-surface drift.
- `MapLocationIntentStageBase.jsx`, `MapLocationIntentStageParts.jsx`, and `mapLocationIntent.styles.js` need decomposition checks before new subphases are added.
- Every LocationSheet subphase should own the sheet header:
  - address search
  - candidate decision
  - save category
  - save details
  - saved manage
  - manual step
  - future pin adjust
- Each subphase must be compared against the existing search, mini profile, tracking, payment, and modal recovery surface families.

Deep audit companion:

- [`../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`](../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md)

---

## Global Rules Extracted

### Persistent Shell

- The map remains the spatial truth layer.
- The sheet shell remains mounted.
- Mode changes should feel like one sheet refocusing, not a route replacement.
- Use shared transition wrappers such as `MapPhaseTransitionView`.
- No blank white body between sheet states.

### One Active Decision

- Each state gets one active task.
- Do not show search, manual setup, save details, saved-place management, and recents as simultaneously expanded decisions.
- Expanded state adds depth, not permission to continue.

### CTA Truth

Every CTA should map to one of:

- `ready`
- `loading`
- `recover`
- `unavailable`

No fake active CTA should rely on the handler to reject later.

### Sticky Terminal Actions

- If a state has a terminal action and the body can scroll, the CTA belongs in a sticky footer outside the scroll body.
- This applies to candidate commit, save details, manual review, saved-place remove confirmation, and low-confidence emergency confirmation.

### Loading

- Layout-bearing loading states use skeletons or preserved-shell placeholders.
- Search uses result-shaped rows.
- Save/update/remove keeps the address group visible and shows pending state on the CTA.
- Manual geocoding keeps the current manual/review body visible.

### Copy

- Use task language, not generic progression language.
- Prefer:
  - `Use as pickup`
  - `Find nearby hospitals`
  - `Set as Home`
  - `Update Work`
  - `Save place`
- Avoid:
  - `Continue`
  - `Next`
  - `Submit`
  - vague helper copy that explains obvious UI.

### Visual Tone

- Accent tint is reserved for the current primary action.
- Saved address category actions use their category orb tone.
- Pickup actions use pickup blue.
- Neutral navigation stays muted.
- Destructive actions use destructive styling, not category color.

---

## Location Surface Decision Matrix

| Location state | Primary user job | Surface to reuse | CTA placement | Notes |
|---|---|---|---|---|
| `default` | choose entry point | Explore Intent hierarchy + Places orb row | no sticky footer | Search, hero card, places, recents, manual fallback stay calm and shallow. |
| `addressSearch` empty | restart or select recent | Search sheet grouped rows | no terminal footer | Show current pickup blade and recent searches; do not render the full default body underneath. |
| `addressSearch` loading | wait for predictions | Search result skeleton rows | no terminal footer | Never blank; preserve search input and shell. |
| `addressSearch` results | choose address candidate | `SearchResultRow` / `ResultsSection` | no terminal footer | Selection creates `activeCandidate`; no pickup commit. |
| `candidateDecision` | decide what to do with selected address | address group from search row + action group from mini profile/commit rows | sticky footer for primary commit when content scrolls | One address group, one CTA group. |
| `saveCategory` | choose saved place family | solid category orb grid/row | no terminal footer unless viewport is tight | Category orbs mirror first paint. |
| `saveDetails` | confirm label/unit/note | address group + compact editable rows | sticky footer | `Save place` and `Save and use as pickup` remain reachable. |
| `manualStep` | answer one guided field | commit-details one-question rhythm + assisted input | sticky footer for step action on scrollable bodies | One field per state; no visible multi-field form. |
| `manualResolving` | geocode draft | preserved manual review body | sticky pending footer | Do not clear body or fall back to stale GPS. |
| `savedManage` | use/edit/refresh/remove saved place | mini profile grouped action rows | sticky footer for destructive confirmation only | Remove needs in-sheet confirmation. |
| `deviceRecovery` | recover current location | current-location hero + grouped recovery rows | sticky footer when emergency confirmation is required | Stale/last-known must be named clearly. |
| `pinAdjust` | future map correction | map preview + candidate address group | sticky confirm footer | Deferred; must output `AddressCandidate`. |
| mini profile entry | open address management | mini profile `map` tone row | none in mini profile | Opens LocationSheet; no separate modal. |

---

## Reuse Decisions

### Address Entity Rows

Use the search sheet row family for:

- search predictions
- recent address candidates
- selected address group
- saved address address preview when the address itself is the object

Reason:

- It already expresses address/place entities with icon, title, subtitle, meta, pressed state, and chevron/check affordance.

### Saved Address Actions

Use mini profile/settings-style grouped rows for:

- Set Home
- Update Home
- Set Work
- Update Work
- Add to saved places
- Edit details
- Refresh address
- Remove saved place

Reason:

- These are user-owned management actions, not search results.
- The orb-leading row grammar gives Home/Work/category identity without visual chaos.

### Pickup Commit Actions

Use sticky footer or primary docked CTA for:

- Find nearby hospitals
- Use as pickup
- Save and use as pickup
- Confirm low-confidence emergency pickup

Reason:

- These actions cross into operational pickup truth and should not be buried inside a long action list.

### Secondary Neutral Actions

Use muted grouped rows or quiet buttons for:

- Pick another location
- Edit manual details
- Cancel
- Back

Reason:

- They preserve flow safety without competing with the primary decision.

---

## Implementation Guardrails

- Do not add a new Location-only card style unless one of the reuse families cannot express the state.
- Do not put provider API calls in render components.
- Do not let `useEffect` decide product actions such as save, commit, or navigate.
- Do not put terminal CTAs only inside scroll content.
- Do not render address candidate, save category, and save details all at once.
- Do not use route/page navigation for a normal LocationSheet step.
- Do not use `ActivityIndicator` as the only loading state for result lists or form shells.
- Do not use profile address as the owner of saved-address truth.

---

## Recommended Location Build Order After Audit

1. Extract address domain/service helpers.
2. Add LocationSheet navigation/action builders.
3. Normalize search/manual/saved/recent into `AddressCandidate`.
4. Wire candidate decision with search row + grouped action row families.
5. Add sticky footer CTA contract.
6. Add save category/details with mini-profile orb language.
7. Add manual assistance using the same candidate output.
8. Add mini profile address entry after the LocationSheet owner is stable.
