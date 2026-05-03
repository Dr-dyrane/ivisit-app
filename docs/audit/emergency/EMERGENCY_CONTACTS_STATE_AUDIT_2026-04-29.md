# Emergency Contacts State Audit 2026-04-29

Status: Active implementation with backend-missing compatibility mode
Scope: `EmergencyContacts` runtime, storage path, and consumer surfaces

## Current State

The feature now follows the intended five-layer shape, but the live backend rollout is still incomplete.

Observed current state:

- Supabase CRUD and realtime are the canonical target
- TanStack Query owns fetch and mutation cache
- Zustand persists the cross-surface contact snapshot and migration metadata
- XState owns lifecycle legality
- Jotai owns editor, step, and selection UI state
- startup hydration now happens once in `RootRuntimeGate`
- auth/migration/query/realtime bootstrap now mounts once in `RootBootstrapEffects`
- `EmergencyContactsScreen.jsx` is now a thin route with an orchestrator and stage base
- the canonical domain is phone-first and no longer treats `email` as part of active contact editing
- if the live backend table is missing, the compatibility facade falls back to local canonical storage instead of failing the route

## Backend Reality

The codebase is aligned with the desired backend model, but the live project is not fully there yet:

- `supabase/migrations/20260219000100_identity.sql` creates `public.emergency_contacts`
- the active Supabase project can still return `PGRST205` because that table is missing from the live schema cache
- client code therefore needs a compatibility path until the remote migration is actually applied

This is both a state-architecture gap and a live backend rollout gap.

## Risk Register

### R1. Canonical mismatch

The repository expects `public.emergency_contacts`, but the active Supabase project can still be missing that table.

Impact:

- runtime 404 risk without a compatibility facade
- no cross-device truth until the remote migration is applied

### R2. Local-only truth

Fallback mode writes canonical contacts locally when the backend table is unavailable.

Impact:

- works around the fatal error
- still cannot provide realtime or multi-device convergence in that mode

### R3. Screen-owned workflow state

Repeated server migration attempts are still expected until the live table exists.

Impact:

- legacy contacts remain safe locally
- local canonical rows still need promotion to Supabase once the backend is fixed

### R4. Consumer remount dependency

Downstream consumers now read from the store-backed compatibility path and no longer need to bootstrap the feature per mount, but they still depend on the backend rollout for true server convergence.

Impact:

- same-device consumers stay current
- cross-device consistency remains blocked by backend rollout, not client state architecture

## Pass Intent

This pass promotes `EmergencyContacts` to the same five-layer model used elsewhere:

- Supabase / Realtime
- TanStack Query
- Zustand
- XState
- Jotai

## Invariants

- phone-first canon
- local legacy rows without phone are not lost
- compatibility hook API remains stable
- stack-screen refactor does not change the route path
- no direct runtime writes to legacy storage after migration except migration compatibility and backend-missing fallback mode

## Verification Targets

- add, edit, delete, and bulk delete mutate server truth and update local selectors
- skipped legacy rows surface in review UI
- request and commit flows read the latest reachable contacts
- mini profile count updates without restart
- no canonical email field remains in active emergency-contact UI
- backend-missing projects degrade to local canonical storage without a fatal 404
