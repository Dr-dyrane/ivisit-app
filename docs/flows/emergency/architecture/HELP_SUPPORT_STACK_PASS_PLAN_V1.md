# Help Support Stack Pass Plan (v1)

> Status: Implemented on 2026-04-29
> Scope: `HelpSupportScreen` stack route
> Purpose: Bring `Help Support` into the same stack-screen and five-layer state contract now used by the refined stack family
> Checkpoint: [../../../audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](../../../audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)

## Summary

`HelpSupportScreen` is the next active stack route to modernize.

This pass should do more than restyle it. It should:

- make the route thin
- move support data to an explicit five-layer lane
- simplify compact/mobile
- give web and desktop a real bounded layout

## Goals

1. Make the route thin.
2. Move support tickets and FAQs off the current provider-`useState` lane.
3. Replace route-owned UI state with a dedicated screen model plus Jotai atoms.
4. Recompose the page into the shared stack-screen shell.
5. Keep the create-ticket interaction immediate and believable on all viewport groups.

## Current Files

- `app/(user)/(stacks)/help-support.js`
- `screens/HelpSupportScreen.jsx`
- `contexts/HelpSupportContext.jsx`
- `services/helpSupportService.js`

## Target File Shape

### Route and Screen

- `app/(user)/(stacks)/help-support.js`
- `screens/HelpSupportScreen.jsx`

### New Help Support Stack Surface Files

- `components/helpSupport/HelpSupportScreenOrchestrator.jsx`
- `components/helpSupport/HelpSupportStageBase.jsx`
- `components/helpSupport/HelpSupportWideLayout.jsx`
- `components/helpSupport/HelpSupportContextPane.jsx`
- `components/helpSupport/HelpSupportActionIsland.jsx`
- `components/helpSupport/HelpSupportMainContent.jsx`
- `components/helpSupport/HelpSupportTicketList.jsx`
- `components/helpSupport/HelpSupportFaqList.jsx`
- `components/helpSupport/HelpSupportComposerModal.jsx`
- `components/helpSupport/helpSupport.content.js`
- `components/helpSupport/helpSupport.theme.js`
- `components/helpSupport/helpSupportSidebarLayout.js`

### State / Feature Files

- `hooks/support/helpSupport.queryKeys.js`
- `hooks/support/useSupportFaqsQuery.js`
- `hooks/support/useSupportTicketsQuery.js`
- `hooks/support/useSupportTicketMutations.js`
- `hooks/support/useSupportTicketsRealtime.js`
- `hooks/support/useHelpSupportLifecycle.js`
- `hooks/support/useHelpSupportScreenModel.js`
- `stores/helpSupportStore.js`
- `stores/helpSupportSelectors.js`
- `machines/helpSupportMachine.js`
- `atoms/helpSupportAtoms.js`

## Five-Layer Target

### Layer 1: Supabase / service

- `services/helpSupportService.js`
- canonical FAQ fetch
- canonical support ticket fetch
- ticket creation
- ticket subscription invalidation helper
- local fallback for offline ticket list/create

### Layer 2: TanStack Query

- one FAQ query
- one per-user ticket query
- one ticket-create mutation
- user-scoped ticket invalidation/realtime refresh

### Layer 3: Zustand

- persisted FAQ/ticket snapshot
- owner user id
- hydration state
- last sync / mutation metadata
- lifecycle flags mirrored for cross-surface reads

### Layer 4: XState

- `bootstrapping`
- `awaitingAuth`
- `syncing`
- `ready`
- `ticketSubmitting`
- `error`

### Layer 5: Jotai

- composer visible
- subject draft
- message draft
- expanded FAQ ids
- expanded ticket ids

## UI Direction

### Compact / Mobile

- no loud concierge hero copy
- tickets first
- FAQ section second
- clear primary action
- compact header action instead of a route-owned floating control stack

### Wide / Desktop

- left context island
- bounded center support content
- optional right action island on XL
- no stretched mobile list

## Interaction Rules

- create-ticket action must acknowledge immediately
- empty states must point to the next useful action
- loading must favor skeletons, not text-only placeholders
- ticket composer must stay centered/bounded on wider screens
- route param `ticketId` must still expand the matching ticket

## Risks

1. Regressing local fallback ticket creation while moving to Query.
2. Duplicating bootstrap between provider and screen.
3. Over-explaining the compact screen again instead of simplifying it.
4. Leaving the FAQ and ticket expand state in route-local `useState`.

## Verification Checklist

- compact/mobile stays simple and action-first
- wide screens show bounded support content plus context islands
- ticket composer opens and closes correctly on compact and wide
- FAQ and ticket expansion survives remount while the route is active
- route param `ticketId` still expands the matching ticket
- support draft clears only on successful submit or explicit cancel
- static docs are updated in the same pass
