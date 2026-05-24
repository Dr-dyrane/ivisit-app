---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Postmortems

Blameless, structured records of production-impacting incidents and regressions.

## Naming convention

```
YYYY-MM-DD_TITLE_IN_SCREAMING_SNAKE.md
```

The date is the **incident date** (when the regression manifested or was discovered), not the resolution date.

## Required sections (Google SRE-style template)

Every postmortem must contain:

1. **Severity & Date** â€” single line summary
2. **Symptom Surface** â€” what users saw, what platforms/conditions
3. **Debugging Journey** â€” including wrong turns (for learning value)
4. **Root Causes** â€” explicit, isolated, multi-layered if applicable
5. **Fixes Applied** â€” file-by-file, all minimal and upstream
6. **Permanent Architectural Rules** â€” what we now require to prevent recurrence
7. **Outstanding Tech Debt** â€” followups not yet shipped

## Index

| Date | Title | Severity |
|---|---|---|
| [2026-04-26](./2026-04-26_PHASE_6D_IOS_MAP_LOADING.md) | Phase 6d iOS Map Loading Regression | Critical |

## Why postmortems live here

This folder isolates incident records from forward-looking architecture/pass docs. A postmortem is **append-only history**, not a plan. Extracting them out of roadmap docs (where they otherwise get reorganized into oblivion) preserves institutional memory.

Conventions:
- **Append-only.** Never edit a postmortem after acceptance except to add followup status.
- **Blameless.** Describe systems and decisions, not people.
- **Reference, don't duplicate.** Roadmap and architecture docs link here; this folder is the canonical home.
