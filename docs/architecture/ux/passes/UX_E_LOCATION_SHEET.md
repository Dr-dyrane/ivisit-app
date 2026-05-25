---
status: living
owner: architecture
last_updated: 2026-05-10
---

# UX-E — LocationSheet + Mini Profile

**Priority:** LOW — blocked on LocationSheet stability
**Date:** 2026-05-10
**Status:** COMPLETE — 2026-05-10: Location passes A–E shipped; Issue 11 implemented
**Depends on:** UX-D complete + Location passes shipped
**Blocks:** nothing

---

## Issues Addressed

| Issue | Title | Severity |
|-------|-------|----------|
| Issue 11 | Mini Profile Needs Address Entry Point | ðŸ”µ Deferred |

---

## Prerequisites (Must Be Met Before Starting This Pass)

- [x] LocationSheet decision tree is stable and shipped: search → candidate → save category → save details → pickup commit
- [x] LocationSheet has a single owner (not multiple modals competing for control)
- [x] All Location passes have shipped
- [x] UX-A through UX-D are complete
- [x] No open LocationSheet regression from other passes

**Do not begin UX-E until all boxes above are checked.** This pass depends on the LocationSheet being the stable, sole owner of address entry. If Location passes have not shipped, this pass cannot be implemented correctly.

---

## Scope (When Unblocked)

### Issue 11 — Mini Profile Needs Address Entry Point

**Root cause:** Mini profile surface has no address or location management row. Users who want to update their pickup address must navigate away from the mini profile to find the setting.

**Fix scope:**
- Add `"Address & Location"` row to the mini profile action group
- Row opens LocationSheet (the same owner — no new modal)
- Pass `sourcePhase: "miniProfile"` metadata so LocationSheet knows where to return on close
- LocationSheet close: when `sourcePhase === "miniProfile"` → return to mini profile, not explore intent

**Why LocationSheet only:**
- No new address management surface — LocationSheet is the sole owner per the Location passes guardrail
- Mini profile is the entry point, not the owner
- This pattern mirrors how the commit details phase opens LocationSheet with `sourcePhase: "commitDetails"` and restores correctly

---

## Files Changed (When Unblocked)

| File | Change |
|------|--------|
| Mini profile surface file (TBD — identify before starting) | Add `"Address & Location"` action row |
| `hooks/useLocationSheet.js` (or equivalent) | Handle `sourcePhase: "miniProfile"` in close handler |
| LocationSheet close handler | Route back to mini profile when `sourcePhase === "miniProfile"` |

**Before starting:** identify the mini profile surface file. It was not pinpointed in the initial audit. Run:
```bash
grep -rn "miniProfile\|MiniProfile\|mini_profile" components/ screens/
```

---

## Four-Track Declaration (When Unblocked)

| Track | Scope |
|-------|-------|
| State management | `sourcePhase` metadata thread through LocationSheet — no new state atom if the existing phase system already supports metadata |
| UI quality | One new action row in mini profile. No redesign. Matches existing row pattern in the group. |
| DRY / modular | No new surface — LocationSheet is the owner. Mini profile adds only a row. |
| Documentation | PULLBACK NOTE on close handler if it was previously hardwired to explore intent only. Pass log updated. |

---

## Guardrails Compliance (When Unblocked)

| Rule | How complied |
|------|-------------|
| LocationSheet single owner | This pass does not create a new address modal — only a navigation entry point |
| No `useEffect` for navigation | `sourcePhase` is a prop/metadata passed at open time, not a reactive effect |
| Mini profile stays thin | One row addition only — no business logic in the mini profile surface |

---

## Invariants (When Unblocked)

- LocationSheet close → explore intent path: must still work for all other source phases
- Mini profile action group layout: no reordering of existing rows — new row appended to the location/address group
- No new address management modal created

---

## Verification Checklist (When Unblocked)

- [x] Prerequisites confirmed — all Location passes shipped
- [x] Mini profile surface file identified (components/emergency/MiniProfileModal.jsx)
- [x] `"Address & Location"` row visible in mini profile action group
- [x] Tapping row opens LocationSheet (not a new modal)
- [x] LocationSheet close with `sourcePhase === "miniProfile"` → returns to mini profile
- [x] LocationSheet close from all other source phases → unaffected (regression guard)
- [x] PULLBACK NOTE on close handler change

---

## Navigation

← [UX-D: State Layer Completion](./UX_D_STATE_LAYER.md)
← [README](./README.md)
