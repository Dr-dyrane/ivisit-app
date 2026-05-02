# iVisit Documentation

> Portal for the `ivisit-app` patient product and its supporting surfaces.

## Documentation Model

iVisit uses a **Role-Based Doctrine Tree**. Every folder has one role. Every new doc routes to exactly one folder based on what the doc is for, not who wrote it.

### Folder Roles

| Role           | Folder                 | Purpose                                                  |
| -------------- | ---------------------- | -------------------------------------------------------- |
| Doctrine       | `docs/` (root files)   | Tiebreaker + product truth + active sprint               |
| Flows          | `docs/flows/<domain>/` | Deterministic runtime maps and phase dossiers per domain |
| Architecture   | `docs/architecture/`   | Cross-cutting system spec, roadmaps, refactor bibles     |
| Design         | `docs/design/`         | Design system, tokens, motion                            |
| Audit          | `docs/audit/`          | Point-in-time evidence reports and risk trackers         |
| Change control | `docs/project_state/`  | SCC items, active change trackers, quick-start           |
| Research       | `docs/research/`       | External references (Apple Maps, platform docs)          |
| Cross-repo     | `docs/console/`        | Pointers and specs for the `ivisit-console` surface      |
| Ops            | `docs/deployment/`     | Deployment, environment, and store submission guides     |
| Onboarding     | `docs/onboarding/`     | Contributor onboarding                                   |
| Marketing      | `docs/product_design/` | Public-facing design and marketing strategy              |
| Archive        | `docs/archive/`        | Superseded docs preserved for historical context         |

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

---

## Rules & Standards Hub

### **Primary System Rules**

| Document                                     | Purpose                                                    | Authority      |
| -------------------------------------------- | ---------------------------------------------------------- | -------------- |
| [`rules.json`](./rules.json)                 | Locked v2.0 system rules, product doctrine, HIG compliance | **Tiebreaker** |
| [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md) | Product blueprint and architectural vision                 | Locked         |
| [SPONSOR_SPRINT.md](./SPONSOR_SPRINT.md)     | Active sprint checkpoint and current priorities            | Mutable        |

### **Code & Development Standards**

| Document               | Location                                                                       | Purpose                                              |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Code Standards**     | [../.agent/workflows/code-standards.md](../.agent/workflows/code-standards.md) | Named exports, barrel imports, 6-step audit protocol |
| **DB Update Protocol** | [../.agent/workflows/db-update.md](../.agent/workflows/db-update.md)           | Database migration and certification workflow        |

### **Architecture Compliance Rules**

**File Size Ranges (Target → Max):**

| File Type        | Target  | Max | Notes                   |
| ---------------- | ------- | --- | ----------------------- |
| Route/Layout     | 20–100  | 150 | Composition only        |
| Screen files     | 250–400 | 500 | Assemble hooks + layout |
| UI Components    | 80–250  | 350 | Single surface          |
| Complex Features | 150–300 | 450 |                         |
| Hooks            | 80–200  | 300 | Single behavior         |
| Controllers      | 150–300 | 400 | Orchestration only      |
| State files      | 30–150  | 250 | Atoms/reducers          |
| Services         | 100–300 | 500 | Business logic          |
| Utils/Helpers    | 30–150  | 200 |                         |

**Escalation Thresholds:**

- > 800 lines → Flag for refactor
- > 1000 lines → Architectural violation (unless generated)

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
- [`flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md`](./flows/emergency/architecture/STACK_SURFACE_STANDARDIZATION_V1.md) — stack-screen contract for `welcome -> map -> stack`
- [`flows/emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `ProfileScreen`
- [`audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the profile stack refactor
- [`flows/emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `SettingsScreen`
- [`audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the settings stack refactor
- [`flows/emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `MedicalProfileScreen`
- [`audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the medical profile stack refactor
- [`flows/emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `InsuranceScreen`
- [`audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the coverage stack refactor
- [`flows/emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `SearchScreen`
- [`audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the search stack refactor
- [`flows/emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `NotificationsScreen`
- [`audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the notifications stack refactor
- [`flows/emergency/architecture/NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `NotificationDetailsScreen`
- [`flows/emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `BookVisitScreen`
- [`audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the book-visit stack refactor
- [`flows/emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md`](./flows/emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md) — implementation plan and ownership split for `HelpSupportScreen`
- [`audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the help-support stack refactor
- [`flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md`](./flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md) — current-state truth for `/map`
- [`flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md`](./flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md) — live execution plan
- [`audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md`](./audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md) — shared directions-state hardening pass and loop-fix checkpoint
- [`audit/MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md`](./audit/MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md) — marker/entity render hardening checkpoint for `/map`
- [`flows/emergency/architecture/MAP_ROUTE_STATE_PASS_PLAN_V1.md`](./flows/emergency/architecture/MAP_ROUTE_STATE_PASS_PLAN_V1.md) — architecture contract for the full five-layer route-state completion
- [`audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the full five-layer route-state migration
- [`flows/emergency/architecture/VISITS_STATE_PASS_PLAN_V1.md`](./flows/emergency/architecture/VISITS_STATE_PASS_PLAN_V1.md) — architecture contract for the canonical visits-domain state migration
- [`audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the visits-domain five-layer migration
- [`flows/emergency/architecture/MEDICAL_PROFILE_STATE_PASS_PLAN_V1.md`](./flows/emergency/architecture/MEDICAL_PROFILE_STATE_PASS_PLAN_V1.md) — architecture contract for the medical-profile five-layer completion
- [`audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — post-pass checkpoint for the medical-profile state migration
- [`flows/payment/workflow_map.md`](./flows/payment/workflow_map.md) — payment and wallet map

- [`audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md`](./audit/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md) â€” post-audit guardrail reconciliation for recent stack-screen and route-state changes

- [`flows/emergency/DEMO_MODE_COVERAGE_FLOW.md`](./flows/emergency/DEMO_MODE_COVERAGE_FLOW.md) â€” deterministic demo bootstrap rules, active-pool contract, and cleanup runbook
- [`audit/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md`](./audit/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md) â€” demo bootstrap bloat remediation checkpoint and before/after live inventory

## Architecture and Ops

- [`architecture/overview/ARCHITECTURE.md`](./architecture/overview/ARCHITECTURE.md)
- [`architecture/REFACTORING_BIBLE.md`](./architecture/REFACTORING_BIBLE.md)
- [`architecture/GOLD_STANDARD_STATE_ROADMAP.md`](./architecture/GOLD_STANDARD_STATE_ROADMAP.md) — 5-layer state migration roadmap
- [`architecture/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md`](./architecture/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md) — canonical emergency-contacts state contract
- [`architecture/TRACKING_SHEET_LEARNINGS.md`](./architecture/TRACKING_SHEET_LEARNINGS.md) — defect classes 2.1–2.16, heuristics, process lessons
- [`architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md`](./architecture/MAP_EXPLORE_FLOW_MODULARIZATION.md)
- [`architecture/EMERGENCY_STATE_REFACTOR.md`](./architecture/EMERGENCY_STATE_REFACTOR.md)
- [`architecture/STASH_AUDIT.md`](./architecture/STASH_AUDIT.md)
- [`architecture/STORES_README.md`](./architecture/STORES_README.md) — global state store inventory
- [`architecture/METRO_ROUTING_FIXES.md`](./architecture/METRO_ROUTING_FIXES.md) — platform idiosyncrasies
- [`architecture/ZERO_COST_MAPBOX_MIGRATION.md`](./architecture/ZERO_COST_MAPBOX_MIGRATION.md) — Mapbox zero-cost migration strategy
- [`architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md`](./architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md)
- [`console/WEB_DASHBOARD_SPEC.md`](./console/WEB_DASHBOARD_SPEC.md) — `ivisit-console` implementation spec
- [`deployment/VERCEL_WEB_DEPLOYMENT.md`](./deployment/VERCEL_WEB_DEPLOYMENT.md)
- [`deployment/WEB_MAPS_SETUP.md`](./deployment/WEB_MAPS_SETUP.md)

## Audit

### Active

- [`audit/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md`](./audit/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md) — ✅ ALL PASSES COMPLETE (VD-A through VD-G)
- [`audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md`](./audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md) — ✅ ALL PASSES COMPLETE (A–G)
- [`audit/EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md`](./audit/EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md) — pre-pass baseline for five-layer migration
- [`audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md`](./audit/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md) — route dedupe, shared cache, and selector-stability checkpoint for `/map`
- [`audit/MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md`](./audit/MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md) — marker/entity render hardening checkpoint after route-state completion
- [`audit/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md`](./audit/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md) — deep follow-on audit for completing route state to full five layers
- [`audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — route-state five-layer completion outcome and remaining verification
- [`audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md`](./audit/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md) — deep audit of the canonical visits-domain state lane
- [`audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — visits-domain five-layer implementation outcome and remaining verification
- [`audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md`](./audit/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md) — deep audit of the medical-profile data lane after shell modernization
- [`audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — medical-profile five-layer implementation outcome and remaining verification
- [`audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the coverage stack pass
- [`audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — coverage stack implementation outcome and remaining verification
- [`audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the search stack pass
- [`audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — search stack implementation outcome and remaining verification
- [`audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the notifications stack pass
- [`audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — notifications stack implementation outcome and remaining verification
- [`audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the notification-details stack pass
- [`audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/BOOK_VISIT_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the book-visit stack pass
- [`audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — book-visit stack implementation outcome and remaining verification
- [`audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the help-support stack pass
- [`audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — help-support stack implementation outcome and remaining verification
- [`audit/PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md) — payment/emergency-contacts comparison baseline for the next profile pass
- [`audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — profile stack implementation outcome and remaining verification
- [`audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the next settings stack pass
- [`audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — settings stack implementation outcome and remaining verification
- [`audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md`](./audit/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md) — comparison baseline for the medical profile stack pass
- [`audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md`](./audit/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md) — medical profile stack implementation outcome and remaining verification
- [`audit/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md`](./audit/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md) — Pre-tracking phase constraint audit
- [`audit/RISK_STATUS_2026-04-23.md`](./audit/RISK_STATUS_2026-04-23.md) — R1-R10 resolution tracker
- [`audit/TEMPORAL_DEAD_ZONE_FIXES.md`](./audit/TEMPORAL_DEAD_ZONE_FIXES.md)
- [`audit/AUDIT_CHECKLIST.md`](./audit/AUDIT_CHECKLIST.md)

- [`audit/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md`](./audit/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md) â€” live demo bootstrap remediation checkpoint, cleanup sequence, and final inventory state

### Orchestrator Refactor (2026-04-25)

- [`audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md`](./audit/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md) ← START HERE
- [`audit/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md`](./audit/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md)
- [`audit/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md`](./audit/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md)
- [`audit/FINAL_MIGRATION_SUMMARY.md`](./audit/FINAL_MIGRATION_SUMMARY.md)
- [`audit/MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md`](./audit/MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md)
- [`audit/REAUDIT_2026-04-25.md`](./audit/REAUDIT_2026-04-25.md)
- [`audit/UNIFIED_MODULARIZATION_PASS_PLAN.md`](./audit/UNIFIED_MODULARIZATION_PASS_PLAN.md)
- [`audit/PERFORMANCE_STABILITY_MODULARIZATION.md`](./audit/PERFORMANCE_STABILITY_MODULARIZATION.md)

### Emergency Flow (2026-04-24)

- [`audit/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md`](./audit/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md)
- [`audit/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md`](./audit/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md)
- [`audit/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md`](./audit/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md)
- [`audit/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md`](./audit/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md)

### Historical Artifacts (2026-03-02)

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

## Documentation Maintenance Rules

### **Adding New Documents**

1. **Route by Role**: Follow the Folder Roles table above when adding a new doc.
2. **Update Maps First**: When runtime paths change, update workflow/flow maps first; keep deep-dive docs in sync afterward.
3. **Prefer Links**: Use map-and-link updates over duplicating long prose across files.
4. **No Root Clutter**: Do not introduce new top-level files at `docs/` root; all non-doctrine files belong in a role folder.

### **Archival Protocol**

- When a doc is superseded, **move it** to `docs/archive/<historical|legacy_specs>/`
- Add an **Archival Notice** banner pointing to its replacement
- Update `INDEX.md` to mark as archived
- Preserve historical context for audit trails

### **Git Workflow for Docs**

| Change Type          | Branch Pattern         | Notes                     |
| -------------------- | ---------------------- | ------------------------- |
| New audit/checkpoint | `docs/audit-[date]`    | Include date in branch    |
| Flow map updates     | `docs/flow-[domain]`   | Domain-specific updates   |
| Archival cleanup     | `docs/archive-[batch]` | Batch archival operations |
| INDEX updates        | `docs/index-sync`      | Navigation sync only      |

### **Quality Gates**

- [ ] Document follows routing rules (correct folder)
- [ ] Links are valid and not broken
- [ ] Authority order is respected (no conflicts with `rules.json`)
- [ ] Superseded docs are archived with notice
- [ ] INDEX.md is updated with new entry
