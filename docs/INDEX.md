---
status: living
owner: architecture
last_updated: 2026-05-24
---

# iVisit Documentation Index

Last Updated: 2026-05-24
Active tracker: [audit/DOCS_AUDIT_2026-05-24.md](./audit/DOCS_AUDIT_2026-05-24.md) (live, resumable)
Historical reconciliation: [audit/RECONCILIATION_2026-05-24.md](./audit/RECONCILIATION_2026-05-24.md) (per-folder status of every frozen audit/pass/checkpoint)
Predecessor cleanup: [archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md](./archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md)

---

## Deployment And Store Release

- [deployment/APP_STORE_REJECTION_RESPONSE_2026-06-17.md](./deployment/APP_STORE_REJECTION_RESPONSE_2026-06-17.md) - June 17, 2026 App Review rejection response, local fixes, external blockers, and resubmission gates.
- [deployment/APP_STORE_PREP_2026-06-11.md](./deployment/APP_STORE_PREP_2026-06-11.md) - Apple Developer/App Store Connect setup, iOS EAS build/submit path, privacy-label draft, and App Review risks.
- [deployment/GOOGLE_PLAY_CLOSED_TESTING.md](./deployment/GOOGLE_PLAY_CLOSED_TESTING.md) - Google Play closed-test history and production release readiness record.
- [deployment/VERCEL_WEB_DEPLOYMENT.md](./deployment/VERCEL_WEB_DEPLOYMENT.md) - Web deployment.
- [deployment/WEB_MAPS_SETUP.md](./deployment/WEB_MAPS_SETUP.md) - Web maps setup.

---

## 1. Current Product / Architecture References

These are the locked or actively maintained source-of-truth docs. When in doubt, these win.

| Doc | Role |
|---|---|
| [`rules.json`](./rules.json) | **Tiebreaker** — HIG compliance, product doctrine |
| [`MASTER_BLUEPRINT.md`](./MASTER_BLUEPRINT.md) | Locked — product vision |
| [`SPONSOR_SPRINT.md`](./SPONSOR_SPRINT.md) | Mutable — current sprint state and priorities |
| [`REFACTORING_GUARDRAILS.md`](./REFACTORING_GUARDRAILS.md) | Code standards, five-layer architecture, useEffect rules |
| [`README.md`](./README.md) | Docs portal — folder roles, routing rules |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Anti-litter rules — folder decision tree, naming, archival protocol |
| [`architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`](./architecture/state/GOLD_STANDARD_STATE_ROADMAP.md) | Five-layer gold standard — phases 1–7, completion record |
| [`audit/postmortems/`](./audit/postmortems/) | Incident postmortems (blameless, append-only) — Phase 6d iOS map loading + future incidents |
| [`architecture/overview/ARCHITECTURE.md`](./architecture/overview/ARCHITECTURE.md) | System overview |
| [`architecture/stores/STORES_README.md`](./architecture/stores/STORES_README.md) | Stores inventory |

### File Size Compliance

| Type | Target | Max |
|---|---|---|
| Routes | 20–100 | 150 |
| Screens | 250–400 | 500 |
| Components | 80–250 | 350 |
| Hooks | 80–200 | 300 |

> >800 lines = refactor candidate. >1000 lines = architectural violation (unless generated).

---

## 2. Active Emergency Flow Docs

> **Start here for any emergency flow work.**
> Primary source of current truth: **[flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md](./flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md)**

### Recommended reading path

1. **[flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md](./flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md)**
   Working map of the live flow. Current suspicions, fix order, state authority target. Start here.

2. **[flows/emergency/MASTER_REFERENCE_FLOW_V1.md](./flows/emergency/MASTER_REFERENCE_FLOW_V1.md)**
   Locked product doctrine: map-first, state-driven emergency journey.

3. **[flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md](./flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md)**
   Active implementation contract for `/(auth)/map`. Architecture, motion, file-organization rules.

4. **[flows/emergency/DEMO_MODE_COVERAGE_FLOW.md](./flows/emergency/DEMO_MODE_COVERAGE_FLOW.md)**
   How demo/bootstrap coverage works and what it masks. Critical for tracking regression diagnosis.

5. **[audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md](./audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md)**
   Most recent tracking-state audit. Current defects and intended fixes.

6. **[audit/map/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md](./audit/map/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md)**
   Full tracking sheet audit (passes A–G complete). Phase contracts, Apple HIG polish.

### Other active emergency flow docs

- Welcome + intake: [flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md](./flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md)
- Service flow baseline matrix: [audit/map/IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md](./audit/map/IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md)
- Service sheet simplification audit: [audit/map/IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md](./audit/map/IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md)
- Emergency contacts five-layer contract: [architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md](./architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md)
- Emergency state refactor: [architecture/emergency/EMERGENCY_STATE_REFACTOR.md](./architecture/emergency/EMERGENCY_STATE_REFACTOR.md)
- Workflow map: [flows/emergency/workflow_map.md](./flows/emergency/workflow_map.md)

### Explore Care (active architecture)

- Dossier: [flows/emergency/architecture/explore-care/EXPLORE_CARE_DOSSIER_V1.md](./flows/emergency/architecture/explore-care/EXPLORE_CARE_DOSSIER_V1.md)
- Pass index: [flows/emergency/architecture/explore-care/passes/README.md](./flows/emergency/architecture/explore-care/passes/README.md)
- Explore Care data audit: [audit/map/explore-care/EXPLORE_CARE_DATA_AUDIT_2026-05-16.md](./audit/map/explore-care/EXPLORE_CARE_DATA_AUDIT_2026-05-16.md)

### Location Truth (active architecture)

- Dossier: [flows/emergency/architecture/location-truth/DOSSIER_LOCATION_HARDENING_V1.md](./flows/emergency/architecture/location-truth/DOSSIER_LOCATION_HARDENING_V1.md)
- Pass index: [flows/emergency/architecture/location-truth/passes/README.md](./flows/emergency/architecture/location-truth/passes/README.md)
- Location architecture overview: [architecture/location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md](./architecture/location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md)
- Location sheet plan: [architecture/location/LOCATION_SHEET_ARCHITECTURE_PLAN.md](./architecture/location/LOCATION_SHEET_ARCHITECTURE_PLAN.md)

### Contact Dispatch (active architecture)

- Dossier: [flows/emergency/architecture/contact-dispatch/CONTACT_DISPATCH_COMMUNICATION_ROOM_DOSSIER_V1.md](./flows/emergency/architecture/contact-dispatch/CONTACT_DISPATCH_COMMUNICATION_ROOM_DOSSIER_V1.md)
- Pass index: [flows/emergency/architecture/contact-dispatch/passes/](./flows/emergency/architecture/contact-dispatch/passes/)

---

## 3. Active Map / Tracking Docs

- Tracking sheet audit (A–G complete): [audit/map/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md](./audit/map/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md)
- Map checkpoints index: [audit/map/checkpoints/](./audit/map/checkpoints/)
- Map passes index: [audit/map/passes/](./audit/map/passes/)
- Map JSON manifests: [audit/map/manifests/](./audit/map/manifests/)
- Tracking state tightening pass: [audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md](./audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md)
- Pre-tracking phase gate: [audit/map/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md](./audit/map/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md)
- Visit detail phase audit: [audit/map/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md](./audit/map/VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md)
- Tracking sheet learnings: [architecture/refactoring/TRACKING_SHEET_LEARNINGS.md](./architecture/refactoring/TRACKING_SHEET_LEARNINGS.md)
- Map explore flow modularization: [architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md](./architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md)
- Map route-state architecture audit: [audit/map/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/map/MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)
- Map route-state hardening checkpoint: [audit/map/checkpoints/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md](./audit/map/checkpoints/MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md)
- Map entity render checkpoint: [audit/map/checkpoints/MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md](./audit/map/checkpoints/MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md)
- Demo bootstrap bloat remediation: [audit/map/checkpoints/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md](./audit/map/checkpoints/DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md)
- Hospital marker render rule: [audit/map/HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md](./audit/map/HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md)
- Ambulance 3D telemetry pass: [audit/map/passes/AMBULANCE_3D_TELEMETRY_PASS.md](./audit/map/passes/AMBULANCE_3D_TELEMETRY_PASS.md)
- MapScreen pass 18 checkpoint: [audit/map/checkpoints/MAP_PASS18_WORKTREE_CHECKPOINT_2026-05-07.md](./audit/map/checkpoints/MAP_PASS18_WORKTREE_CHECKPOINT_2026-05-07.md)
- Layout runtime shell audit: [audit/map/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md](./audit/map/LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md)
- Final MapScreen orchestrator checkpoint: [audit/map/checkpoints/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md](./audit/map/checkpoints/FINAL_MAPSCREEN_ORCHESTRATOR_CHECKPOINT.md)

### Search / Location UX Audits

- Search sheet Apple alignment audit: [audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_AUDIT_2026-05-07.md](./audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_AUDIT_2026-05-07.md)
- Search sheet validation: [audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_VALIDATION_2026-05-08.md](./audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_VALIDATION_2026-05-08.md)
- Location search UX deep audit findings (2026-05-11): [audit/map/LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md](./audit/map/LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md)
- Location control audit: [audit/map/LOCATION_CONTROL_AND_MANUAL_PICKUP_AUDIT_2026-05-07.md](./audit/map/LOCATION_CONTROL_AND_MANUAL_PICKUP_AUDIT_2026-05-07.md)

---

## 4. Active Refactoring Plans

### iVisit Phase 0–8 Product/Architecture Plans (2026-05-19)

- Phase 0–7 product UX simplification: [architecture/refactoring/IVISIT_PHASE_0_TO_7_PRODUCT_UX_SIMPLIFICATION_PLAN_2026-05-19.md](./architecture/refactoring/IVISIT_PHASE_0_TO_7_PRODUCT_UX_SIMPLIFICATION_PLAN_2026-05-19.md)
- Edge Function Phase 8 architecture consolidation: [architecture/refactoring/EDGE_FUNCTION_PHASE_8_ARCHITECTURE_CONSOLIDATION_PLAN_2026-05-19.md](./architecture/refactoring/EDGE_FUNCTION_PHASE_8_ARCHITECTURE_CONSOLIDATION_PLAN_2026-05-19.md)
- Refactoring bible: [architecture/refactoring/REFACTORING_BIBLE.md](./architecture/refactoring/REFACTORING_BIBLE.md)
- Stash audit (224-file categorization): [architecture/refactoring/STASH_AUDIT.md](./architecture/refactoring/STASH_AUDIT.md)

### UX Issues (2026-05-10)

- UX issue register: [architecture/ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md](./architecture/ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md)
- UX sub-pass plan: [architecture/ux/UX_ISSUES_SUBPASS_PLAN_2026-05-10.md](./architecture/ux/UX_ISSUES_SUBPASS_PLAN_2026-05-10.md)
- Pass index: [architecture/ux/passes/README.md](./architecture/ux/passes/README.md)
- UX-A Decision Surface Layout: [architecture/ux/passes/UX_A_DECISION_SURFACE_LAYOUT.md](./architecture/ux/passes/UX_A_DECISION_SURFACE_LAYOUT.md)
- UX-B Visual Hierarchy: [architecture/ux/passes/UX_B_VISUAL_HIERARCHY.md](./architecture/ux/passes/UX_B_VISUAL_HIERARCHY.md)
- UX-C Payment Surface: [architecture/ux/passes/UX_C_PAYMENT_SURFACE.md](./architecture/ux/passes/UX_C_PAYMENT_SURFACE.md)
- UX-D State Layer: [architecture/ux/passes/UX_D_STATE_LAYER.md](./architecture/ux/passes/UX_D_STATE_LAYER.md)
- UX-E LocationSheet + Mini Profile (deferred): [architecture/ux/passes/UX_E_LOCATION_SHEET.md](./architecture/ux/passes/UX_E_LOCATION_SHEET.md)

### Demo Bootstrap Duplicate Hospital Bug (2026-05-10)

- Root-cause audit + 5-pass plan: [audit/demo/DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md](./audit/demo/DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md)
- Pass index: [audit/demo/README.md](./audit/demo/README.md)
- Pass 1 — server user-scoped scope key: [audit/demo/PASS_1_SERVER_USER_SCOPED_SCOPE_KEY.md](./audit/demo/PASS_1_SERVER_USER_SCOPED_SCOPE_KEY.md)
- Pass 2 — cross-org sweep: [audit/demo/PASS_2_SERVER_CROSS_ORG_SWEEP.md](./audit/demo/PASS_2_SERVER_CROSS_ORG_SWEEP.md)
- Pass 3 — DB cleanup migration: [audit/demo/PASS_3_DB_CLEANUP_MIGRATION.md](./audit/demo/PASS_3_DB_CLEANUP_MIGRATION.md)
- Pass 4 — client coverage gate: [audit/demo/PASS_4_CLIENT_COVERAGE_GATE.md](./audit/demo/PASS_4_CLIENT_COVERAGE_GATE.md)
- Pass 5 — doc update + SQL migration: [audit/demo/PASS_5_DOC_UPDATE_AND_SQL_MIGRATION.md](./audit/demo/PASS_5_DOC_UPDATE_AND_SQL_MIGRATION.md)

### Location Architecture Plans

- Manual address entry redesign: [architecture/location/MANUAL_ADDRESS_ENTRY_REDESIGN_2026-05-10.md](./architecture/location/MANUAL_ADDRESS_ENTRY_REDESIGN_2026-05-10.md)
- Places and Recents Hub plan: [architecture/location/PLACES_AND_RECENTS_HUB_PLAN_2026-05-10.md](./architecture/location/PLACES_AND_RECENTS_HUB_PLAN_2026-05-10.md)

### Stack Screen Pass Plans (2026-04-29)

All stack/screen pass plans live under [flows/emergency/architecture/](./flows/emergency/architecture/). Key index:

- Book Visit: [flows/emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/BOOK_VISIT_STACK_PASS_PLAN_V1.md) / [audit/screens/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Profile: [flows/emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/PROFILE_STACK_PASS_PLAN_V1.md) / [audit/screens/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Settings: [flows/emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/SETTINGS_STACK_PASS_PLAN_V1.md) / [audit/screens/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Insurance/Coverage: [flows/emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/INSURANCE_STACK_PASS_PLAN_V1.md) / [audit/screens/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Notifications: [flows/emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/NOTIFICATIONS_STACK_PASS_PLAN_V1.md) / [audit/screens/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Medical Profile: [flows/emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md) / [audit/screens/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Search: [flows/emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/SEARCH_STACK_PASS_PLAN_V1.md) / [audit/screens/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Help/Support: [flows/emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md](./flows/emergency/architecture/HELP_SUPPORT_STACK_PASS_PLAN_V1.md) / [audit/screens/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/screens/HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)

---

## 5. Historical / Archive Docs

These files are preserved for audit trail and context but are no longer current working truth.

### `docs/archive/legacy_specs/`

| File | Superseded by |
|---|---|
| `MAP_FLOW_IMPLEMENTATION_V1.md` | `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` |
| `MAP_EXPLORE_INTENT_AUDIT_AND_SYSTEM_V1.md` | `explore-care/EXPLORE_CARE_DOSSIER_V1.md` + EXP passes |
| `EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md` | `MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` + tracking audit |
| `EMERGENCY_SCREEN_DOSSIER.md` | `MASTER_REFERENCE_FLOW_V1.md` (map-first flow) |
| `EMERGENCY_INTEGRATION_AUDIT.md` | Gold Standard state roadmap |
| `WELCOME_SCREEN_DOSSIER.md` | `WELCOME_AND_INTAKE_FLOW_MAP.md` |

### `docs/archive/historical/`

| File | Note |
|---|---|
| `MAP_RUNTIME_PASS_PLAN_V1.md` | Completed 98-pass plan; superseded by Gold Standard roadmap |
| `EMERGENCY_UX_PROGRESS_LOG_2026-04-06.md` | Progress log; superseded |
| `EMERGENCY_UX_PROGRESS_LOG_2026-04-09.md` | Progress log; superseded |
| `COMMIT_DETAILS_CONTROLLER_REFACTOR_PLAN.md` | Completed refactor plan |
| `PAYMENT_CONTROLLER_REFACTOR_PLAN.md` | Completed refactor plan |
| `ROOT_README.md` | Old root readme |
| `ARCHITECTURE_v1.1_2026-01-09.md` | Pre-Gold-Standard 3-layer overview; superseded by `architecture/overview/ARCHITECTURE.md` v2.0 (moved 2026-05-24) |
| `PROJECT_STATE_CONTEXT_REVIEW_2026-01-25.md` | Was `project_state/CONTEXT_REVIEW.md`; superseded by current docs (moved 2026-05-24) |
| `PROJECT_STATE_QUICK_START_2026-01-11.md` | Was `project_state/QUICK_START.md`; superseded by `README.md` (moved 2026-05-24) |
| `PROJECT_STATE_REPO_2026-01-11.md` | Was `project_state/repo.md`; superseded (moved 2026-05-24) |
| `console/` (6 files) | Cross-repo material (belongs in `ivisit-console` repo). Archived 2026-05-24 |

### In-place historical docs (notice added at top)

| File | Status |
|---|---|
| `flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` | Historical — not working truth |
| `audit/emergency/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md` | Historical — issues addressed |
| `audit/emergency/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md` | Historical — issues addressed |
| `audit/emergency/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md` | Historical — EmergencyContext retired |
| `audit/planning/CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md` | Historical — refactor complete |
| `audit/planning/UNIFIED_MODULARIZATION_PASS_PLAN.md` | Historical — passes complete |

---

## 6. Raw Audits / Checkpoints

### Orchestrator Refactor Checkpoints (2026-04-25) — COMPLETE

- [audit/checkpoints/FINAL_MIGRATION_SUMMARY.md](./audit/checkpoints/FINAL_MIGRATION_SUMMARY.md)
- [audit/checkpoints/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md](./audit/checkpoints/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md)
- [audit/planning/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md](./audit/planning/BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md)
- [audit/planning/GLOBAL_GOLD_STD_PASSES_2026-04-27.md](./audit/planning/GLOBAL_GOLD_STD_PASSES_2026-04-27.md)
- [audit/planning/PAYMENT_SCREEN_PASS_7_REPORT_2026-04-28.md](./audit/planning/PAYMENT_SCREEN_PASS_7_REPORT_2026-04-28.md)
- [audit/planning/PERFORMANCE_STABILITY_MODULARIZATION.md](./audit/planning/PERFORMANCE_STABILITY_MODULARIZATION.md)
- [audit/planning/TEMPORAL_DEAD_ZONE_FIXES.md](./audit/planning/TEMPORAL_DEAD_ZONE_FIXES.md)

### Emergency Audits

- Emergency contacts state audit: [audit/emergency/EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md](./audit/emergency/EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md)

### State Audits

- Visits state architecture audit: [audit/state/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/state/VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)
- Visits state implementation checkpoint: [audit/state/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/state/VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)
- Medical profile state audit: [audit/state/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md](./audit/state/MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md)
- Medical profile state checkpoint: [audit/state/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md](./audit/state/MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md)

### Payment Audits

- Billing currency and FX audit: [audit/payment/BILLING_CURRENCY_AND_FX_AUDIT_2026-05-06.md](./audit/payment/BILLING_CURRENCY_AND_FX_AUDIT_2026-05-06.md)
- Billing quote adoption gap: [audit/payment/BILLING_QUOTE_ADOPTION_GAP_2026-05-07.md](./audit/payment/BILLING_QUOTE_ADOPTION_GAP_2026-05-07.md)

### Welcome Screen Audits

- Welcome screen HIG audit: [audit/welcome/WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md](./audit/welcome/WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md)
- Welcome HIG post: [audit/welcome/WELCOME_HIG_AUDIT_POST_2026-05-03.md](./audit/welcome/WELCOME_HIG_AUDIT_POST_2026-05-03.md)
- Welcome stage base modularization: [audit/welcome/WELCOME_STAGE_BASE_MODULARIZATION_POST_2026-05-03.md](./audit/welcome/WELCOME_STAGE_BASE_MODULARIZATION_POST_2026-05-03.md)

### Historical / Early Audits

- Architecture audit 2026-04-08: [audit/planning/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md](./audit/planning/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md)
- System reconstruction report 2026-03-02: [audit/planning/ivisit_full_system_reconstruction_report_2026-03-02.md](./audit/planning/ivisit_full_system_reconstruction_report_2026-03-02.md)
- JSON artifacts (schema/flow graphs 2026-03-02): [audit/inventory/](./audit/inventory/)
- Risk status 2026-04-23: [audit/planning/RISK_STATUS_2026-04-23.md](./audit/planning/RISK_STATUS_2026-04-23.md)
- Re-audit 2026-04-25: [audit/planning/REAUDIT_2026-04-25.md](./audit/planning/REAUDIT_2026-04-25.md)

---

## 7. Supabase Source of Truth

All schema, RPC, and migration conventions live under `supabase/docs/`.

- [../supabase/docs/REFERENCE.md](../supabase/docs/REFERENCE.md)
- [../supabase/docs/API_REFERENCE.md](../supabase/docs/API_REFERENCE.md)
- [../supabase/docs/SCHEMA_SNAPSHOT.md](../supabase/docs/SCHEMA_SNAPSHOT.md)
- [../supabase/docs/CONTRIBUTING.md](../supabase/docs/CONTRIBUTING.md)
- [../supabase/docs/TESTING.md](../supabase/docs/TESTING.md)

### Active Change Control

- [project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md](./project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md)
- [project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md](./project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md)
- Key SCCs: [SCC-001](./project_state/context/scc/SCC-001_EMERGENCY_REQUESTS_CONTRACT_AUDIT_2026-03-05.md) | [SCC-025](./project_state/context/scc/SCC-025_HOSPITALS_SURFACE_CONTRACT_HARDENING_2026-03-05.md) | [Full index in project_state/context/scc/](./project_state/context/scc/)

---

## 8. Workflow Maps

- Auth: [flows/auth/workflow_map.md](./flows/auth/workflow_map.md)
- Emergency: [flows/emergency/workflow_map.md](./flows/emergency/workflow_map.md)
- Payment: [flows/payment/workflow_map.md](./flows/payment/workflow_map.md)

---

## Documentation Maintenance Rules

### Update Order of Operations

1. **Runtime paths change** ? Update workflow/flow maps FIRST
2. **Deep implementation details** ? Keep in dedicated docs
3. **Source of truth** ? One location only; link elsewhere

### INDEX.md Sync Checklist

When adding a new document:

- [ ] Add to correct section in this INDEX (sections 1–6 above)
- [ ] Add to **Workflow Maps** if flow-related
- [ ] If superseded: add archival notice to the old doc, move to `archive/` if its folder becomes misleading
- [ ] Never delete historical docs — archive with notice

### Archival Requirements

- Move superseded docs to `docs/archive/<historical|legacy_specs>/`
- Add `> ARCHIVAL NOTICE` block with link to current replacement
- Preserve for audit trail
- See [archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md](./archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md) for cleanup record

---

## Quick Navigation

- **Docs entry**: [README.md](./README.md)
- **Product blueprint**: [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- **Sprint state**: [SPONSOR_SPRINT.md](./SPONSOR_SPRINT.md)
- **Workflow map hub**: [flows/README.md](./flows/README.md)

### Design / Product

- Manifesto: [product_design/manifesto.md](./product_design/manifesto.md)
- UI/UX Bible: [product_design/ui_ux_bible.md](./product_design/ui_ux_bible.md)
- Screen consistency guide: [product_design/SCREEN_CONSISTENCY_GUIDE.md](./product_design/SCREEN_CONSISTENCY_GUIDE.md)
- Android glass standard: [product_design/ANDROID_GLASS_PATTERN.md](./product_design/ANDROID_GLASS_PATTERN.md)
- FAB analysis review: [product_design/FAB_ANALYSIS_REVIEW.md](./product_design/FAB_ANALYSIS_REVIEW.md)
- Global FAB implementation plan: [product_design/GLOBAL_FAB_IMPLEMENTATION_PLAN.md](./product_design/GLOBAL_FAB_IMPLEMENTATION_PLAN.md)
- Map design system overview: [product_design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md](./product_design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md) (moved 2026-05-24 from `design/`)
- Mini profile UI doctrine: [product_design/MINI_PROFILE_UI_DOCTRINE_V1.md](./product_design/MINI_PROFILE_UI_DOCTRINE_V1.md) (moved 2026-05-24 from `design/`)
- Welcome + onboarding technical: [product_design/WELCOME_ONBOARDING_TECHNICAL_V1.md](./product_design/WELCOME_ONBOARDING_TECHNICAL_V1.md) (moved 2026-05-24 from `onboarding/`)
- Marketing strategy: [product_design/marketing/STRATEGY.md](./product_design/marketing/STRATEGY.md)
- Ad manuscript: [product_design/marketing/MANUSCRIPT.md](./product_design/marketing/MANUSCRIPT.md)

### Stack Screen Comparison Audits (2026-04-29)

All stack comparison audits are under `audit/screens/`. Quick links:

- [HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/HELP_SUPPORT_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/INSURANCE_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/NOTIFICATIONS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/NOTIFICATION_DETAILS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/SEARCH_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/SETTINGS_STACK_COMPARISON_AUDIT_2026-04-29.md)
- [MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md](./audit/screens/MEDICAL_PROFILE_STACK_COMPARISON_AUDIT_2026-04-29.md)

> See **Section 4** above for the full structured index of all refactoring plans, pass plans, and checkpoints.
