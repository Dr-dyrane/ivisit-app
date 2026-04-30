# Notifications Stack Pass Plan (v1)

Status: Active implementation plan

## Intent

Bring `/(user)/(stacks)/notifications` into the same stack-screen family as payment, emergency contacts, profile, settings, medical profile, insurance, and search.

## Target Architecture

- `app/(user)/(stacks)/notifications.js` stays a thin route wrapper
- `screens/NotificationsScreen.jsx` becomes composition-only
- `components/notifications/NotificationsScreenOrchestrator.jsx`
- `components/notifications/NotificationsStageBase.jsx`
- `components/notifications/NotificationsWideLayout.jsx`
- `hooks/notifications/useNotificationsScreenModel.js`
- `components/notifications/notificationsScreen.content.js`
- `components/notifications/notificationsScreen.theme.js`
- `components/notifications/notificationsSidebarLayout.js`

Supporting surfaces expected in this wave:

- `NotificationsContextPane`
- `NotificationsActionIsland`
- `NotificationsFilterStrip`
- `NotificationsList`
- `NotificationsEmptyState`

## Primary Change

The route and screen should stop owning:

- header wiring
- shell animation and viewport branching
- selection-mode action chrome
- notification action routing
- loading-state decisions
- wide-screen composition

The page becomes:

- a calm inbox-first surface
- one clear primary mode at a time: browse or bulk-select
- a quieter grouped notification language aligned with the refined stack family
- a wide-screen shell with context islands instead of stretched compact content

## State Management Posture

This wave must audit and improve the current notifications state posture, but it does not automatically require a full five-layer migration.

Minimum target posture after implementation:

- provider or query-backed notification data source remains explicit
- screen model owns derived rows, action handlers, and selection affordances
- ephemeral UI state has a named home instead of living inside the route screen

Explicitly deferred unless the pass widens:

- Zustand canonical notifications store
- XState lifecycle machine
- realtime notifications subscription lane

## Preserved Behavior

- filter notifications by current category
- open notification details or route to the action destination
- mark one notification as read
- mark all as read
- bulk-select notifications
- delete one or many notifications
- pull to refresh

## UI Direction

- copy stays short and task-led
- typography caps at `700`
- metadata labels stop leaning on all-caps emphasis
- filters and list surfaces move toward quieter grouped blades
- wide desktop uses left context + center inbox + right utility island only when the ratio allows it
- route-sized and empty-state loading use skeletons

## Verification Target

- notifications route renders as a thin-route stack surface, not a route-owned monolith
- select mode still works
- mark-read, mark-all-read, delete, and bulk-delete still work
- notification action routing still reaches SOS, visits, support, and details
- wide layout remains healthy at `1280`, `1440`, and `1920`
- no activity-indicator-only loading state remains on the main notifications surface
