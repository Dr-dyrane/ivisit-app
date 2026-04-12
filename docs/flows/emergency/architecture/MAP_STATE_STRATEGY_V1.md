# Map State Strategy (v1)

> Status: Active architecture note
> Scope: `/map`

## Short Answer

No, `useState`, `useMemo`, and debounce are not enough as the long-term architecture for `/map`.

They are still useful, but only as local tools.

## Current Recommendation

### Welcome

Use:

- local component state
- `useReducer` for grouped welcome state

Do not add a state library here unless the flow becomes cross-surface or persistence-heavy.

### Map

Use:

- local state for tiny view-only flags
- extracted helpers/constants immediately
- a store boundary next

Current store boundary:

- reducer-backed internal store for `/map` UI flow
- keep remote data fetching separate from UI state

Planned upgrade path:

- move the store boundary to `zustand` only when the flow needs cross-surface subscriptions beyond the current hook contract

## Why

`/map` is becoming:

- phase-driven
- sheet-driven
- selection-driven
- modal/surface-driven
- shared across many distant components

That is no longer a good fit for one giant hook plus more memoization.

## Transition Rule

Do not jump from one large hook to a full store rewrite in one move.

Use this sequence:

1. extract constants
2. extract pure helpers
3. move implementation into a grouped subfolder
4. add a reducer-backed selectors/actions/store boundary when the concerns are named clearly
5. move that boundary to a shared store library only if the subscription model outgrows the local store

## State Naming Rule

Docs and code must share the same state names.

If docs say:

- `explore`
- `search`
- `hospital_detail`
- `request`
- `tracking`

then code should use those names directly in constants and selectors.
