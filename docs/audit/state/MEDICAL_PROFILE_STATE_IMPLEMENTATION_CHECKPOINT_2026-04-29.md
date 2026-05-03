# Medical Profile State Implementation Checkpoint (2026-04-29)

Status: Implemented in code, runtime interaction verification still pending

## Scope

This pass completed the medical-profile state migration underneath the already-modernized screen shell.

Primary owners touched:

- `services/medicalProfileService.js`
- `hooks/medicalProfile/*`
- `hooks/user/useMedicalProfile.js`
- `stores/medicalProfileStore.js`
- `stores/medicalProfileSelectors.js`
- `machines/medicalProfileMachine.js`
- `atoms/medicalProfileAtoms.js`
- `hooks/medicalProfile/useMedicalProfileScreenModel.js`
- runtime bootstrap and hydration hosts

## What Landed

### Layer 1: canonical service

`services/medicalProfileService.js` now:

- exposes `DEFAULT_MEDICAL_PROFILE`
- exposes `normalizeMedicalProfile(...)`
- maps the wider backend surface instead of only the legacy visible fields
- resolves explicit `userId`
- exposes a realtime `subscribe(...)` helper
- prefers `MEDICAL_PROFILE_CACHE` during local fallback so the new store lane and the service fallback cannot drift apart

### Layer 2: shared query + mutations

- `hooks/medicalProfile/medicalProfile.queryKeys.js`
- `hooks/medicalProfile/useMedicalProfileQuery.js`
- `hooks/medicalProfile/useMedicalProfileRealtime.js`
- `hooks/medicalProfile/useMedicalProfileMutations.js`

The mutation lane preserves the existing offline/local-save nuance by honoring `error.localSaved` and `error.nextProfile` behavior from the service.

### Layer 3: persisted runtime snapshot

- `stores/medicalProfileStore.js`
- `stores/medicalProfileSelectors.js`

The store now owns:

- canonical profile snapshot
- `ownerUserId`
- hydration
- lifecycle metadata
- mutation counts
- retry signaling
- persisted cache via `StorageKeys.MEDICAL_PROFILE_CACHE`

Legacy `StorageKeys.MEDICAL_PROFILE` remains a fallback hydration source.

### Layer 4: lifecycle machine

- `machines/medicalProfileMachine.js`
- `hooks/medicalProfile/useMedicalProfileLifecycle.js`

The medical-profile lane now has shared legality for:

- `bootstrapping`
- `awaitingAuth`
- `syncing`
- `ready`
- `mutationPending`
- `error`

### Layer 5: ephemeral UI atoms

- `atoms/medicalProfileAtoms.js`

The medical-profile editor is no longer screen-local only:

- `medicalProfileEditorVisibleAtom`
- `medicalProfileDraftAtom`

`useMedicalProfileScreenModel.js` now reads/writes those atoms instead of private `useState` for the editor shell.

### Compatibility + bootstrap

- `hooks/medicalProfile/useMedicalProfileBootstrap.js`
- `hooks/medicalProfile/useMedicalProfileFacade.js`
- `hooks/user/useMedicalProfile.js`

The old `useMedicalProfile()` entry point is now a compatibility alias over the canonical facade, while the single runtime bootstrap is mounted in `RootBootstrapEffects`.

## Consumer Outcome

All current medical-profile consumers now converge through the same canonical lane:

- `Profile`
- `MedicalProfileScreen`
- map commit triage/payment flows
- deprecated request-ambulance / book-bed fallback screens

## Verification Performed

- `prettier --write` on touched medical-profile/runtime files
- `git diff --check`
- `npx expo export --platform web --output-dir .tmp-state-pass-web-check`

## Not Yet Verified

- live editor open/save/retry smoke on device and web
- realtime invalidation confirmation against `medical_profiles`

## Residual Notes

- The visible medical-profile screen shell was already modernized before this pass. This checkpoint is about the underlying state lane catching up to that shell.
- The service still preserves the existing local-save fallback contract rather than replacing it with a hard remote-only failure model.
