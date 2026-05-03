# Insurance Stack Comparison Audit (2026-04-29)

Status: Pre-pass baseline

## Why This Pass Exists

`InsuranceScreen.jsx` still sits outside the modern stack-screen family established by payment, emergency contacts, profile, settings, and medical profile.

## Current Gaps

- The route-owned screen is still a large monolith.
- Header wiring, refresh, modal ownership, OCR scan flow, image upload flow, Query usage, Jotai wizard state, and all rendering live in one file.
- The screen still depends on a route-level FAB instead of the newer page-owned primary action pattern.
- Wide screens still stretch the compact/mobile composition instead of using the established left context island / center panel / XL action island layout.
- First-load loading still uses a blocking activity indicator instead of structural skeletons.
- Typography and copy are louder than the current utility-stack grammar.

## Comparison Against Current References

### Payment

- `Payment` is the structural reference for stage base ownership, wide-screen dead-space handling, and centered/bounded side-effect surfaces.
- `Insurance` should preserve its richer policy artifact UI, but it should adopt payment's shell discipline and responsive posture.

### Emergency Contacts

- `Emergency Contacts` is the state/interaction reference for a multi-step, centered modal editor inside the shared stack shell.
- `Insurance` already has stronger data plumbing than emergency contacts had at the start of its pass, but its route composition is still behind.

### Profile / Settings / Medical Profile

- These screens now share the same quiet blade grammar, calmer copy, lighter typography, and left/right wide-screen islands.
- `Insurance` should align to that family without flattening policy-specific affordances like reveal, default selection, or payment-link actions.

## State Management Status Before Pass

`Insurance` is not a full five-layer feature yet.

Current posture:

- server/service lane: `services/insuranceService.js`
- query lane: `useQuery(["insurancePolicies"])`
- jotai lane: `insuranceShowAddModalAtom`, `insuranceWizardStepAtom`, `insuranceFormDataAtom`

Missing layers:

- no Zustand canonical runtime store
- no XState lifecycle machine
- no explicit screen-model abstraction

This pass must improve state ownership honestly, but it should not claim a full five-layer migration if that does not land.

## Behavior That Must Not Regress

- list active policies
- refresh policy list
- create a new policy
- edit an existing policy
- delete a non-default policy
- set a policy as default
- link or update the payment method for a policy
- scan the front of an insurance card with OCR
- upload front and back card images
- preserve draft fields and wizard step across remount through the existing Jotai lane

## Pass Contract

The pass must land all four required tracks:

- state management improvement
- UI modernization
- DRY/modular extraction
- documentation

## Planned Outcome

- thin route wrapper
- dedicated `useInsuranceScreenModel`
- stack `StageBase` and wide layout
- centered, bounded modal wizard instead of route-owned inline complexity
- quiet, calmer copy and typography aligned with the stack family
- skeleton-first loading
- honest docs that record the remaining five-layer gap
