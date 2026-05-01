# Medical Profile State Pass Plan (v1)

Status: Implemented in code on 2026-04-29, live verification pending

Checkpoint:

- `docs/audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`

## Intent

Finish the job that the `Medical Profile` stack-screen pass intentionally stopped short of:

- keep the modern screen shell
- replace the legacy hook/service data lane with a true five-layer feature state model

## Scope

Primary owners in scope:

- `hooks/user/useMedicalProfile.js`
- `services/medicalProfileService.js`
- `hooks/medicalProfile/useMedicalProfileScreenModel.js`
- downstream consumers in profile, request, and commit flows

## Target Architecture

### Layer 1: provider / backend service

Keep `services/medicalProfileService.js` as the canonical backend adapter, but make its responsibilities explicit:

- fetch canonical profile row
- update canonical profile row
- normalize backend row to app shape
- preserve local-save fallback behavior when remote sync fails
- expose a clearer sync-result contract for higher layers

If needed, add a dedicated realtime helper for `medical_profiles`.

### Layer 2: TanStack Query

Create a canonical query lane:

- `hooks/medicalProfile/medicalProfile.queryKeys.js`
- `hooks/medicalProfile/useMedicalProfileQuery.js`
- `hooks/medicalProfile/useMedicalProfileMutations.js`
- optional `hooks/medicalProfile/useMedicalProfileRealtime.js`

Minimum query contract:

- query key: `["medicalProfile", userId]`
- auth-gated execution
- explicit refetch/invalidation after mutation settlement
- shared read lane for all consumers

### Layer 3: Zustand

Create a shared persisted store, for example:

- `stores/medicalProfileStore.js`
- `stores/medicalProfileSelectors.js`

Minimum store ownership:

- canonical profile snapshot
- `ownerUserId`
- `hydrated`
- `lastSyncAt`
- `lastMutationAt`
- `serverBacked`
- `lastSyncError`
- selectors for downstream consumers

### Layer 4: XState

Create a lifecycle machine:

- `machines/medicalProfileMachine.js`
- `hooks/medicalProfile/useMedicalProfileLifecycle.js`

Minimum states:

- `bootstrapping`
- `awaitingAuth`
- `syncing`
- `ready`
- `mutationPending`
- `localSavedRemoteFailed`
- `error`

This machine should own the subtle local-save fallback legality that is currently implicit.

### Layer 5: Jotai

Create named UI atoms for the editor lane:

- `atoms/medicalProfileAtoms.js`

Probable atom ownership:

- editor visibility
- current draft
- dirty-state tracking
- save-intent state
- field-level temporary UI state only where it is truly view-specific

## Compatibility Strategy

`useMedicalProfile()` should become a compatibility facade, not the canonical state owner.

Target end state:

- existing consumers can still call `useMedicalProfile()`
- internally it resolves through Query + store + lifecycle machine
- migration can happen incrementally without breaking profile/request/commit flows

## Consumer Convergence

Primary consumers to migrate onto canonical selectors/facade:

- `Profile`
- `MedicalProfileScreen`
- request ambulance
- book bed
- commit triage
- commit payment

## Required Deliverables

### 1. State management

- real query lane
- real persisted store
- real lifecycle machine
- real Jotai editor lane

### 2. UI quality

- preserve the already-modern summary + modal screen contract
- keep load/save states believable and stable
- keep local-save fallback messaging truthful

### 3. DRY / modular code

- remove direct fetch/update ownership from `useMedicalProfile.js`
- keep the screen model focused on presentation orchestration, not canonical data ownership

### 4. Documentation

- the existing stack-screen docs remain true for UI anatomy
- this pass adds the missing state-architecture completion layer
- add an implementation checkpoint when complete

## Suggested Execution Order

1. carve query keys and query/mutation hooks
2. add medical profile store and selectors
3. add lifecycle machine
4. add editor atoms
5. convert `useMedicalProfile()` into compatibility facade
6. migrate downstream consumers
7. write checkpoint and verification notes

## Verification Target

- one canonical medical profile read path across profile, request, and commit consumers
- local-save fallback still works and is modeled explicitly
- modal editor remains stable during save
- no product-critical consumers depend on the legacy hook/service internals directly
