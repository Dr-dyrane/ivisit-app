# CD-5 State Layers

Status: Not started
Owner: App State
Layer impact: Layer 3 Zustand, Layer 4 XState, Layer 5 Jotai

## Goal

Add only the local state needed for modal visibility, composer draft, and lifecycle legality without duplicating server truth.

## Files

- `atoms/emergencyChatAtoms.js`
- optional `stores/emergencyChatStore.js`
- `machines/emergencyChatRoomMachine.js`
- `hooks/emergencyChat/useEmergencyChatRoomLifecycle.js`

## Guardrails

- Messages stay in TanStack Query.
- Participants stay in TanStack Query.
- Room truth stays in TanStack Query/Supabase.
- Jotai owns ephemeral modal UI.
- Zustand is optional and only for durable drafts/outbox metadata.
- XState owns send/archive/readiness legality, not message rows.

## Jotai Atoms

- `emergencyChatModalVisibleAtom`
- `activeEmergencyChatRequestIdAtom`
- `emergencyChatQuickActionsVisibleAtom`
- `emergencyChatComposerFocusedAtom`
- `emergencyChatScrollIntentAtom`

## Optional Zustand Store

Only create if draft persistence is required:

- `draftsByRoomId`
- `lastOpenedRequestId`
- `setDraft`
- `clearDraft`
- `setLastOpenedRequestId`

## XState Machine

States:

- `idle`
- `ensuringRoom`
- `loadingMessages`
- `ready`
- `sending`
- `reconnecting`
- `archived`
- `error`

## Acceptance

- Opening/closing modal does not destroy canonical message cache.
- Composer draft behavior is deterministic.
- Cannot send before room is ready.
- Archived rooms disable composer.
- No canonical server truth is copied into atoms/store.

## Changed Files

- TBD

## Verification

- TBD

## Rollback Notes

- Remove atoms/machine/store if UI pass is rolled back before release.
