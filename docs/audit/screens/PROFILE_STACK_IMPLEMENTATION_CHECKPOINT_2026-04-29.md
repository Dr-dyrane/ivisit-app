# Profile Stack Implementation Checkpoint (2026-04-29)

Status: Code implemented  
Verification state: Runtime/device matrix still pending

## Scope

`ProfileScreen` stack-surface modernization against the current payment + emergency-contacts contract.

## What Landed

- `screens/ProfileScreen.jsx` is now a thin route that only mounts `ProfileScreenOrchestrator`.
- `components/profile/ProfileScreenOrchestrator.jsx` now owns header wiring, focus refresh, compact vs wide composition, and explicit modal mounting.
- `components/profile/ProfileStageBase.jsx` now owns gradient shell, motion boot, scroll wiring, and `stackViewportConfig.js` consumption.
- `hooks/profile/useProfileScreenModel.js` now owns route-local profile/edit/delete orchestration and derived snapshot labels.
- `components/profile/ProfileWideLayout.jsx` now uses:
  - left identity/context island
  - center action surface
  - XL right context island
- `components/profile/surfaces/PersonalInfoSheet.jsx` is now explicitly centered and width-bounded instead of inheriting compact bottom-sheet posture.
- `components/profile/ProfileDeleteAccountModal.jsx` replaces the old ad hoc raw modal with the shared stack modal contract.
- `components/profile/surfaces/ProfileHero.jsx` and `ProfileModals.jsx` were removed after the ownership split landed.
- compact/mobile now hides the wider explanatory context block and the extra `Manage your account` heading, keeping the surface closer to the mini-profile blade grammar.
- `complete-profile` now survives only as a deprecated fallback route; the user shell no longer force-gates authenticated users into the legacy profile-setup form.

## Preserved Behavior

- mini-profile shortcut row grammar remains the action-list baseline
- avatar edit affordance remains on the primary identity surface
- profile still routes to emergency contacts, health information, and coverage
- delete-account and profile-save flows still resolve through existing auth/profile services

## Carry-Forward Lessons For Remaining Stack Pages

- utility stack pages can keep calm mini-profile row grammar while still adopting the full orchestrator + stage-base shell split
- wide-screen dead space should become context islands, not stretched compact layouts
- centered task modals work better than page-width editors even when the page itself is wide
- route files should not own focus refresh, header setup, or modal state once a stack page graduates to the shared contract
- profile-specific implementation uncovered one easy regression class to watch for on the next pages: legacy surface code may depend on older context names like `signOut` even when the canonical auth contract exposes `logout`

## Remaining Verification

Still needed before calling this fully closed:

- seven-width visual matrix: `375, 430, 744, 1024, 1280, 1440, 1920`
- runtime smoke for:
  - open profile
  - edit and save profile fields
  - avatar image pick
  - open emergency contacts / health / coverage
  - delete-account modal behavior
  - sign-out action
