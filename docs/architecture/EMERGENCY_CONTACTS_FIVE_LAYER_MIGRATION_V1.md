# Emergency Contacts Five-Layer Migration V1

Status: Active implementation contract
Documented: 2026-04-29
Scope: `EmergencyContacts` domain in `ivisit-app`

## Purpose

This document locks the `EmergencyContacts` feature to the same five-layer state model already used for the hardened map and trip flows.

The earlier local-only contact model is no longer acceptable for active emergency operations. Emergency contacts now need deterministic server truth, durable client hydration, legal lifecycle state, and isolated screen atoms.

## Canonical Product Rule

- Emergency contacts are phone-first operational responder contacts.
- `phone` is required in the canonical domain model.
- `email` is not part of the canonical emergency-contact model.
- Legacy local contacts without a phone number are not dropped.
- Legacy email-only or incomplete rows are held in a migration review surface until the user fixes or deletes them.

## Five-Layer Ownership

### 1. Supabase / Realtime

Owns:

- canonical `public.emergency_contacts` rows
- user-scoped realtime events
- CRUD truth after auth

Rules:

- server rows map to the app model:
  - `id`
  - `userId`
  - `displayId`
  - `name`
  - `relationship`
  - `phone`
  - `isPrimary`
  - `isActive`
  - `createdAt`
  - `updatedAt`
- realtime never mutates UI directly
- realtime only invalidates query or feeds the query-to-store sync path
- if the live project is missing `public.emergency_contacts`, the client must fall back to local canonical storage and keep realtime disabled until the backend migration is applied

### 2. TanStack Query

Owns:

- server fetch lifecycle
- optimistic mutation cache
- invalidation and reconnection behavior

Contract:

- query key: `["emergencyContacts", userId]`
- disabled until auth is ready and `userId` exists
- stale time: 30 seconds
- realtime invalidation is the freshness source
- bootstrap ownership lives in a single runtime effect host, not in each consumer hook
- `useEmergencyContacts()` is a consumer-facing facade and must not re-own hydration, migration, or realtime setup

### 3. Zustand

Owns:

- persisted client snapshot for cross-surface reads
- migration metadata
- skipped legacy review items

State shape:

- `contacts`
- `hydrated`
- `lastSyncAt`
- `migrationStatus`
- `skippedLegacyContacts`
- `lastMutationAt`
- `serverBacked`
- `backendUnavailable`

### 4. XState

Owns:

- legality of feature readiness
- migration and sync state transitions

States:

- `bootstrapping`
- `awaitingAuth`
- `migratingLegacy`
- `syncing`
- `ready`
- `mutationPending`
- `migrationReviewRequired`
- `error`

### 5. Jotai

Owns:

- editor visibility and mode
- draft values
- wizard step
- multi-select state
- save pending UI state

Rules:

- atoms do not duplicate query data
- atoms do not own canonical contacts
- contact card reveal and mask behavior may stay local to the card component

## Legacy Migration Contract

Input source:

- `StorageKeys.EMERGENCY_CONTACTS`

Migration partition:

- migratable: has valid `phone`
- skipped: missing `phone`

Rules:

- migratable rows upsert into Supabase using duplicate-safe signature matching
- skipped rows remain client-side in `skippedLegacyContacts`
- the legacy storage key remains read-only for one release cycle
- runtime code must stop treating the legacy key as canonical write storage
- exception: if the backend table is unavailable at runtime, the compatibility facade may temporarily persist canonical contacts locally until the migration is applied remotely

## Consumer Rules

Consumers must read from the compatibility hook and selectors, not from local storage:

- `useEmergencyContacts()`
- `selectEmergencyContacts`
- `selectReachableEmergencyContacts`
- `selectPrimaryEmergencyContact`
- `selectHasSkippedLegacyContacts`

Current required convergence targets:

- `MiniProfileModal`
- `ProfileScreen`
- `RequestAmbulanceScreen`
- `BookBedRequestScreen`
- map commit triage and payment controllers
- request flow shared-snapshot path

Bootstrap ownership:

- `RootRuntimeGate` hydrates the persisted emergency-contacts store before first render
- `RootBootstrapEffects` mounts `useEmergencyContactsBootstrap()` once under the root providers
- screens, modals, and controllers must not call `useEmergencyContacts()` for side effects only

## Stack-Screen Rule

`EmergencyContactsScreen` must follow the payment-style stack pattern:

- thin route file
- orchestrator owns header and FAB registration
- stage base owns shell and responsive layout
- screen model composes Query, Zustand, XState, and Jotai

## Non-Goals For This Pass

- no schema redesign beyond the already-supported backend table
- no route/path changes
- no new public API for consumers beyond the compatibility hook and selectors
- no broad `/map` redesign outside emergency-contact state-path convergence

## Verification Gate

This pass is not complete unless all of the following are true:

- legacy local contacts with a phone migrate to Supabase once and do not duplicate
- legacy contacts without a phone appear in migration review
- `EmergencyContactsScreen` no longer exposes an email field in canonical create/edit flow
- mini profile, profile, request, and commit surfaces update after mutation without restart
- no runtime writes remain against `StorageKeys.EMERGENCY_CONTACTS` outside migration compatibility code and backend-missing fallback mode
