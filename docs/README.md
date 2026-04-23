# iVisit Documentation

> Portal for the `ivisit-app` patient product and its supporting surfaces.

## Documentation Model

iVisit uses a **Role-Based Doctrine Tree**. Every folder has one role. Every new doc routes to exactly one folder based on what the doc is for, not who wrote it.

### Folder Roles

| Role | Folder | Purpose |
|---|---|---|
| Doctrine | `docs/` (root files) | Tiebreaker + product truth + active sprint |
| Flows | `docs/flows/<domain>/` | Deterministic runtime maps and phase dossiers per domain |
| Architecture | `docs/architecture/` | Cross-cutting system spec, roadmaps, refactor bibles |
| Design | `docs/design/` | Design system, tokens, motion |
| Audit | `docs/audit/` | Point-in-time evidence reports and risk trackers |
| Change control | `docs/project_state/` | SCC items, active change trackers, quick-start |
| Research | `docs/research/` | External references (Apple Maps, platform docs) |
| Cross-repo | `docs/console/` | Pointers and specs for the `ivisit-console` surface |
| Ops | `docs/deployment/` | Deployment, environment, and store submission guides |
| Onboarding | `docs/onboarding/` | Contributor onboarding |
| Marketing | `docs/product_design/` | Public-facing design and marketing strategy |
| Archive | `docs/archive/` | Superseded docs preserved for historical context |

### Routing Rules

- A new **phase dossier** or **flow spec** → `docs/flows/<domain>/`
- A new **audit** or **evidence report** → `docs/audit/`
- A new **design token** or **visual spec** → `docs/design/`
- A new **cross-cutting architectural decision** → `docs/architecture/`
- A new **sprint checkpoint** → update `SPONSOR_SPRINT.md` in place
- A new **product rule** → update `rules.json`; everything else defers to it
- A **superseded doc** → move to `docs/archive/<historical|legacy_specs>/` with an archival notice

### Authority Order

If docs disagree, resolve in this order:

1. `rules.json` (locked v2.0 system rules)
2. `MASTER_BLUEPRINT.md` (locked product doctrine)
3. `SPONSOR_SPRINT.md` (active sprint checkpoint)
4. `flows/<domain>/` current-state notes (e.g. `MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md`)
5. Older implementation notes

When in doubt, `rules.json` wins.

## Start Here

### Doctrine
- [`rules.json`](./rules.json) — system rules, tiebreaker
- [`MASTER_BLUEPRINT.md`](./MASTER_BLUEPRINT.md) — product blueprint
- [`SPONSOR_SPRINT.md`](./SPONSOR_SPRINT.md) — active sprint checkpoint
- [`INDEX.md`](./INDEX.md) — file-tree index

### Contributor onboarding
- [`project_state/QUICK_START.md`](./project_state/QUICK_START.md) — development quick start
- [`onboarding/Technical.md`](./onboarding/Technical.md) — technical onboarding

### Marketing and brand
- [`product_design/ANDROID_GLASS_PATTERN.md`](./product_design/ANDROID_GLASS_PATTERN.md) — Android shadow/glass standard
- [`product_design/marketing/STRATEGY.md`](./product_design/marketing/STRATEGY.md) — marketing strategy and brand pillars
- [`product_design/marketing/MANUSCRIPT.md`](./product_design/marketing/MANUSCRIPT.md) — 60-second cinematic ad script

## Workflow Maps

- [`flows/README.md`](./flows/README.md) — workflow map hub
- [`flows/auth/workflow_map.md`](./flows/auth/workflow_map.md) — auth / login / register execution map
- [`flows/emergency/workflow_map.md`](./flows/emergency/workflow_map.md) — deterministic emergency lifecycle map
- [`flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md`](./flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md) — current-state truth for `/map`
- [`flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md`](./flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md) — live execution plan
- [`flows/payment/workflow_map.md`](./flows/payment/workflow_map.md) — payment and wallet map

## Architecture and Ops

- [`architecture/overview/ARCHITECTURE.md`](./architecture/overview/ARCHITECTURE.md)
- [`architecture/REFACTORING_BIBLE.md`](./architecture/REFACTORING_BIBLE.md)
- [`architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md`](./architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md)
- [`console/WEB_DASHBOARD_SPEC.md`](./console/WEB_DASHBOARD_SPEC.md) — `ivisit-console` implementation spec
- [`deployment/VERCEL_WEB_DEPLOYMENT.md`](./deployment/VERCEL_WEB_DEPLOYMENT.md)
- [`deployment/WEB_MAPS_SETUP.md`](./deployment/WEB_MAPS_SETUP.md)

## Audit

- [`audit/RISK_STATUS_2026-04-23.md`](./audit/RISK_STATUS_2026-04-23.md) — R1-R10 resolution tracker
- [`audit/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md`](./audit/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md)
- [`audit/ivisit_full_system_reconstruction_report_2026-03-02.md`](./audit/ivisit_full_system_reconstruction_report_2026-03-02.md)

## Supabase

All schema, RPC, and migration conventions live under `supabase/docs/`:

- [`../supabase/docs/REFERENCE.md`](../supabase/docs/REFERENCE.md)
- [`../supabase/docs/API_REFERENCE.md`](../supabase/docs/API_REFERENCE.md)
- [`../supabase/docs/SCHEMA_SNAPSHOT.md`](../supabase/docs/SCHEMA_SNAPSHOT.md)
- [`../supabase/docs/MODULE_SCHEMA_BIBLE.md`](../supabase/docs/MODULE_SCHEMA_BIBLE.md)
- [`../supabase/docs/CONTRIBUTING.md`](../supabase/docs/CONTRIBUTING.md)
- [`../supabase/docs/TESTING.md`](../supabase/docs/TESTING.md)

## Documentation Maintenance

- Follow the routing rules above when adding a new doc.
- Update workflow and flow maps first when runtime paths change; keep deep-dive docs in sync afterward.
- Prefer map-and-link updates over duplicating long prose across files.
- When a doc is superseded, move it to `archive/` with a banner pointing to its replacement.
- Do not introduce new top-level files at `docs/` root; all non-doctrine files belong in a role folder.
