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

**Last updated**: 2026-05-11 (deep audit reconciliation)  
**Deep findings:** [LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md](./LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md)  
**Next action**: demo owner field fix -> saved address persistence/auth fix -> manual confirm-pin fallback
