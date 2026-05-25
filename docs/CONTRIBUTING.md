---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Docs Contributing Rules

> **TL;DR — Before you create a file, know its folder. If you can't name the folder, you shouldn't create the file yet.**

---

## The One Rule

Every doc belongs to exactly **one folder** based on what it *is*, not when you wrote it or what feature you're working on.

If you drop a file in the wrong place, it becomes invisible to the next engineer.
If you drop a file at `docs/` root, it pollutes the doctrine layer.
Neither is acceptable.

---

## Folder Decision Tree

```
What is this document?
â”‚
â”œâ”€â”€ A locked product truth or active sprint state?
â”‚     â””â”€â”€ docs/ root only  (rules.json, MASTER_BLUEPRINT.md, SPONSOR_SPRINT.md)
â”‚         ⚠ï¸  Do NOT add new root files. Update existing ones instead.
â”‚
â”œâ”€â”€ A runtime flow map, phase dossier, or domain contract?
â”‚     â””â”€â”€ docs/flows/<domain>/
â”‚         e.g. flows/emergency/, flows/auth/, flows/payment/
â”‚
â”œâ”€â”€ A cross-cutting architectural decision, roadmap, or refactor bible?
â”‚     â””â”€â”€ docs/architecture/
â”‚         subfolders: state/, refactoring/, location/, ux/, map/, emergency/, stores/, overview/, roadmap/
â”‚
â”œâ”€â”€ A design system spec, token definition, or motion doctrine?
â”‚     â””â”€â”€ docs/design/
â”‚
â”œâ”€â”€ A point-in-time audit, evidence report, or pass checkpoint?
â”‚     â””â”€â”€ docs/audit/<domain>/
â”‚         subfolders: map/, screens/, state/, emergency/, planning/, payment/, welcome/, demo/, checkpoints/
â”‚         map audits go in:
â”‚           - audit/map/checkpoints/  — CHECKPOINT files
â”‚           - audit/map/passes/       — PASS or TIGHTENING files
â”‚           - audit/map/manifests/    — .json manifests
â”‚           - audit/map/             — all other map audits
â”‚
â”œâ”€â”€ A Supabase Change Control item (SCC)?
â”‚     â””â”€â”€ docs/project_state/context/scc/
â”‚         Do NOT drop SCCs in project_state/context/ root.
â”‚
â”œâ”€â”€ A sprint tracker, quick-start, or project context note?
â”‚     â””â”€â”€ docs/project_state/
â”‚
â”œâ”€â”€ An ops/deployment guide?
â”‚     â””â”€â”€ docs/deployment/
â”‚
â”œâ”€â”€ A console/web-dashboard spec?
â”‚     â””â”€â”€ docs/console/
â”‚
â”œâ”€â”€ External reference material (Apple HIG, platform docs)?
â”‚     â””â”€â”€ docs/research/
â”‚
â”œâ”€â”€ Contributor onboarding?
â”‚     â””â”€â”€ docs/onboarding/
â”‚
â”œâ”€â”€ Marketing / brand / product design?
â”‚     â””â”€â”€ docs/product_design/
â”‚
â””â”€â”€ A superseded or archived document?
      â””â”€â”€ docs/archive/historical/   — completed pass plans, old progress logs
          docs/archive/legacy_specs/ — old specs replaced by V2+ docs
          ⚠ï¸  Always add an ARCHIVAL NOTICE banner to the file before moving it.
```

---

## Naming Rules

| Pattern | Rule |
|---|---|
| Audit / checkpoint | `SCREAMING_SNAKE_CASE_YYYY-MM-DD.md` |
| Flow spec / dossier | `DOMAIN_DESCRIPTION_V1.md` |
| Pass plan | `DOMAIN_PASS_PLAN_V1.md` |
| SCC item | `SCC-NNN_DOMAIN_DESCRIPTION_YYYY-MM-DD.md` |
| README / index | `README.md` (one per folder, lowercase) |
| Config / data | lowercase with hyphens (e.g. `rules.json`) |

Do **not** use dates as a substitute for a meaningful name.
Do **not** use `DRAFT_`, `NEW_`, `TEMP_`, or `WIP_` prefixes — finish the doc or don't commit it.

---

## What Belongs at `docs/` Root

Only these files live at `docs/` root:

| File | Role |
|---|---|
| `rules.json` | Locked system rules — tiebreaker |
| `MASTER_BLUEPRINT.md` | Locked product vision |
| `SPONSOR_SPRINT.md` | Mutable active sprint state |
| `REFACTORING_GUARDRAILS.md` | Code standards |
| `README.md` | Docs portal |
| `INDEX.md` | Full file-tree navigation index |
| `CONTRIBUTING.md` | This file |

**Adding a new root file requires explicit senior review.** If you think you need one, you almost certainly need a subfolder instead.

---

## Anti-Litter Checklist

Before committing any new doc:

- [ ] **Correct folder** — matches the decision tree above
- [ ] **Not a duplicate** — search `INDEX.md` first; if a similar doc exists, update it instead
- [ ] **Meaningful name** — no `TEMP_`, `NEW_`, `DRAFT_`, date-only names
- [ ] **INDEX.md updated** — new entry added to the correct section
- [ ] **Links valid** — any links you added resolve to real files
- [ ] **No root clutter** — not added to `docs/` root unless it's doctrine

---

## Archival Protocol

When a document is superseded:

1. Add this banner at the top of the old file:
   ```markdown
   > ⚠ï¸ ARCHIVAL NOTICE — This document has been superseded.
   > Current reference: [replacement doc](../path/to/replacement.md)
   > Retained for historical context only. Do not use for implementation decisions.
   ```
2. Move the file to `docs/archive/historical/` or `docs/archive/legacy_specs/`
3. Update `INDEX.md` — move the entry to Section 5 (Historical / Archive Docs)
4. Do **not** delete files — history must be preserved

---

## SCC Items

All Supabase Change Control items go in:

```
docs/project_state/context/scc/SCC-NNN_DESCRIPTION_YYYY-MM-DD.md
```

The `project_state/context/` root holds only:
- `SUPABASE_CHANGE_CONTROL_PLAN_*.md`
- `SUPABASE_CHANGE_TRACKER_*.md`
- `CURRENT_STATE.md`
- `DEPRECATED.md`
- `HARDENING_CLOSURE_PLAN_*.md`

Every other item in `project_state/context/` is a misfile.

---

## Enforcement

These rules are enforced by code review. A PR that adds files to the wrong folder will be blocked with a routing correction request.

The authority order for any conflict:

1. `rules.json`
2. `MASTER_BLUEPRINT.md`
3. This file (`CONTRIBUTING.md`)
4. `README.md`
