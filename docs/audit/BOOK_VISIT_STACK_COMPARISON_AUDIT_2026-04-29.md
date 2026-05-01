# Book Visit Stack Comparison Audit (2026-04-29)

Status: Pre-pass comparison baseline

## Scope

Audit `/(user)/(stacks)/book-visit` against the current refined stack references:

- `Payment`
- `Emergency Contacts`
- `Profile`
- `Settings`
- `Medical Profile`
- `Insurance`
- `Search`
- `Notifications`

## Current Shape

- `app/(user)/(stacks)/book-visit.js` is already a thin route wrapper.
- `screens/BookVisitScreen.jsx` is still a route-owned wizard that mixes:
  - header wiring
  - shell animation
  - viewport assumptions
  - step ownership
  - modal visibility
  - submission logic
  - success navigation
- `hooks/visits/useBookVisit.js` still owns the entire booking draft in local `useState`.
- `Book Visit` currently depends on the shared `VisitsContext` create lane, but has no screen-level persisted recovery path.

## Comparison vs Modern Stack Screens

### 1. State Management

Current posture:

- route-local wizard state
- local modal/search state
- local animation refs
- ad hoc quote fetch on step confirm
- shared provider-backed visit creation through `useVisits().addVisit`

Gap vs doctrine:

- no persisted booking draft, so reload loses meaningful work
- no named lifecycle machine for quote/submission legality
- no query-backed quote lane
- no Jotai home for ephemeral UI state
- no explicit documentation that the shared visits collection is still provider-backed

### 2. UI Quality

Current problems:

- mobile-first cards are stretched on wide screens instead of recomposed
- typography still uses older heavy weights and explanatory copy
- step surfaces do not match the calmer grouped blade grammar established by mini-profile, profile, settings, and search
- modals are legacy bottom-sheet style only, without centered wide-screen posture
- route motion exists, but route-sized recovery/loading states are not believable yet

### 3. DRY / Modular Shape

Current problems:

- no screen model
- no orchestrator
- no stage base
- no wide layout
- no shared content/theme/sidebar-layout files
- wizard branching and submission concerns are tangled inside one hook

### 4. Documentation

Current gap:

- `Book Visit` has no stack-wave audit, pass plan, or implementation checkpoint in the modern docs subtree

## Required Outcome For This Wave

- keep `book-visit.js` thin
- make `BookVisitScreen.jsx` composition-only
- add a persisted booking draft layer so meaningful progress survives Metro reload and app refresh
- move quote calculation onto a Query-backed helper
- add a lifecycle machine for quote/submission legality
- move ephemeral modal/search state into named Jotai atoms
- add a screen model, orchestrator, stage base, and wide layout
- preserve the existing visit-create behavior while routing post-success into the canonical visit-details path instead of the deprecated stack route

## Intentional Constraint

This wave improves `Book Visit` to a five-layer screen-level architecture, but the shared visits collection remains on the current provider-backed lane for now.

That means the post-pass checkpoint must say this explicitly:

- `Book Visit` draft/quote/submission UI is layered
- canonical visit list/detail state is still owned by `VisitsContext` and `useVisitsData`
