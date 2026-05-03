# Medical Profile State Architecture Audit (2026-04-29)

Status: Baseline captured after stack-screen modernization and before five-layer state migration

## Scope

Audit the canonical `medical profile` data lane as it exists after the screen modernization pass.

Primary owners audited:

- `hooks/user/useMedicalProfile.js`
- `services/medicalProfileService.js`
- `hooks/medicalProfile/useMedicalProfileScreenModel.js`
- downstream consumers in profile, request, and commit flows

## Current Posture

`MedicalProfileScreen` is now modern at the UI/shell layer, but its underlying state lane is still legacy-shaped.

Today the domain is effectively:

- Layer 1: `services/medicalProfileService.js`
- Layer 2.5: `hooks/user/useMedicalProfile.js`
- screen-local orchestration: `hooks/medicalProfile/useMedicalProfileScreenModel.js`

It is not yet:

- Query-backed canonical profile cache
- persisted shared store truth
- explicit lifecycle machine
- named Jotai UI lane for modal/editor ownership

## Strengths Already Present

1. The screen shell is modernized.
   The route is thin, editing happens in a bounded modal, and wide screens use context/action islands instead of stretching the form.

2. The service already handles real fallback behavior.
   `medicalProfileService` reads from Supabase when possible and preserves local-write fallback when remote sync fails.

3. The hook split is better than before.
   `useMedicalProfile()` now separates first-load state from save-pending state, which is a necessary prerequisite for a stronger architecture pass.

4. The domain is already cross-surface.
   `Medical Profile` is not isolated to one page. It is read by:

- `Profile`
- request ambulance
- book bed
- commit triage
- commit payment

That means the state lane matters beyond the stack page itself.

## Core Gaps

### 1. No Query layer

`useMedicalProfile()` still performs fetch/update directly via local `useState`.

Consequences:

- no canonical query key
- no shared stale/fresh semantics
- no explicit invalidation contract
- no optimistic update lane
- no route/surface-level reuse for downstream consumers

### 2. No shared persisted store

There is no medical-profile Zustand store for:

- canonical current snapshot
- hydration time
- last successful sync
- last mutation time
- reliable cross-surface selectors

So every consumer still depends on the hook/service lane instead of a shared state contract.

### 3. No lifecycle machine

There is no explicit machine for legality such as:

- bootstrapping
- awaiting auth
- syncing
- local-save fallback
- remote failure with local success
- retry
- ready

This matters because the domain has a subtle offline/remote-failure story that should be expressed as system state, not inferred ad hoc from booleans.

### 4. No named Jotai lane

The modern screen uses local/editor model state, but there is no named Jotai layer for:

- modal/editor visibility
- current edit draft
- unsaved change legality
- field-level temporary UI state

Right now that is acceptable for one screen, but it means the feature is still not aligned with the explicit five-layer pattern used elsewhere.

### 5. Canonical consumers still couple to the old hook

Direct reads from `useMedicalProfile()` remain in:

- `Profile`
- request ambulance
- book bed
- commit triage
- commit payment

So the legacy hook is still the real domain gateway.

## Product Risk

The UI is now trustworthy, but the domain beneath it is still weaker than the newer product lanes.

That creates three risks:

1. local fallback behavior remains harder to reason about than it should be
2. downstream consumers keep multiplying direct dependency on the hook/service pair
3. any future profile-derived behavior still starts from the weaker state lane

## Required Outcome

The next medical-profile pass should produce:

- one canonical query-backed profile read lane
- one shared persisted store
- one explicit lifecycle machine for local/remote sync legality
- one named Jotai editor lane
- one compatibility facade for existing consumers during migration

## Non-Goals

This pass should not:

- reopen the screen-modernization work already completed
- move the feature back to inline editing
- create a second local-only source of truth beside the canonical profile lane

## Pass Direction

The next medical-profile pass should be a real state migration, not another UI pass.
