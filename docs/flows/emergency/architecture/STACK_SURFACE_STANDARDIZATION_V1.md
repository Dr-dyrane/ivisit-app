# Stack Surface Standardization V1

Status: Active
Scope: `welcome -> map -> stack` transition surfaces

## Purpose

This document extracts the stack-screen implementation contract from the current payment surface and applies it to additional stack-owned routes, starting with `EmergencyContactsScreen`.

## Reference Pattern

The payment surface is the current reference stack implementation:

- thin route file
- orchestrator handles domain wiring, header, and FAB
- stage base owns shell, motion, and viewport responsiveness
- screen model owns business composition
- leaf components own presentational sections only

## Handoff Contract

The user path stays:

`welcome -> map -> mini profile -> stack route`

Rules:

- the source surface must acknowledge navigation immediately
- the stack route must render a real loading or cached state, never a blank pause
- stack routes must be safe on compact, tablet, and desktop viewport variants

## Five-Layer Rule For Stack Screens

Not every stack screen uses every layer equally, but ownership must stay explicit:

- Supabase / Realtime: canonical server truth
- TanStack Query: fetch, cache, invalidate, optimistic mutation
- Zustand: persisted cross-surface snapshot and selectors
- XState: readiness, legality, and transition gating
- Jotai: modal, draft, selection, and wizard UI state

## Emergency Contacts Standard

`EmergencyContactsScreen` now becomes the reference stack-migration target after payment.

Required characteristics:

- thin route
- orchestrator for header/FAB wiring
- stage base for shell and responsive composition
- no canonical email field in active create/edit flow
- migration review pane for skipped legacy contacts without phone numbers

Typography and copy discipline for utility stack surfaces:

- use the mini-profile voice as the calmer reference where appropriate
- increase hierarchy with size, spacing, and contrast before increasing font weight
- visible patient-app typography on these surfaces should not exceed `700`
- supporting and explanatory copy should default to `400`
- header titles and subtitles should use normal title/sentence case, not all caps
- reserve all-caps treatment for brand/logo-mark captions and similarly small identity labels only
- avoid subtitles or helper paragraphs when grouped structure and labels already explain the action
- one short interaction hint is acceptable only when it unlocks a non-obvious gesture or state

Side-effect surface discipline for stack screens:

- editor modals, add forms, history/detail modals, and similar side-effect surfaces must consume shared viewport surface config
- on compact variants they may use bottom-sheet posture where appropriate
- on tablet and desktop variants they must stay bounded by `modalMaxWidth` and `modalMaxHeightRatio`
- do not stretch a modal card across leftover wide-screen canvas; unused width should stay as breathing room or context space
- dismiss behavior during blocking save/pending states must be explicit, not accidental backdrop escape
- when a screen has meaningful XL dead space, prefer a real context island or right panel over widening the editor modal

## Non-Goals

- no route renaming
- no redesign of map route ownership
- no duplicate screen shell patterns per feature
