# Location, Search, UX, And Demo Hospital Fixes - Last 24h Deep Audit Plan

**Date:** 2026-05-11  
**Status:** Audit required before more feature expansion  
**Owner surfaces:** `/map` LocationSheet, SearchSheet reuse, manual address entry, saved places, recents, UI/UX recovery passes, demo hospital bootstrap/coverage gates  
**Purpose:** Capture the current implementation state after rapid fixes and define the audit passes needed to catch regressions, divergence, duplication, and iVisit-way violations.

---

## Executive Read

The last 24 hours produced meaningful product gains:

- LocationSheet is now the owner of location selection, candidate decisions, saved-address actions, recents, and manual entry.
- Manual address entry is no longer a dead-end postal form. It now supports guided steps, typed fallback, country-scoped geocoding, and Nigeria-specific state -> city -> LGA/area ordering.
- Search and location selection are closer to the target architecture where SearchSheet supplies result-row patterns and LocationSheet owns the selected-address decision tree.
- UX guardrails were added for sticky CTAs, progressive disclosure, loading states, no blank transitions, and one active decision context.
- Demo hospital duplicate handling has a pass plan and known invariants.

The risk is also real:

- Several fixes landed quickly across many files.
- Some files crossed or remain near iVisit refactor thresholds.
- Location state is now split across local state, Jotai atoms, Zustand, TanStack Query, services, and map phase navigation.
- UI surfaces were improved in function, but still need a strict visual audit to ensure they do not become alien to the rest of the app.

This document is the checkpoint for a full deep audit before the next large location/search implementation wave.

---

## Current Implementation State

### LocationSheet

Current code now includes:

- `MapLocationIntentStageBase.jsx`
  - owns sheet mode orchestration
  - wires manual draft state
  - wires candidate controller
  - wires saved-address actions
  - wires manual drop search
  - commits pickup candidates to location truth
  - routes to candidate decision, save category, save details, and saved manage states

- `MapLocationIntentStageParts.jsx`
  - renders default location state
  - renders search mode rows
  - renders manual active step
  - renders completed summaries
  - renders candidate panel
  - passes manual typed fallback and country-specific labels

- `MapLocationIntentCandidatePanel.jsx`
  - owns selected-address decision surfaces
  - renders candidate action groups for pickup, save, manage, and nearby hospital decisions

Audit trigger:

- `MapLocationIntentStageBase.jsx` is about 1038 lines.
- `MapLocationIntentStageParts.jsx` is about 822 lines.
- These exceed the app's documented code-size comfort range and require decomposition before more behavior lands.

### Manual Address Entry

Current code now implements:

- country selection
- country-specific state/province labels
- Nigeria-specific `State` followed by `LGA or area`
- city selection before LGA/area
- typed fallback for weak/no provider suggestions
- search query scoping with prior manual fields:
  - `districtArea`
  - `city`
  - `adminArea`
  - `country`
- dependency reset:
  - country change clears state/city/LGA/place
  - state change clears city/LGA/place
  - city change clears LGA/place
  - LGA/area change clears place
- country-constrained geocode calls for Mapbox and OSM fallback
- manual phase ownership in the sheet header:
  - active step as title
  - `Manual Entry - Step x of y` as subtitle

Audit trigger:

- Manual flow is functionally safer, but the visual rhythm still needs an Apple-HIG pass.
- Confirm-pin fallback remains conceptually planned but is not yet a complete map-confirmation recovery state.
- Typed fallback is useful, but must be tested so it does not visually compete with provider suggestions.

### Search

Current direction:

- SearchSheet remains the reference for grouped result rows.
- LocationSheet search mode consumes search result patterns and converts selection into an address candidate.
- Search result selection should not directly mutate pickup truth.

Audit trigger:

- Search architecture has historical SearchSheet code plus newer LocationSheet search state.
- Need to confirm no duplicate provider debounce/search hook is now competing with canonical `useLocationSearchQuery` or `addressAssistService`.
- Need to confirm recent queries, recent pickups, saved places, and recent visits do not duplicate or leak categories into one another.

### UI/UX Review Fixes

Current direction:

- Sticky terminal actions are documented as required.
- Loading states must preserve shell and avoid blank white states.
- Sheet subphases should own the sheet header.
- Copy should be brief, task-owned, and not explanatory.
- One active decision context per surface.

Audit trigger:

- Some fixes were made to location only, while similar defects remain app-wide.
- Need to audit whether location is following the updated standard instead of reproducing older emergency/transport/payment issues.

### Demo Hospital

Current docs define:

- duplicate hospital root cause
- five-pass remediation plan
- deploy groupings
- invariants
- acceptance checks

Audit trigger:

- The docs still mark demo passes as planned.
- Need implementation audit to verify whether current code has caught up, partially diverged, or is still pending.
- Need to confirm location changes did not alter coverage gate behavior or nearby hospital discovery assumptions.

---

## Deep Audit Passes

### Pass A - Current Diff Inventory And Ownership

Goal:

- Produce a file-by-file inventory of all changed location/search/UX/demo-hospital files from the last 24 hours.

Inspect:

- `git diff --name-only`
- `git status --short`
- `components/map/views/locationIntent/*`
- `hooks/map/locationIntent/*`
- `atoms/locationIntentAtoms.js`
- `services/addressAssistService.js`
- `services/mapboxService.js`
- `components/map/surfaces/search/*`
- `services/demoEcosystemService.js`
- Supabase demo bootstrap function files if changed
- docs touched in architecture, UX, audit, and demo

Questions:

- Which changes are implementation?
- Which changes are docs only?
- Which files are newly created?
- Which files were modified by user UI passes vs assistant architecture passes?
- Which changes are staged vs unstaged?

Output:

- Current implementation map.
- "Do not revert" ownership notes.
- Candidate commit grouping.

---

### Pass B - Location State Architecture Audit

Goal:

- Verify location follows the five-layer rule:
  - atoms for local UI state
  - machine/reducer where state has named transitions
  - Zustand/context for app truth
  - TanStack Query for server/provider data
  - Supabase/database for persistence

Inspect:

- `MapLocationIntentStageBase.jsx`
- `useLocationSheetNavigation.js`
- `useAddressCandidateController.js`
- `useSavedAddressActions.js`
- `useManualDropController.js`
- `atoms/locationIntentAtoms.js`
- `stores/locationStore.js`
- `services/locationAddressService.js`
- `services/savedLocationsSyncService.js`

Risks to catch:

- local state that should be atom-backed
- atom state that should be machine state
- query/provider data held in component state
- persistence bypassing `database`/`StorageKeys`
- candidate state diverging from pickup truth
- saved-address identity mutating active pickup without explicit CTA
- manual draft surviving or clearing at the wrong moments

Acceptance:

- Every state field has one owner.
- Every transition has one path.
- No provider/server data is fetched from render components.
- No saved-address action commits pickup implicitly.

---

### Pass C - Manual Address Functional Audit

Goal:

- Validate every manual step and fallback path.

Inspect:

- `mapLocationIntent.model.js`
- `ManualStepActiveField.jsx`
- `ManualStepCompletedSummaries.jsx`
- `ManualStepStickyFooter.jsx`
- `useManualDropController.js`
- `addressAssistService.js`
- `mapboxService.js`

Must verify:

- country -> state -> city -> LGA/area -> place order
- Nigeria does not label state as LGA
- city search includes selected country/state context
- LGA search includes selected country/state/city context
- place search includes selected country/state/city/LGA context
- typed fallback advances and stores the correct key
- pressing `Next` with typed query behaves the same as pressing typed fallback
- changing earlier fields clears dependent later fields
- completed summaries remain editable
- back navigation preserves draft
- close/cancel behavior is intentional
- weak Mapbox/OSM results do not silently become high confidence
- geocode failure does not fall back to stale GPS

Open concern:

- Confirm-pin fallback is still not fully productized. The audit should define whether it is required before production manual entry.

---

### Pass D - Search And Location Reuse Audit

Goal:

- Catch duplicate search logic and SearchSheet/LocationSheet divergence.

Inspect:

- `components/map/surfaces/search/*`
- `components/map/views/locationIntent/*`
- `hooks/search/useLocationSearchQuery.js`
- `hooks/map/locationIntent/useManualDropController.js`
- `services/addressAssistService.js`
- `services/mapboxService.js`
- `contexts/SearchContext.jsx`

Risks to catch:

- multiple debounce implementations for provider search
- multiple suggestion mappers
- stale or conflicting result shapes
- manual search and address search using different provider contracts
- recents stored in saved locations incorrectly
- saved places appearing as recents
- recent visits appearing as saved addresses
- duplicate UI row families

Acceptance:

- One provider adapter contract.
- One suggestion-to-candidate mapping path or a documented migration plan.
- Search results and selected candidate rows reuse established surfaces.
- LocationSheet owns decisions after selection.

---

### Pass E - Apple/iVisit UI Audit

Goal:

- Verify the feature feels like iVisit and Apple-inspired sheet UI, not a custom wizard.

Inspect:

- default LocationSheet
- address search state
- manual entry state
- candidate decision state
- save category state
- save details state
- saved manage state
- wide web/sidebar rendering
- mobile sheet half and expanded snaps

Rules:

- sheet header owns the subphase
- one active decision per state
- no body-level progress widgets that compete with header
- helper copy is short and task-owned
- grouped surfaces match SearchSheet, Mini Profile, Tracking, Payment, and OTA recovery patterns
- sticky CTA is present for terminal actions
- loading states preserve layout
- no blank white transitions
- no nested cards inside cards
- no redundant explanatory copy
- no repeated context inside placeholders when summaries already show it

Acceptance:

- A user returning after distraction knows the phase from the header.
- A user can act without reading paragraphs.
- No CTA is hidden under scroll.
- Every touch gives visible feedback.

---

### Pass F - Regression And Runtime Audit

Goal:

- Catch runtime errors from rapid wiring changes.

Inspect manually in app:

- open LocationSheet from explore intent chrome
- open from mini profile address CTA if available
- search address
- select result
- candidate decision
- save as Home
- save as Work
- save as Other
- manage saved place
- remove saved place
- use saved as pickup
- enter manual address
- typed fallback for city/LGA/place
- geocode success
- geocode failure
- back from every subphase
- close from every subphase
- wide web sidebar mode
- mobile half snap
- mobile expanded snap
- keyboard open on every manual input

Console warnings to catch:

- undefined constants
- nested button warnings
- invalid prop warnings
- hydration warnings
- Mapbox/OSM network errors
- stale state after back navigation

Acceptance:

- No unhandled exceptions.
- No invalid DOM nesting warnings from nested `Pressable` button structures.
- No stuck manual state.
- No hidden CTA under keyboard or scroll.

---

### Pass G - Code Length/DRY/Modularization Audit: COMPLETE

**Current line counts (measured):**

| File | Lines | Threshold | Status |
|---|---:|---:|---|
| `MapLocationIntentStageBase.jsx` | **1091** | 500 max / 800 mandatory | Critical violation |
| `MapLocationIntentStageParts.jsx` | **850** | 950 StageParts cap | Watch |
| `mapLocationIntent.styles.js` | **546** | 500 max | Over |
| `ManualStepActiveField.jsx` | **457** | 350 component max | Over |
| `mapLocationIntent.helpers.js` | **429** | 200 utils max | Over |
| `MapLocationIntentCandidatePanel.jsx` | **361** | 350 component max | Over |

**Required extraction (before any new behavior lands on StageBase):**
1. `useManualAddressFlowMachine.js` - manual draft, validation, step movement, typed fallback, geocode fallback.
2. `useLocationCandidateFlow.js` - candidate creation, confirm, find-nearby, save-category transitions.
3. `useLocationHeaderModel.js` - title/subtitle/back/close semantics per subphase.
4. `useLocationRecentsWriter.js` - separate recent pickup writes from saved address CRUD.

---

### Pass H - Demo Hospital Fix Audit: IMPLEMENTED BUT AUDIT-FAILED

**Status: code was implemented after the plan, but the audit found a likely owner-field bug.**

- Commits `1197657` and `55cb882` implement demo scope and client coverage tightening.
- `docs/audit/demo/README.md` still says the implemented passes are `PLANNED`.
- `services/demoEcosystemService.js` owner matching expects `hospital.demoOwner`.
- `getPersistedDemoCoverageForLocation()` does not select an owner field, so same-user demo rows may fail owner matching.
- Required fix: select and normalize the owner field before calling `matchesDemoOwner()`.

---

### Pass I - iVisit Way Violations: PARTIAL

**Found in the deeper audit:**

| Violation | Class | Pass |
|---|---|---|
| Saved addresses show local success before server truth | State layer / trust | Persistence pass |
| Saved location bootstrap is not keyed to active user | Identity ownership | Persistence pass |
| Demo owner matcher does not receive owner field | Demo data ownership | Demo pass |
| Manual no-match recovery blocks instead of confirm-pin | Emergency UX | Manual pass |
| Header back and footer back disagree in manual mode | Navigation | Manual pass |
| Top-level search still uses direct Mapbox effect/timer | Query duplication | Search pass |
| Recents write through saved address CRUD | Data ownership | Recents pass |
| Candidate summary row is a button without action | Accessibility | UI semantics pass |
| LocationSheet base remains 1091 lines | File size | Decomposition pass |
| Non-ASCII comments in code | Encoding guardrail | Hygiene pass |

---

### Fix Now / Fix Next / Defer

| Priority | Item | Reason |
|---|---|---|
| **Fix now** | Demo owner field select/normalization | Can cause repeated bootstrap or false insufficient coverage |
| **Fix now** | Saved address persistence/auth bootstrap | User identity and trust risk |
| **Fix next** | Manual no-match confirm-pin fallback | Emergency completion risk |
| **Fix next** | Manual header back semantics | Navigation safety |
| **Fix next** | Search query unification | Duplicate provider behavior |
| **Fix next** | Split recents from saved locations | Data ownership |
| **Defer** | Full StageParts split | Needed, but after correctness |
| **Defer** | Icon standardization | Polish pass |
| **Defer** | Runtime regression testing | User will test, but checklist remains required |

---

## 2026-05-13 Location Intent Remaining Pass Contract

Use the following passes to compare the current implementation against both code correctness and Apple-level UX quality. These passes are not feature wishlists. Each pass must answer:

1. What is implemented in code today?
2. Does the implementation match the documented LocationSheet contract?
3. Does the UI feel calm, obvious, fast, forgiving, and consistent with the rest of iVisit?
4. Are state ownership, persistence, side effects, snap state, loading state, keyboard behavior, and rollback paths correct?

### LI-1 - Mode And Snap Contract Audit

**Implemented area to inspect:**

- `MapLocationIntentStageBase.jsx`
- `useCandidateHandlers.js`
- `useManualEntryHandlers.js`
- `useLocationSheetNavigation.js`
- Location sheet shell snap handlers

**Correctness target:**

- Search focus expands once and stays expanded.
- Selecting search/manual/saved/recent candidate collapses once into candidate decision.
- Manual, Places Hub, Recents Hub, save category, save details, and saved manage own their expected snap state.
- Hooks never fight the StageBase snap policy.
- Back/close behavior returns to the previous sheet mode without closing the whole sheet accidentally.

**UX target:**

- No expand-then-collapse flicker.
- No blank sheet body during mode transition.
- Every subphase clearly owns the header title/subtitle so the user knows where they are after distraction.

### LI-2 - Manual Address Flow Audit

**Implemented area to inspect:**

- `ManualStepActiveField.jsx`
- `ManualStepCompletedSummaries.jsx`
- `ManualStepStickyFooter.jsx`
- `useManualDropController.js`
- `addressAssistService.js`
- manual draft model in `mapLocationIntent.model.js`

**Correctness target:**

- Country, state/region, city, LGA/area, street/place, unit, and responder note keep draft state across back navigation.
- Search requests include prior context in the correct order, for example `Amuwo Odofin, Lagos, Lagos State, Nigeria`.
- City comes before LGA/area for Nigeria-specific language.
- Provider no-result states allow typed fallback instead of hard-blocking the user.
- Geocode failure never fabricates coordinates from stale GPS.

**UX target:**

- One decision per step.
- No long-form feel.
- Completed summaries are clear and editable without stealing focus from the active step.
- Sticky CTA remains visible above keyboard and scroll.
- Optional fields feel useful, not like extra homework.

### LI-3 - Candidate Decision Surface Audit

**Implemented area to inspect:**

- `MapLocationIntentCandidatePanel.jsx`
- candidate action builders
- candidate header/body/footer rendering in StageBase

**Correctness target:**

- Search, manual, saved places, recents, and current-location alternatives all normalize into one candidate shape.
- No candidate commits pickup until `Use as pickup` is tapped.
- `Find nearby hospital`, Home, Work, Add Saved Place, and pickup actions receive the right source metadata.
- Candidate decision state has one address summary group and one action group.

**UX target:**

- The address summary is readable and not duplicated with the search input.
- CTA groups use the correct icon/color family:
  - Pickup: generic blue.
  - Home/Work/Add: saved-place orb family.
  - Manage/edit/remove: settings/destructive family.
- Primary decision remains visible without scrolling.

### LI-4 - Saved Places CRUD And Identity Audit

**Implemented area to inspect:**

- `useSavedAddressActions.js`
- `stores/locationStore.js`
- `services/savedLocationsSyncService.js`
- Places Hub / saved manage UI
- Mini profile address entry point

**Correctness target:**

- Home and Work are singleton identity slots.
- Other saved places can coexist when category/label differs.
- Save/update/remove has explicit status: idle, draft, validating, saving, saved, failed.
- Local persistence and remote sync do not lie about final success.
- Auth changes do not leak saved places across users.

**UX target:**

- Saved-place actions feel reversible and safe.
- Remove is a two-step confirmation.
- Edit/manage happens inside LocationSheet, not a separate modal.
- Mini profile address entry routes into the same owner surface.

### LI-5 - Default Layout, Recents, And Empty State Audit

**Implemented area to inspect:**

- `MapLocationIntentStageParts.jsx`
- Places orb row
- manual trigger row
- Recents grouping
- empty state rendering

**Correctness target:**

- Manual trigger remains above Recents.
- Empty Recents never leaves a dead section.
- Recent pickup memory is distinct from saved-place identity.
- Recent hospital/visited-location rows only render when coordinates and address are usable.

**UX target:**

- Half snap contains only useful first decisions.
- Expanded snap adds depth, not required CTAs.
- Section headers, typography, chevrons, and row spacing match Explore Intent/SearchSheet grammar.

### LI-6 - Search Ownership And Reuse Audit

**Implemented area to inspect:**

- `SearchContext.jsx`
- SearchSheet suggestion mapping
- LocationSheet search mode
- `addressAssistService.js`
- `mapboxService` usage

**Correctness target:**

- LocationSheet owns selected-location decision state.
- SearchSheet and LocationSheet do not maintain competing provider-search contracts.
- Suggestion mapping is shared or normalized through a service boundary.
- Result selection creates a candidate, not an immediate pickup commit.

**UX target:**

- LocationSheet search rows reuse established SearchSheet row grammar.
- Loading, no-result, recents, and grouped-address states feel identical across search surfaces.
- Debounced search gives visible feedback quickly enough to avoid hesitation.

### LI-7 - Code Health And Rollback Audit

**Implemented area to inspect:**

- `MapLocationIntentStageBase.jsx`
- `MapLocationIntentStageParts.jsx`
- `mapLocationIntent.styles.js`
- `mapLocationIntent.helpers.js`
- locationIntent hooks and atoms

**Correctness target:**

- No component owns provider calls, persistence writes, navigation stack, and render layout all at once.
- State layer rules are respected:
  - local component state for disposable view-only state,
  - Jotai for sheet UI state that must survive snap/remount,
  - Zustand for persisted client truth,
  - Query/service boundary for provider fetches,
  - Supabase only through sync/service lanes.
- No nested `Pressable` button structures on web.
- No mojibake or non-ASCII artifacts in touched source files.

**UX target:**

- Smaller components make state transitions auditable.
- Styling stays DRY enough that spacing/snap fixes do not fork per mode.
- Rollback notes exist near risky behavior changes.

### LI-8 - Runtime QA Checklist For User Testing

The user owns runtime testing, but each implementation pass must leave these scenarios ready to test:

- Default half snap: search, hero, places, manual, and useful recents/empty state are visible.
- Search focus: sheet expands and header/back/close semantics change correctly.
- Search select: candidate decision appears and sheet collapses without flicker.
- Manual entry: keyboard never hides CTA; back preserves draft; provider no-result allows typed fallback.
- Candidate actions: pickup commit, Home, Work, Add Saved Place, Find Nearby Hospital.
- Saved manage: use, edit, remove confirm, cancel.
- Wide web: left/sidebar layout and map chrome remain aligned.
- Mobile: no hidden CTA under scroll, no blank transition, no layout jump.

---

**Last updated**: 2026-05-13 (Location Intent implemented-vs-correctness-vs-UX pass contract)
**Deep findings:** [LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md](./LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md)  
**Next action**: run LI-1 through LI-8 before adding new Location Intent feature depth

---

## 2026-05-13 Closure Pass Started

**Status:** In progress
**Scope:** LI-1, LI-2, LI-3, LI-4, LI-7

### Applied Corrections

- **Subphase header ownership:** LocationSheet now passes explicit header title/subtitle for search, manual, candidate decision, save category, save details, saved manage, places hub, recents hub, and pin adjust. This prevents the sheet from showing the default pickup header while the user is deep inside a decision branch.
- **Manual search context:** `addressAssistService` now builds comma-separated contextual queries from prior manual fields, so a district/LGA search is scoped by city, region, and country instead of searching as a disconnected string.
- **Manual context affordance:** manual search-drop fields now show a compact `Within ...` hint so users understand why results are narrowed without adding long explanatory copy.
- **Saved-place action feedback:** candidate/save/manage rows now receive CRUD status and show disabled/pending/error states during save or remove operations.
- **Saved-place edit freshness:** editing an existing saved place now refreshes the active saved candidate after persistence succeeds, so the user returns to the manage surface with updated label/unit/note state instead of stale pre-edit data.
- **LocationSheet search ownership cleanup:** `useAddressSearchController` now uses the shared `useLocationSearchQuery` TanStack Query hook instead of a LocationSheet-only timer and direct `mapboxService` call.
- **Display-only row semantics:** shared `SearchResultRow` now renders as a non-button view when no `onPress` is supplied. The selected-address summary in LocationSheet no longer appears as an inert button to web or assistive tech.
- **Saved result return bug:** `useSavedAddressActions.save()` now returns the scoped saved/update result correctly instead of referencing a block-scoped result outside its branch.
- **Source hygiene:** touched Location Intent and saved-location service comments were normalized back to ASCII to remove mojibake risk in active rollback notes.

### Verification

- Static JSX/JS parse passed for touched Location Intent files using `@babel/parser`.
- Runtime/device verification remains user-owned per the testing agreement.

### PR-Style Closure Audit

**Status:** Static audit complete, runtime pending user review.

**Regression fixes caught during closure audit:**

- `useSavedAddressActions.save()` return-shape comment now matches the implemented saved/updated record payload.
- The architecture plan now uses the current `candidateDecision` / save / manage mode vocabulary instead of old `placeSelected` language.
- Manual flow arrows and fallback copy in the architecture plan were normalized back to ASCII to avoid mojibake in rollback docs.
- Existing Home/Work candidate CTAs now say `Change Home` / `Change Work` and use the solid filled orb with white icon, while empty slots keep `Set as Home` / `Set as Work`.

**Closure sweeps completed:**

- No missing `LOCATION_INTENT_MODES` imports in LocationSheet render paths.
- No direct provider calls inside LocationSheet render/controller files; provider access stays behind shared query or service lanes.
- No nested web button structures in the candidate decision surface.
- No mojibake/non-ASCII artifacts in touched active source files.
- `@babel/parser` parse and `git diff --check` pass for the touched file set.

### Pullback Notes

- If subphase headers feel too verbose in runtime review, rollback only the `locationHeaderModel` block in `MapLocationIntentStageBase.jsx`; the mode/snap contract remains independent.
- If manual context hints crowd small phones, rollback only the `contextHint` render in `ManualStepActiveField.jsx`; contextual search query scoping should remain.
- If CRUD pending UI conflicts with an existing app-wide spinner pattern, rollback only the `crudStatus` props/rendering in `MapLocationIntentCandidatePanel.jsx`; keep the saved-address state machine.
- If the shared query hook causes unexpected result caching in runtime review, rollback only `useAddressSearchController.js`; do not restore provider calls inside `MapLocationIntentStageBase.jsx`.
- If saved-place edit freshness causes any unexpected candidate jump, rollback only the `savedResult` refresh block in `useCandidateHandlers.js`; keep the `useSavedAddressActions.save()` return payload because it remains useful for future status UI.
- If non-interactive `SearchResultRow` affects any SearchSheet visual rhythm, rollback only the no-`onPress` branch in `MapSearchSheetSections.jsx`; the LocationSheet candidate summary can be replaced with a local static row instead.

### Standing Engineering Rule - State Flow Edits

The saved-address return-shape bug in `useSavedAddressActions.save()` is now a permanent guardrail reminder.

When changing behavior in LocationSheet or any iVisit state machine:

- Treat return-shape changes as high-risk, even when the UI diff is small.
- After each behavioral edit, run a syntax parse/check before stacking the next behavioral edit.
- Re-read the full function after changing variable scope, especially across `if` / `else` / `try` / `catch` branches.
- Prefer one explicit outer result variable when a value must be returned after multiple branches.
- Verify every caller contract when changing a function from boolean success to object result, status tuple, or payload.
- Do not call a pass "clean" until the exact files touched by the behavior change have passed static parsing.
- Work efficiently, but never compress away basic engineering hygiene; there is enough time to do the careful version.
