---
status: living
owner: architecture
last_updated: 2026-07-14
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Notifications Stack Implementation Checkpoint (2026-04-29)

Status: Implemented; authority and cross-session dismissal verified live

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

## Remaining Verification

- seven-width visual matrix after the recipient-dismissal UI update
- final native and web interaction smoke for selection and section-clear presentation

## Authority Reconciliation: 2026-07-14

The April implementation preserved physical client deletion because the original January schema allowed recipients to delete their own notification rows. February hardening later made notification creation backend-owned and narrowed recipient mutation to inbox state, but the App and Console clear controls were not migrated to that authority model. This produced permission errors after emergency completion and rating while also leaving clear behavior non-durable across devices.

The reconciled contract is:

- canonical notification events are emitted and retained by backend functions and triggers
- clients cannot insert or physically delete notification events
- recipients may update only `read`, `dismissed_at`, and `updated_at` on their own rows
- clear one, clear selected, clear section, and clear all persist `dismissed_at`
- inbox reads exclude dismissed rows, so a second authenticated session observes the same state
- related requests, visits, payments, and activity records remain untouched

Live RLS proof on `dlwtcmhdzoklveihuhjf` passed own-recipient read and dismissal, foreign-recipient denial, second-session persistence, canonical-field update denial, insert denial, physical-delete denial, retained event identity, and zero-residue cleanup. The temporary deployment was absorbed into `0005_ops_content` and `0007_security`; its remote migration receipt was repaired as reverted.

The historical "delete" wording above records the April UI behavior only. The current product action is recipient-owned inbox dismissal, not canonical event deletion.
