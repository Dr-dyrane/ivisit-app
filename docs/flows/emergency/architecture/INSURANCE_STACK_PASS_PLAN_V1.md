# Insurance Stack Pass Plan (v1)

Status: Active implementation plan

## Intent

Bring `/(user)/(stacks)/insurance` into the same stack-screen family as payment, emergency contacts, profile, settings, and medical profile.

## Target Architecture

- `screens/InsuranceScreen.jsx` as a thin route
- `components/insurance/InsuranceScreenOrchestrator.jsx`
- `components/insurance/InsuranceStageBase.jsx`
- `components/insurance/InsuranceWideLayout.jsx`
- `hooks/insurance/useInsuranceScreenModel.js`
- `components/insurance/InsuranceEditorModal.jsx`

## Primary Change

The route should stop owning:

- header wiring
- FAB registration
- query orchestration
- wizard step control
- OCR/image side effects
- wide-screen layout
- policy-card rendering

The page becomes:

- a readable coverage summary first
- one page-owned primary action
- a centered, responsive modal wizard for add/edit work
- a wide-screen shell that uses left/right islands instead of stretched compact UI

## Preserved Behavior

- policies still load from `insuranceService.list()`
- the query cache still uses the existing `insurancePolicies` lane
- the draft/modal/step path still uses the existing Jotai atoms
- users can still scan cards, upload images, set default, delete, edit, and link payment
- the payment-link handoff to `/(user)/(stacks)/payment` remains intact

## Additional Hardening

- add a dedicated screen model so the route is no longer the controller
- preserve the draft target through remount by promoting edit identity out of route-local `useState`
- sync `AuthContext` after create/delete so `hasInsurance` does not drift behind the screen state
- replace first-load spinners with structural skeletons
- cap visible type weight at `700`
- keep copy short and task-led

## State Management Posture

This pass is not the five-layer insurance migration.

Expected state posture after this wave:

- service/server truth: `insuranceService`
- query cache: `useQuery(["insurancePolicies"])`
- Jotai UI state: wizard open state, step, draft, edit identity
- route-local busy state: scan/upload/save pending flags

Deferred for later:

- Zustand canonical store
- XState lifecycle machine
- full five-layer coverage feature contract

## Verification Target

- page renders as a coverage summary, not a route-owned monolith
- add/edit modal works on compact and wide screens
- scan and image upload flows still function
- payment-link handoff still works
- default/delete/edit behaviors stay intact
- wide screens use context islands instead of stretched mobile layout
- route loading and list loading favor skeletons over blocking spinners
