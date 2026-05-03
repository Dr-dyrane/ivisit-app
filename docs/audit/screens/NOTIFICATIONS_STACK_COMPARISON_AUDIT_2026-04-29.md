# Notifications Stack Comparison Audit (2026-04-29)

Status: Pre-pass comparison baseline

## Scope

Audit `/(user)/(stacks)/notifications` against the current stack-screen references:

- `Payment`
- `Emergency Contacts`
- `Profile`
- `Settings`
- `Medical Profile`
- `Insurance`
- `Search`

## Current Shape

- `app/(user)/(stacks)/notifications.js` is already a thin route wrapper.
- `screens/NotificationsScreen.jsx` is still a route-owned monolith that mixes:
  - header wiring
  - select-mode action chrome
  - shell animation and scroll plumbing
  - filter composition
  - loading / empty / list rendering
  - navigation branching per notification action
- `contexts/NotificationsContext.jsx` still owns local filter state, selection state, and derived view logic on top of a mock data hook.
- `hooks/notifications/useNotificationsData.js` is still a local mock-data loader, not a canonical query-backed notifications surface.

## Comparison vs Modern Stack Screens

### 1. State Management

Current posture:

- provider/local state for filter, select mode, selected IDs
- local mock data hook for notification loading and mutations
- route-owned UI behavior for header actions and navigation branching

Gap vs current doctrine:

- notifications data should move toward a canonical server/query-backed lane instead of route-local mock hydration
- route/screen should stop owning page behavior directly
- selection UI and filter UI need a named home instead of remaining embedded in the route screen

### 2. UI Quality

Current problems:

- loading state still uses a route-sized `ActivityIndicator` instead of structural skeletons
- card and filter surfaces are louder than the refined stack family: all-caps metadata, very heavy weights, ornamental seals
- no wide-screen stack-shell treatment; current surface is still effectively a stretched mobile list
- compact and wide surfaces do not yet share the calmer grouped blade grammar established by the mini-profile family

### 3. DRY / Modular Shape

Current problems:

- no thin route + orchestrator + stage base + screen model split
- navigation branching, selection behavior, and header action logic all live inline in one screen
- no dedicated content/theme/sidebar-layout files
- duplicated visual logic across filters, cards, and empty/loading sections

### 4. Documentation

Current gap:

- `Notifications` does not yet have a wave-specific pass plan or implementation checkpoint in the stack-screen docs subtree

## Required Outcome For This Wave

- `NotificationsScreen` becomes composition-only
- notifications get a dedicated screen model
- selection mode, filters, and action chrome move out of the route file
- compact and wide layouts follow the shared stack-screen shell contract
- main loading states favor skeletons over lone activity indicators
- list surfaces and filter surfaces move closer to the mini-profile / settings blade grammar

## Intentional Non-Goals

This wave does not need to solve the entire notifications backend architecture in one pass.

Expected remaining gap after the wave unless explicitly upgraded:

- no full five-layer notifications feature
- no realtime subscription lane
- no XState lifecycle machine

If the data path stays local/mock after the UI pass, the post-pass checkpoint must say so explicitly.
