# Book Visit Stack Implementation Checkpoint (2026-04-29)

Status: Code implemented  
Verification state: Web bundle passed, runtime/device matrix still pending

## Scope

This wave modernized `/(user)/(stacks)/book-visit` to match the refined stack-screen family while hardening the booking draft into a real multi-layer state lane.

## What Landed

### 1. UI quality

- `screens/BookVisitScreen.jsx` is now composition-only.
- `components/visits/bookVisit/BookVisitScreenOrchestrator.jsx` now owns header wiring, compact vs wide composition, and modal mounting.
- `components/visits/bookVisit/BookVisitStageBase.jsx` now owns shell motion, viewport branching, and web-aware layout plumbing.
- `components/visits/bookVisit/BookVisitWideLayout.jsx` now uses:
  - left context island
  - stable center booking step column
  - ratio-gated right action island
- the legacy step panels under `components/visits/book-visit/` now render inside the shared shell contract instead of acting like a route-owned wizard
- specialty search and provider details now use responsive modal presentation instead of stretching on wider screens

### 2. State management

- `hooks/visits/useBookVisitQuoteQuery.js` now gives the summary step a TanStack Query quote lane.
- `stores/bookVisitStore.js` now persists the booking draft, step, seeded route state, and quote snapshot through Zustand-backed storage.
- `machines/bookVisitMachine.js` plus `hooks/visits/useBookVisitLifecycle.js` now own lifecycle legality for boot, editing, summary, submit pending, success, and error.
- `atoms/bookVisitAtoms.js` now gives modal and search UI a named Jotai home instead of burying it in the route hook.
- `hooks/visits/useBookVisitScreenModel.js` now centralizes:
  - persisted draft hydration
  - route seeding
  - specialty/provider derivation
  - quote orchestration
  - modal state coordination
  - visit submission and post-success navigation

### 3. DRY / modular code

- the route no longer owns:
  - wizard progression
  - wide-screen branching
  - provider and specialty modal state
  - summary quote derivation
  - submit side effects
- content, theme, sidebar geometry, shell, context island, action island, and step-panel composition now live in dedicated files under `components/visits/bookVisit/`

### 4. Documentation

- the pass now has:
  - pre-pass comparison audit
  - pass plan
  - this implementation checkpoint
- doc hubs were updated in the same pass

## State Management Status

`Book Visit` is improved, but only the booking-draft surface is now close to the five-layer target.

Current posture after this pass:

- provider/service lane: `useVisits()` / `VisitsContext` still owns visit creation
- query cache: visit quote query for the summary step
- Zustand store: persisted booking draft + route seed + quote snapshot
- XState machine: booking lifecycle legality
- Jotai UI state: specialty search + provider modal state

Still deferred:

- visits-domain replacement of `VisitsContext` with a full canonical query/store lifecycle
- shared visit creation mutations moved off the provider lane
- any realtime or cross-surface visit-draft synchronization outside the booking route

So the accurate claim is:

- `BookVisitScreen` state is materially hardened
- the broader `visits` domain is not yet a full five-layer feature

## Preserved Behavior

- select visit type
- choose specialty
- choose provider
- choose date and time
- review a booking summary
- submit a new visit request
- route to canonical visit details after success
- open specialty search and provider details

## Verification Performed

- static diff review
- `prettier --write` / `prettier --check` on touched files
- `git diff --check`
- grep sweep confirming no runtime consumers remain on the old `useBookVisit()` hook
- `npx expo export --platform web --output-dir .tmp-book-visit-web-check`

## Not Yet Verified

- mobile and desktop runtime interaction smoke
- seven-width visual matrix
- live booking submit against the running app
- deep-link and refresh recovery through the full booking flow
