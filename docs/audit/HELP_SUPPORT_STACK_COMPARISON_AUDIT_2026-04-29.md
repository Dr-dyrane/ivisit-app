# Help Support Stack Comparison Audit (2026-04-29)

Status: Pre-pass comparison baseline  
Reference surfaces: `Notifications`, `Settings`, `Book Visit`

## Scope

Audit `HelpSupportScreen` against the current stack-screen contract:

- thin route
- dedicated screen model
- orchestrator-owned header and viewport decisions
- stage base for shell and motion
- wide-screen dead-space strategy
- utility copy and typography discipline
- explicit state-management posture

## Current Shape

Current entry path:

- `app/(user)/(stacks)/help-support.js`
- `screens/HelpSupportScreen.jsx`
- `contexts/HelpSupportContext.jsx`
- `services/helpSupportService.js`

`HelpSupportScreen.jsx` is still a route-owned monolith. It currently owns:

- header setup
- FAB registration
- motion boot
- scroll wiring
- FAQ/ticket expand-collapse state
- create-ticket modal state
- support draft state
- submit orchestration
- inline empty/loading/list branching

## Comparison Against Reference Stack Screens

### 1. Route Ownership

`Notifications`, `Settings`, and `Book Visit` now use:

- thin route
- orchestrator
- stage base
- screen model

`Help Support` does not. The screen file still owns nearly the full lifecycle and surface composition.

### 2. State Management

The current data lane is still the old provider pattern:

- `HelpSupportContext` owns in-memory state with `useState`
- fetches are kicked from the provider itself
- no TanStack Query server cache
- no persisted Zustand support snapshot
- no XState lifecycle legality
- only the subject/message draft has partial Jotai persistence via shared legacy atoms

That makes `Help Support` structurally behind the newer stack screens.

### 3. Wide-Screen Behavior

Current support UI is compact-only. There is:

- no left context island
- no bounded center support surface
- no right action island
- no desktop dead-space strategy

On web md+ it is still a full-height mobile composition centered in the page.

### 4. Surface Grammar

What already aligns:

- ticket cards and FAQ cards are task-oriented
- the route already has one clear primary action: create ticket

What is still missing:

- quieter grouped stack grammar
- tokenized copy/theme/layout
- skeleton loading instead of text-only loading
- responsive modal posture for the ticket composer

### 5. Copy and Typography

Current copy is still loud and legacy:

- `CONCIERGE`
- `How can we help?`
- `UPDATING RECORDS...`

That does not match the newer calmer utility-surface doctrine. It also repeats explanation on compact screens where the first useful action should come sooner.

## Strengths to Preserve

- support tickets and FAQs already exist as two clear content groups
- ticket creation is a natural primary action
- route parameter expansion for a specific `ticketId` is already useful and should survive

## Main Gaps

1. `HelpSupportScreen.jsx` still owns too much orchestration and UI state.
2. The feature is not yet on an explicit five-layer state path.
3. Wide-screen layouts have no real desktop contract.
4. Draft, list, and empty states still rely on older route-owned composition.

## Recommended Target Shape

- `screens/HelpSupportScreen.jsx` becomes composition-only
- `contexts/HelpSupportContext.jsx` becomes a compatibility boundary over the canonical support state lane
- `components/helpSupport/HelpSupportScreenOrchestrator.jsx` owns header wiring and viewport branching
- `components/helpSupport/HelpSupportStageBase.jsx` owns shell, motion, scroll wiring, and viewport config
- `hooks/support/useHelpSupportScreenModel.js` owns:
  - draft/UI atoms
  - expanded FAQ/ticket state
  - ticketId-driven expansion
  - create-ticket orchestration
  - derived counts and summaries
- `components/helpSupport/HelpSupportWideLayout.jsx` converts desktop dead space into context islands
- `components/helpSupport/helpSupport.content.js`
- `components/helpSupport/helpSupport.theme.js`
- `components/helpSupport/helpSupportSidebarLayout.js`

## Target State Posture

`Help Support` should move to:

- Supabase service lane for FAQs and support tickets
- TanStack Query for FAQ/ticket fetch and ticket creation
- persisted Zustand support snapshot for FAQ/ticket recovery
- XState lifecycle for boot/sync/submit legality
- Jotai atoms for composer draft and expand-collapse UI

## Exit Conditions for the Pass

- route becomes thin
- support lane is no longer provider-`useState` driven
- compact/mobile is simpler and calmer
- wide screens show bounded center support content plus context islands
- create-ticket modal stays responsive and centered on wider screens
- documentation updates land in the same pass
