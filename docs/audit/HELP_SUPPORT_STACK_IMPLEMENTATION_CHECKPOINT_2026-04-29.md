# Help Support Stack Implementation Checkpoint - 2026-04-29

## Scope

Completed the `HelpSupportScreen` stack modernization pass.

This pass covered the required four tracks:

1. state management
2. UI modernization
3. DRY / modular structure
4. documentation

## Outcome

`Help Support` now follows the refined stack-screen contract instead of the legacy route-owned monolith.

### State lane

- Layer 1: `services/helpSupportService.js` now owns canonical FAQ/ticket normalization, local fallback ticket persistence, and realtime subscription wiring.
- Layer 2: FAQ and per-user ticket queries plus ticket-create mutation live under `hooks/support/`.
- Layer 3: persisted runtime snapshot lives in `stores/helpSupportStore.js`.
- Layer 4: lifecycle legality lives in `machines/helpSupportMachine.js` and `hooks/support/useHelpSupportLifecycle.js`.
- Layer 5: composer visibility, drafts, and expand-collapse state live in `atoms/helpSupportAtoms.js`.

### UI / composition

- `screens/HelpSupportScreen.jsx` is now composition-only.
- `app/(user)/(stacks)/help-support.js` mounts `HelpSupportBoundary` at the route instead of relying on a global provider.
- New shell files under `components/helpSupport/` now own:
  - header/orchestration
  - responsive stage base
  - wide-screen left context island
  - ratio-gated right action island
  - bounded center ticket + FAQ content
  - centered composer modal

### DRY cleanup

- Removed the old route-owned help/support screen implementation.
- Removed help/support draft atoms from the generic `atoms/uiEphemeral.atoms.js` file.
- Removed the old app-global `HelpSupportProvider` mount from `providers/AppProviders.jsx` and `providers/AppProviders.web.jsx`.

### Content cleanup

- FAQ fallback copy no longer references the deprecated `More` screen.
- FAQ fallback copy no longer treats password flows as the primary sign-in path; it now reflects OTP/social login entry.

## Verification

Static verification completed:

- `prettier --check` on touched help-support files
- `git diff --check`
- repo grep for stale global help-support provider wiring
- repo grep for stale help-support draft atoms in `uiEphemeral`

Runtime verification still pending:

- compact mobile interaction smoke
- wide web visual pass
- create-ticket live mutation smoke against authenticated session

## Residual risks

1. The support data lane is modernized, but it still depends on the existing support tables and fallback path being available; live runtime verification is still required.
2. `Help Support` now uses a route-scoped boundary instead of a global provider; any hidden consumer outside the route would need its own boundary if one is introduced later.
3. The wider visits domain remains mid-pass elsewhere in the worktree and was intentionally left untouched by this support modernization.
