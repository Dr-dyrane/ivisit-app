# Notification Details Stack Pass Plan

Status: Ready  
Date: 2026-04-29  
Surface: `/(user)/(stacks)/notification-details`

## Intent

Bring `NotificationDetailsScreen` up to the current stack standard without inventing a separate notification state system.

This pass should cover all four required tracks:

- state management
- UI quality
- DRY / modular code
- documentation

## Target Anatomy

Files:

- `app/(user)/(stacks)/notification-details.js`
- `screens/NotificationDetailsScreen.jsx`
- `components/notifications/details/NotificationDetailsScreenOrchestrator.jsx`
- `components/notifications/details/NotificationDetailsStageBase.jsx`
- `components/notifications/details/NotificationDetailsWideLayout.jsx`
- `components/notifications/details/NotificationDetailsContextPane.jsx`
- `components/notifications/details/NotificationDetailsActionIsland.jsx`
- `components/notifications/details/NotificationDetailsMainContent.jsx`
- `components/notifications/details/notificationDetails.content.js`
- `components/notifications/details/notificationDetails.theme.js`
- `hooks/notifications/useNotificationDetailsScreenModel.js`

## State Contract

### Keep

- `NotificationDetails` should continue to consume the notifications provider/query lane as its canonical data source.
- `id` from route params remains the screen lookup key.

### Improve

- Move notification lookup, missing-state derivation, read-on-open behavior, and action routing into `useNotificationDetailsScreenModel`.
- Extract the notification destination resolver into a shared helper so list and detail surfaces stop duplicating it.

### Do Not Add

- no new feature store
- no new query lane
- no fake persistence for ephemeral detail UI state

## UI Contract

### Mobile

- Remove decorative/editorial framing that does not help the task.
- Keep one calm title, one short body block, key metadata, and one primary action.
- Use skeletons for loading and a real missing-state card if the notification is absent.

### Wide

- Use the refined stack shell: context pane, bounded main content, optional action island.
- Do not simply widen the existing compact layout.

### Copy / typography

- Match the calmer stack family.
- No all-caps header styling except identity marks.
- Use size before weight; cap visible weight at `700`.

## DRY / Modularity

- Extract shared notification destination routing from both the list and detail screens.
- Route file stays thin.
- Header wiring belongs in the orchestrator.
- Presentation surfaces should not own navigation branching.

## Acceptance Checks

- Opening a notification marks it read through the canonical notifications data lane.
- Missing notification state renders a useful fallback instead of `null`.
- Mobile layout is simpler than the old editorial surface.
- Wide-screen layout uses real stack-shell recomposition.
- No route-sized `ActivityIndicator` loading state remains.

## Documentation Deliverables

- Pre-pass comparison audit: `docs/audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md`
- This plan file
- Post-pass implementation checkpoint after the pass lands
