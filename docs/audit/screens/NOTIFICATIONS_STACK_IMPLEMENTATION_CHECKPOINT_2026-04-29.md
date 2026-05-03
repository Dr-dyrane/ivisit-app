# Notifications Stack Implementation Checkpoint (2026-04-29)

Status: Implemented in code, runtime verification still pending

## Scope

This wave modernized `/(user)/(stacks)/notifications` to match the refined stack-screen family used by:

- `Payment`
- `Emergency Contacts`
- `Profile`
- `Settings`
- `Medical Profile`
- `Insurance`
- `Search`

## What Changed

### 1. UI quality

- `screens/NotificationsScreen.jsx` is now composition-only.
- `components/notifications/NotificationsScreenOrchestrator.jsx` owns header wiring, focus refresh, and compact-vs-wide composition.
- `components/notifications/NotificationsStageBase.jsx` owns shell motion, scroll plumbing, and viewport branching.
- `components/notifications/NotificationsWideLayout.jsx` adds the wide-screen left context island, stable center inbox column, and ratio-gated right action island.
- Route-sized loading now uses structural skeletons instead of an activity-indicator-only inbox state.
- The inbox rows, filter strip, and selection bar now use the quieter grouped blade grammar instead of the older louder card/filter treatment.

### 2. State management

- `services/notificationsService.js` is now the canonical Supabase/realtime service lane.
- `hooks/notifications/useNotificationsQuery.js`, `useNotificationsRealtime.js`, and `useNotificationsMutations.js` now own the query, invalidation, and mutation lane.
- `stores/notificationsStore.js` and `stores/notificationsSelectors.js` now provide the persisted runtime inbox snapshot and shared selectors.
- `machines/notificationsMachine.js` plus `useNotificationsLifecycle.js` now own lifecycle legality and retry signaling.
- `runtime/RootRuntimeGate.jsx` and `runtime/RootBootstrapEffects.jsx` now bootstrap notifications once at app runtime instead of per-screen.
- `hooks/notifications/useNotificationsScreenModel.js` now owns derived sections, filter handling, action routing, and select-mode behavior.
- `atoms/notificationsScreenAtoms.js` gives filter and selection UI a named home instead of leaving it embedded in the route file.
- `contexts/NotificationsContext.jsx` is now only a compatibility boundary over the canonical facade.

### 3. DRY / modular code

- The route no longer owns:
  - header action chrome
  - selection-mode action logic
  - loading vs empty vs grouped list branching
  - notification action routing
  - wide-screen composition
- Content, theme, sidebar layout, and row/filter/selection surfaces now live in dedicated files under `components/notifications/`.

### 4. Documentation

- The wave now has:
  - pre-pass comparison audit
  - pass plan
  - this implementation checkpoint
- The docs index hubs were updated in the same pass.

## Preserved Behavior

- filter notifications by category
- open notification details or route to visit, SOS, support, or more
- mark one notification as read
- mark all notifications as read
- bulk-select notifications
- delete one or many notifications
- pull to refresh

## Known Remaining Gaps

- Runtime/device verification has not been completed yet.
- `Notification Details` now shares the canonical notification destination resolver and map-owned visit-detail route, but runtime smoke is still pending.

## Verification Performed

- static diff review
- `prettier --write` / `prettier --check` on touched files
- `git diff --check`
- grep sweep for old runtime references to the legacy monolith-only surfaces

## Not Yet Verified

- mobile and desktop runtime interaction smoke
- seven-width visual matrix
- live read/delete/mark-read behavior against the running app
