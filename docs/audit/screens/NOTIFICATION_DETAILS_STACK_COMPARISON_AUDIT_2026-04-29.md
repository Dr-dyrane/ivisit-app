# Notification Details Stack Comparison Audit

Date: 2026-04-29  
Surface: `/(user)/(stacks)/notification-details`  
Reference stack: `Payment`, `Emergency Contacts`, `Profile`, `Settings`, `Search`

## Current State

`NotificationDetailsScreen` is still a legacy route-owned screen.

- The route is thin, but [NotificationDetailsScreen.jsx](../../../screens/NotificationDetailsScreen.jsx) still owns header wiring, animations, layout, action routing, and copy.
- The surface uses a louder editorial grammar than the calmer stack family.
- It has no stage base, no screen model, and no shared wide-screen shell.
- It has no believable loading/empty fallback. When the notification is missing it returns `null`.
- The screen consumes the notifications provider correctly, but it does not yet apply the stack-screen separation or loading doctrine.

## Gap Against Current Stack Standard

### 1. State management

- Data source is acceptable for now: notification data comes from the notifications provider/query lane.
- The route still mixes state derivation, action routing, and presentation logic in one screen file.
- No dedicated screen model owns the route param -> notification lookup -> action contract.

### 2. UI quality

- Mobile is more dramatic than useful.
- Copy is more explanatory/editorial than the current stack family allows.
- There is no compact skeleton/loading state.
- Wide-screen behavior has not been recomposed into context/main/action columns.

### 3. DRY / modularity

- Notification destination routing is duplicated between the list screen model and the detail screen.
- Header setup, icon treatment, metadata rendering, and CTA framing are all route-owned.

### 4. Documentation

- No dedicated pass plan existed for this companion stack surface.

## Pass Direction

The next pass should:

- keep the route thin
- move detail derivation and action routing into a `useNotificationDetailsScreenModel`
- reuse the notifications data lane instead of inventing a second state path
- adopt the same stack shell language as the refined stack family
- make mobile simpler and wide-screen intentional
- replace `null` fallback with a real loading / missing-state contract

## Non-Goals

- No separate five-layer feature migration. Notification Details should consume the notifications feature’s existing data lane.
- No new notification backend model.
- No second copy system separate from the notifications surface family.
