# Book Visit Stack Pass Plan (v1)

Status: Pre-pass intent, implementation in progress

## Intent

Bring `/(user)/(stacks)/book-visit` into the refined stack-screen family and make the booking flow recoverable, web-inclusive, and state-layered.

## Target Architecture

- `app/(user)/(stacks)/book-visit.js` stays a thin route wrapper
- `screens/BookVisitScreen.jsx` becomes composition-only
- `components/visits/bookVisit/BookVisitScreenOrchestrator.jsx`
- `components/visits/bookVisit/BookVisitStageBase.jsx`
- `components/visits/bookVisit/BookVisitWideLayout.jsx`
- `hooks/visits/useBookVisitScreenModel.js`
- `components/visits/bookVisit/bookVisit.content.js`
- `components/visits/bookVisit/bookVisit.theme.js`
- `components/visits/bookVisit/bookVisitSidebarLayout.js`

Supporting surfaces expected in this wave:

- `BookVisitContextPane`
- `BookVisitActionIsland`
- `BookVisitStepPanel`
- `BookVisitSpecialtyModal`
- `BookVisitProviderModal`

## State Management Contract

This wave intentionally uses all five layers at the screen feature level:

- Layer 1: shared backend/provider visit-create lane through `useVisits().addVisit`
- Layer 2: TanStack Query helper for cost/quote calculation
- Layer 3: persisted Zustand booking draft store
- Layer 4: XState lifecycle machine for quote/submission legality
- Layer 5: Jotai atoms for ephemeral modal/search/provider UI state

Explicit constraint:

- the broader visits collection is still provider-backed and not yet migrated to a full five-layer collection feature

## Primary Changes

The route and screen should stop owning:

- header wiring
- shell animation and viewport branching
- wizard draft persistence
- modal/search state
- quote fetch timing
- post-success routing decisions

The page becomes:

- a recoverable booking task
- a calmer step flow with one primary action per moment
- a wide-screen shell with left context, stable center step panel, and optional right action island
- a booking surface whose modals stay centered and bounded on wide screens

## Preserved Behavior

- clinic and telehealth service choice still exists
- specialty search and selection still exist
- provider selection and review still exist
- date/time picking still exists
- booking summary and final confirm still exist
- visit creation still flows through the shared visits create lane
- successful booking still lands in visit details, but now through the canonical visit-details navigation helper

## Web / Wide-Screen Direction

- compact/mobile stays vertically simple
- wide layouts stop stretching the compact cards
- left island owns progress/context
- center owns the active booking step
- right island only appears when ratio allows it and should hold quick facts, current selection, and the primary next action
- centered task modals replace bottom-sheet-only posture on tablet/desktop

## Verification Target

- step progress survives refresh/reload until the booking is completed or cancelled
- telehealth and clinic paths both still work
- quote loading uses believable structural loading, not a lone spinner
- booking success navigates to canonical visit detail instead of the deprecated `/(user)/(stacks)/visit/[id]` route
- compact, `1280`, `1440`, and `1920` layouts stay healthy
- no route-sized activity-indicator-only loading state remains
