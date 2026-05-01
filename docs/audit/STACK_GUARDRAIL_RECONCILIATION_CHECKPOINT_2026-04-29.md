# Stack Guardrail Reconciliation Checkpoint (2026-04-29)

Status: Implemented in code, static verification complete

## Why This Pass Happened

After the recent stack-surface modernization wave and the route-state hardening pass, a git-backed review of the last 48 hours showed that some of the new code drifted from the documented state-management and `useEffect` guardrails:

- compatibility routes were using `useEffect` just to redirect
- route params were being mirrored into Jotai atoms with `useEffect`
- some stack orchestrators were using a second `useEffect` to mirror `layoutInsets` into header state even though the focused header effect already owned that state
- `Book Visit` still had bootstrap/lifecycle effects living in the screen model instead of a dedicated bootstrap host

This checkpoint records the reconciliation pass that brought those recent changes back into line.

## Git-Backed Audit Scope

Reviewed against the last 48 hours of app changes:

- `profile`
- `settings`
- `medical-profile`
- `insurance`
- `search`
- `notifications`
- `notification-details`
- `book-visit`
- `help-support`
- `/map` route-state and compatibility bridge work

Primary doctrine references:

- `docs/rules.json`
- `docs/REFACTORING_GUARDRAILS.md`
- `docs/architecture/TRACKING_SHEET_LEARNINGS.md`
- `docs/architecture/GOLD_STANDARD_STATE_ROADMAP.md`

## What Changed

### 1. Compatibility bridges are now declarative

These deprecated bridge routes/screens no longer use `useEffect` for one-shot redirects:

- `app/(user)/(stacks)/more.js`
- `app/(user)/(stacks)/emergency/request-ambulance.js`
- `app/(user)/(stacks)/emergency/book-bed.js`
- `app/(user)/(stacks)/change-password.js`
- `app/(user)/(stacks)/create-password.js`
- `screens/VisitsScreen.jsx`
- `screens/VisitDetailsScreen.jsx`

They now use declarative `Redirect` ownership instead of effect-driven `router.replace(...)`.

### 2. `/map` recent-visits route state is route-owned, not effect-synced

The recent visits compatibility path no longer copies `historyFilter` into Jotai with `useEffect`.

- `screens/MapScreen.jsx`
- `components/map/history/MapHistoryModal.jsx`

What changed:

- route-managed recent-visits visibility is now derived from the current route
- route-managed history filter is passed as a prop
- filter changes update the route directly
- local Jotai filter remains for non-route-owned modal usage

### 3. Notifications filter state no longer mirrors the route with `useEffect`

- `hooks/notifications/useNotificationsScreenModel.js`

What changed:

- route `filter` param is now read as a derived active filter
- local atom filter remains for non-route-owned usage
- filter changes update the route only when the route owns the filter
- selected IDs are now derived against the current notification set instead of being cleaned up by `useEffect`

### 4. Help Support route highlight no longer expands tickets via `useEffect`

- `hooks/support/useHelpSupportScreenModel.js`

What changed:

- route `ticketId` is now folded into the effective expanded-ticket set as a derived value
- the screen model no longer mutates Jotai expansion state just because a route param exists

### 5. Medical Profile draft no longer mirrors canonical profile with `useEffect`

- `hooks/medicalProfile/useMedicalProfileScreenModel.js`

What changed:

- the editor draft is now seeded on explicit open/close actions
- closed-screen profile changes no longer trigger a background draft write

### 6. Book Visit bootstrap was extracted from the screen model

- `hooks/visits/useBookVisitBootstrap.js`
- `hooks/visits/useBookVisitScreenModel.js`

What changed:

- hydration
- auth ownership reset
- route seeding
- quote-to-store sync
- lifecycle-to-store sync

now live in a dedicated bootstrap host instead of inside the screen model. The screen model returns to UI derivation and user action handlers.

### 7. Redundant header-layout sync effects were removed across the stack family

These orchestrators previously used a standalone `useEffect` only to mirror `headerLayoutInsets` into header state:

- `components/payment/PaymentScreenOrchestrator.jsx`
- `components/emergency/contacts/EmergencyContactsScreenOrchestrator.jsx`
- `components/profile/ProfileScreenOrchestrator.jsx`
- `components/settings/SettingsScreenOrchestrator.jsx`
- `components/medicalProfile/MedicalProfileScreenOrchestrator.jsx`
- `components/insurance/InsuranceScreenOrchestrator.jsx`
- `components/search/SearchScreenOrchestrator.jsx`
- `components/notifications/NotificationsScreenOrchestrator.jsx`
- `components/notifications/details/NotificationDetailsScreenOrchestrator.jsx`
- `components/visits/bookVisit/BookVisitScreenOrchestrator.jsx`
- `components/helpSupport/HelpSupportScreenOrchestrator.jsx`

Those effects were redundant because each screen already sets the full header state through its focused header owner.

### 8. Unauthenticated users no longer see `Book a visit` inside `Choose care`

- `components/map/MapCareHistoryModal.jsx`
- `screens/MapScreen.jsx`

The `Book a visit` blade is now conditional on the route actually receiving an authenticated booking action.

## Verification Performed

- `git log --since="48 hours ago"` review of recent modernization and route-state commits
- targeted grep over recent stack pages and state hooks for `useEffect` usage
- `prettier --write` on touched files
- `git diff --check`
- `npm run build:web`

## Outcome

After this pass:

- recent compatibility routing is declarative again
- route params are no longer mirrored into atoms in the audited stack models
- recent stack orchestrators no longer carry redundant derived-state header effects
- `Book Visit` screen-model ownership is cleaner and closer to the project’s five-layer contract

## Remaining Notes

- stage-base mount animation effects remain intentionally in place; those are real side effects
- lifecycle/bootstrap/realtime adapters still use `useEffect` where they bridge external facts into XState/Zustand/Jotai; those were retained because they are legitimate ownership boundaries, not UI derivation hacks
- `/map` visit-detail route handoff still uses an effect because it opens canonical visit-detail state from a route-managed compatibility path
