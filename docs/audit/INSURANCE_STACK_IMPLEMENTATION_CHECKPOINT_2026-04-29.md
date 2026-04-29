# Insurance Stack Implementation Checkpoint (2026-04-29)

Status: Code implemented  
Verification state: Runtime/device matrix still pending

## What Landed

- `screens/InsuranceScreen.jsx` is now a thin route.
- `components/insurance/InsuranceScreenOrchestrator.jsx` now owns header wiring, focus refresh, compact vs wide composition, and modal mounting.
- `components/insurance/InsuranceStageBase.jsx` now owns shell, motion, and `stackViewportConfig.js` consumption.
- `hooks/insurance/useInsuranceScreenModel.js` now owns:
  - Query-backed policy loading
  - wizard modal state orchestration
  - OCR/image side effects
  - payment-link handoff
  - default/delete/save actions
  - coverage summary derivations
- `components/insurance/InsuranceEditorModal.jsx` replaces the route-owned inline wizard.
- `components/insurance/InsuranceWideLayout.jsx` now uses:
  - left context island
  - center coverage artifact list
  - XL right status/action island

## State Management Status

`Insurance` still is **not** a full five-layer feature.

Current posture after this pass:

- service/server truth: `insuranceService`
- query cache: `useQuery(["insurancePolicies"])`
- Jotai UI state: modal open state, wizard step, draft, edit identity
- route-local busy state: scan/save pending flags

Still deferred:

- Zustand canonical runtime store
- XState lifecycle machine
- full five-layer coverage architecture contract

## Data-Path Hardening

- edit identity no longer lives in route-local `useState`; it now survives remount through `insuranceEditingIdAtom`
- `syncUserData()` now runs after create/delete so `AuthContext.user.hasInsurance` stays closer to the real coverage state
- refresh remains available in compact and wide layouts through `RefreshControl`

## Preserved Behavior

- list policies
- refresh the coverage screen
- create and edit policies
- set a policy as default
- delete eligible policies
- scan an insurance card with OCR
- upload front/back card images
- link a policy to the payment screen
- preserve wizard draft and step across remount through Jotai

## Surface Outcome

- compact/mobile now opens as a calm coverage summary page
- add/edit work happens in a responsive modal instead of a route-owned monolith
- wide screens use context islands and an action island instead of stretched mobile layout
- first-load UI now favors structural skeletons over a blocking activity spinner
- visible typography is calmer and capped below the older heavy all-caps treatment

## Remaining Verification

Still needed before calling this fully closed:

- seven-width visual matrix: `375, 430, 744, 1024, 1280, 1440, 1920`
- runtime smoke for:
  - first load with empty coverage
  - add coverage wizard
  - edit existing coverage
  - set default
  - delete non-default coverage
  - OCR scan path
  - payment-link handoff
