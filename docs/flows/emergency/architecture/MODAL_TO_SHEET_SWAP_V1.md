# Modal To Sheet Swap (v1)

> Status: Active implementation plan
> Scope: `/map`
> Purpose: replace the remaining pre-dispatch modal stack with one persistent sheet-phase system

## Target

Move `/map` from:

- one persistent map
- one persistent explore sheet
- several sibling modals

to:

- one persistent map
- one persistent sheet shell
- one explicit sheet phase
- one hidden-by-default header until true live dispatch

## Phase Model

Use these sheet phases as the canonical pre-dispatch language:

- `explore_intent`
- `search`
- `hospital_list`
- `hospital_detail`
- `care_history`
- `recent_visits`

Later emergency phases still remain:

- `ambulance_decision`
- `commit_details`
- `commit_payment`
- `tracking`

## Collapsed-State Matrix

### `explore_intent`

- supports `collapsed`, `half`, `expanded`
- collapsed stays the resting island
- contents:
  - search row
  - avatar/profile trigger

### `search`

- collapsed state is the same shell posture as `explore_intent`
- collapsed does **not** show results or keyboard by default
- contents:
  - search row
  - avatar/profile trigger
- tapping the search row should re-expand and focus the search state

### `hospital_list`

- no collapsed state
- minimum mobile posture is `half`
- on large screens, translate to the standard left panel width
- reason:
  - a list state should not fake a collapsed preview that hides the list itself

### `hospital_detail`

- may support a compact collapsed summary on mobile
- collapsed contents:
  - leading CTA/affordance
  - centered hospital title block
  - subtitle with distance away
  - trailing close icon
- the compact row should feel like a temporary resting summary, not a second header

### `care_history` and `recent_visits`

- no collapsed state in the first migration pass
- use `half` or `expanded` only

## Migration Order

1. doc alignment
2. state-model alignment
3. `search` modal -> `search` sheet phase
4. `hospital list` modal -> `hospital_list` sheet phase
5. `hospital detail` modal -> `hospital_detail` sheet phase
6. `care_history` and `recent_visits` -> sheet phases
7. remove remaining pre-dispatch modal siblings from `MapScreen.jsx`

## Temporary Bridge Rule

During migration, some modal components may still exist in code.

That is acceptable only as a short-lived bridge.

The target architecture is still:

- no modal stack for pre-dispatch emergency flow
- one sheet shell
- one sheet phase

## Acceptance Criteria

- `MapScreen.jsx` no longer renders search, hospital list, or hospital detail as sibling modal surfaces
- `MapSheetOrchestrator.jsx` becomes the visible sheet-phase router
- store state names match the docs exactly
- collapsed behavior is phase-specific instead of inherited accidentally from legacy modals
