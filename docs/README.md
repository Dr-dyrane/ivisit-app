# iVisit Documentation

Portal for the `ivisit-app` patient product and its supporting surfaces.

Last updated: 2026-05-19

## Start Here

- [INDEX.md](./INDEX.md) is the canonical docs index.
- [CONTRIBUTING.md](./CONTRIBUTING.md) defines the anti-litter rules, folder decision tree, naming rules, and archival protocol.
- [audit/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md](./audit/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md) records the 2026-05-19 cleanup and move map.

## Authority Order

If docs disagree, resolve in this order:

1. [rules.json](./rules.json)
2. [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
3. [SPONSOR_SPRINT.md](./SPONSOR_SPRINT.md)
4. Current flow trackers and implementation rules in `docs/flows/`
5. Audit records in `docs/audit/`
6. Archived historical docs in `docs/archive/`

## Current Emergency Flow

Start emergency-flow work with:

- [flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md](./flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md)
- [flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](./flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)
- [audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md](./audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md)
- [architecture/refactoring/TRACKING_SHEET_LEARNINGS.md](./architecture/refactoring/TRACKING_SHEET_LEARNINGS.md)

## Folder Roles

| Role | Folder | Purpose |
|---|---|---|
| Doctrine | `docs/` root files | Tiebreaker docs, product truth, active sprint |
| Flows | `docs/flows/<domain>/` | Runtime maps and phase dossiers |
| Architecture | `docs/architecture/` | Cross-cutting specs, roadmaps, refactor bibles |
| Design | `docs/design/` | Design system, tokens, motion |
| Audit | `docs/audit/` | Evidence reports, checkpoints, passes, risk trackers |
| Change control | `docs/project_state/` | SCC items and active change trackers |
| Research | `docs/research/` | External references |
| Ops | `docs/deployment/` | Deployment, environment, and store guides |
| Archive | `docs/archive/` | Superseded docs preserved for context |

## Routing Rules

| Doc type | Destination |
|---|---|
| Phase dossier or flow spec | `docs/flows/<domain>/` |
| Audit, evidence report, or checkpoint | `docs/audit/<domain>/` |
| Map checkpoint | `docs/audit/map/checkpoints/` |
| Map pass or tightening log | `docs/audit/map/passes/` |
| Map JSON manifest | `docs/audit/map/manifests/` |
| Design token or visual spec | `docs/design/` |
| Cross-cutting architecture decision | `docs/architecture/` |
| SCC item | `docs/project_state/context/scc/` |
| Superseded doc | `docs/archive/<historical|legacy_specs>/` plus archival notice |

## Maintenance

- Search [INDEX.md](./INDEX.md) before creating a new doc.
- Prefer updating an existing source-of-truth doc over adding a sibling.
- Keep root-level docs rare and doctrine-oriented.
- When moving a doc, leave an archival or historical notice that points to the current replacement.
