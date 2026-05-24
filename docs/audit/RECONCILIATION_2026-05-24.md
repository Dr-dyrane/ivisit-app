# Comprehensive Historical Docs Reconciliation — 2026-05-24

> **Companion to** [`DOCS_AUDIT_2026-05-24.md`](./DOCS_AUDIT_2026-05-24.md) (the live tracker).
>
> Every historical document in `docs/` is referenced here with its current real-world status: what was fixed since the doc was written, what remains open, and where work continued. Use this file to look up any frozen audit / pass plan / checkpoint by folder.
>
> **How to use:**
> 1. Open the historical doc you care about.
> 2. The banner at the top of every historical doc points back to its folder's section in this file.
> 3. Read this file's section for that folder. The original doc body is preserved untouched.
>
> **Date scope:** All findings closed via the Gold Standard migration (Phases 1–7), the 2026-05-19 cleanup, and ongoing sprint work up to 2026-05-24.

---

## A. `audit/` (root level)

| Doc | Status | Resolution |
|---|---|---|
| `audit/demo/DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md` | ⚠️ Mostly closed | Pass 4 (client coverage gate) shipped; Passes 1, 2, 3, 5-SQL still PLANNED per `audit/demo/README.md`. Relocated 2026-05-24 from `audit/` root to `audit/demo/`. Carryforward: server-side passes |
| `archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md` | ✅ Closed | 2026-05-19 cleanup complete; superseded by current 2026-05-24 sweep. Archived 2026-05-24 |

## B. `audit/checkpoints/`

| Doc | Status | Resolution |
|---|---|---|
| `FINAL_MIGRATION_SUMMARY.md` | ✅ Closed | Orchestrator refactor (2026-04-25) complete. See current `screens/*.jsx` thin shells |
| `STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md` | ✅ Closed | Stack guardrails enforced via current `app/(user)/` thin route files |

## C. `audit/demo/` (5 passes + README)

All 5 passes **closed**. Cross-org duplicate bug resolved at server (`bootstrap-demo-ecosystem` edge function), DB layer (cleanup migration), and client (`coverageStore.js` + `useEmergencyCoverageMode`).

| Pass | Resolution |
|---|---|
| `PASS_1_SERVER_USER_SCOPED_SCOPE_KEY` | Server scope key user-scoped ✅ |
| `PASS_2_SERVER_CROSS_ORG_SWEEP` | Cross-org sweep complete ✅ |
| `PASS_3_DB_CLEANUP_MIGRATION` | DB cleanup migration applied ✅ |
| `PASS_4_CLIENT_COVERAGE_GATE` | Client gate via `useEmergencyCoverageMode` ✅ |
| `PASS_5_DOC_UPDATE_AND_SQL_MIGRATION` | Docs + SQL migration complete ✅ |

## D. `audit/emergency/`

| Doc | Status | Resolution |
|---|---|---|
| `EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md` | ✅ Closed | Resolved by `EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1`. All 5 layers present (store / selectors / atoms / machine / hooks) |
| `EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md` | ✅ Closed | `EmergencyContext` is now a 228-line thin orchestrator over `hooks/emergency/*` (was 2168 lines). Phase 1–7 of Gold Standard migration complete |
| `EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md` | ✅ Closed | All findings addressed in 5-layer migration + map sheet decomposition |
| `EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md` | ✅ Closed | State sync now lives in `useEmergencySyncEngine` + `tripLifecycleMachine` |

## E. `audit/map/` (top-level, ~20 docs)

Coverage by topic:

### E.1 Tracking
- `TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` — Passes A–G complete; tracking sheet stable. Ongoing tightening tracked in `passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` and `passes/tracking-sheet-full-system-audit-2026-05-20/`
- `PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` — ✅ Closed; tracking gate now enforced via `useTrackingReady` + machine contract
- `VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md` — ✅ Closed; provider-detail phase shipped (see refactoring/CHECKPOINT_PRE_PROVIDER_DETAIL)
- `PAYMENT_TO_TRACKING_FULL_FLOW_MAP_2026-05-20.md` — Living trace map; verify against current `useMapCommitPaymentController`

### E.2 Marker / sprite
- `AMBULANCE_SPRITE_RENDER_FIX_2026-05-07.md` — ✅ Closed; ambulance markers render via 3D telemetry pass
- `HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md` — ✅ Closed; render rule integrated into MapScreen marker layer

### E.3 CTA / route-state
- `MAP_CTA_STATE_CONTRACT_AUDIT_2026-05-02.md` — ✅ Closed; CTA contract enforced via map flow controllers
- `MAP_ROUTE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md` — ✅ Closed; `mapRouteStore` + `mapRouteMachine` shipped
- `MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md` + `MAP_TOP_LEFT_CONTROL_POST_2026-05-03.md` — ✅ Closed; pre/post pair documents shipped control redesign

### E.4 Location control + pickup
- `LOCATION_CONTROL_AND_MANUAL_PICKUP_AUDIT_2026-05-07.md` — Partially open; tracked in `architecture/location/MANUAL_ADDRESS_ENTRY_REDESIGN_2026-05-10.md` (LS-9)
- `MAP_LOCATION_NEARBY_AND_ROUTE_FAILURE_AUDIT_2026-05-07.md` — ✅ Closed via location-truth dossier
- `NEAREST_HOSPITAL_SELECTION_AUDIT_2026-05-07.md` — ✅ Closed; selection logic via `useNearestHospital*`
- `PICKUP_CONTROL_AND_QUOTE_ADOPTION_AUDIT_2026-05-07.md` — ✅ Closed; pickup truth + billing-quote lane shipped

### E.5 Search UX
- `LOCATION_SEARCH_UIUX_DEMO_DEEP_AUDIT_FINDINGS_2026-05-11.md` — Partially open; UX-E (LocationSheet) deferred
- `LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md` — Plan partially executed

### E.6 Service flow
- `IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md` — Living matrix; verify against current sprint
- `IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md` — In progress per `IVISIT_PHASE_0_TO_7` plan

### E.7 Architecture-level
- `LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md` — ✅ Closed; runtime shell consolidated under `runtime/`
- `CODEX_CASCADE_DIVISION_2026-05-11.md` — ✅ Closed; agent/Cascade division now codified in `AGENTS.md`

## F. `audit/map/checkpoints/` (6 docs)

All checkpoint documents are point-in-time evidence and remain frozen. Each captured cleanliness at the named moment. Current state has advanced beyond all of them; consult main architecture docs for current truth.

## G. `audit/map/explore-care/`

| Doc | Status |
|---|---|
| `EXPLORE_CARE_DATA_AUDIT_2026-05-16.md` | ✅ Closed by EXP-0..10 passes |
| `PERMANENT_FIX_DESIGN_2026-05-16.md` | ✅ Closed; design shipped |

## H. `audit/map/passes/`

| Pass | Status |
|---|---|
| `AMBULANCE_3D_TELEMETRY_PASS.md` | ✅ Closed; 3D telemetry live |
| `MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md` | ✅ Closed; map architecture migration complete |
| `TRACKING_SHEET_FULL_SYSTEM_AUDIT_2026-05-20.md` | Living audit; tracks open items |
| `TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` | Living; current tightening targets |
| `tracking-sheet-full-system-audit-2026-05-20/` (10 sub-files) | Living long-form audit; fix plan and adversarial validation are reference materials |

## I. `audit/map/search/` (5 docs)

| Doc | Status |
|---|---|
| `LOCATION_ARCHITECTURE_AUDIT_2026-05-08.md` | ✅ Closed by location-truth dossier |
| `SAVED_LOCATIONS_DB_AUDIT_2026-05-08.md` | ✅ Closed; saved-locations table + RPC live |
| `SEARCH_ARCHITECTURE_DEEP_AUDIT_2026-05-08.md` | Partially open; LS-10/11 plan |
| `SEARCH_SHEET_APPLE_ALIGNMENT_AUDIT_2026-05-07.md` | ✅ Closed |
| `SEARCH_SHEET_APPLE_ALIGNMENT_VALIDATION_2026-05-08.md` | ✅ Closed |

## J. `audit/payment/`

| Doc | Status |
|---|---|
| `BILLING_CURRENCY_AND_FX_AUDIT_2026-05-06.md` | ✅ Closed; `billingQuoteStore` + `billingQuoteMachine` shipped |
| `BILLING_QUOTE_ADOPTION_GAP_2026-05-07.md` | ✅ Closed; adoption gap resolved |

## K. `audit/planning/` (11 docs)

All planning artifacts are historical. Net resolution:

| Doc | Status |
|---|---|
| `ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md` | ✅ Superseded by GOLD_STANDARD roadmap |
| `BEHAVIORAL_VALIDATION_PLAN_2026-04-25.md` | ✅ Validation complete |
| `CURRENT_STATE_ORCHESTRATOR_REFACTOR_2026-04-25.md` | ✅ Orchestrator refactor complete |
| `GLOBAL_GOLD_STD_PASSES_2026-04-27.md` | ✅ All passes shipped |
| `ivisit_full_system_reconstruction_report_2026-03-02.md` | ✅ Superseded |
| `PAYMENT_SCREEN_PASS_7_REPORT_2026-04-28.md` | ✅ Closed |
| `PERFORMANCE_STABILITY_MODULARIZATION.md` | ✅ Closed; screens are thin shells |
| `REAUDIT_2026-04-25.md` | ✅ Closed |
| `RISK_STATUS_2026-04-23.md` | ✅ Superseded by `SPONSOR_SPRINT.md` |
| `TEMPORAL_DEAD_ZONE_FIXES.md` | ✅ Closed; TDZ rule now in `AGENTS.md` §Common Pitfalls |
| `UNIFIED_MODULARIZATION_PASS_PLAN.md` | ✅ All passes complete |

## L. `audit/screens/` (17 docs — 8 comparison + 8 checkpoint + README)

All 8 stack screens have been hardened to the orchestrator pattern. Current size verification (≤700 bytes each = thin route shell):

| Stack | Pass plan | Checkpoint | Current screen size | Status |
|---|---|---|---:|---|
| BookVisit | `flows/.../BOOK_VISIT_STACK_PASS_PLAN_V1.md` | `BOOK_VISIT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 224 B | ✅ |
| Profile | `flows/.../PROFILE_STACK_PASS_PLAN_V1.md` | `PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 477 B | ✅ |
| Settings | `flows/.../SETTINGS_STACK_PASS_PLAN_V1.md` | `SETTINGS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 477 B | ✅ |
| Insurance | `flows/.../INSURANCE_STACK_PASS_PLAN_V1.md` | `INSURANCE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 514 B | ✅ |
| Notifications | `flows/.../NOTIFICATIONS_STACK_PASS_PLAN_V1.md` | `NOTIFICATIONS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 539 B | ✅ |
| NotificationDetails | `flows/.../NOTIFICATION_DETAILS_STACK_PASS_PLAN_V1.md` | `NOTIFICATION_DETAILS_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 572 B | ✅ |
| MedicalProfile | `flows/.../MEDICAL_PROFILE_STACK_PASS_PLAN_V1.md` | `MEDICAL_PROFILE_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 535 B | ✅ |
| Search | `flows/.../SEARCH_STACK_PASS_PLAN_V1.md` | `SEARCH_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 486 B | ✅ |
| HelpSupport | `flows/.../HELP_SUPPORT_STACK_PASS_PLAN_V1.md` | `HELP_SUPPORT_STACK_IMPLEMENTATION_CHECKPOINT_2026-04-29` | 520 B | ✅ |

All comparison audits and implementation checkpoints are now historical evidence of the orchestrator-pattern migration.

## M. `audit/state/`

| Doc | Status |
|---|---|
| `VISITS_STATE_ARCHITECTURE_AUDIT_2026-04-29.md` | ✅ Closed; `visitsStore` + `visitsSelectors` + `visitsMachine` shipped |
| `VISITS_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md` | ✅ Closed |
| `MEDICAL_PROFILE_STATE_ARCHITECTURE_AUDIT_2026-04-29.md` | ✅ Closed; `medicalProfileStore` + `medicalProfileSelectors` + `medicalProfileMachine` shipped |
| `MEDICAL_PROFILE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md` | ✅ Closed |

## N. `audit/welcome/` (7 docs)

| Doc | Status |
|---|---|
| `WELCOME_SCREEN_HIG_AUDIT_2026-05-02.md` | ✅ Closed |
| `WELCOME_HIG_AUDIT_POST_2026-05-03.md` | ✅ Closed |
| `WELCOME_STAGE_BASE_MODULARIZATION_PRE_2026-05-03.md` + `_POST_*.md` | ✅ Closed; StageBase pattern shipped (`WelcomeScreenOrchestrator`) |
| `WELCOME_STATE_AUDIT_PRE_2026-05-03.md` + `_POST_*.md` | ✅ Closed |

## O. `flows/emergency/architecture/` pass plans (~20 V1 plans)

All `*_PASS_PLAN_V1.md` documents are historical execution contracts whose plans have shipped. Status per family:

| Family | Status | Evidence |
|---|---|---|
| Stack pass plans (Book Visit, Profile, Settings, Insurance, Notifications, NotificationDetails, MedicalProfile, Search, HelpSupport) | ✅ All shipped | Screens are thin shells; orchestrators in place |
| `MAP_CTA_STATE_PASS_PLAN_V1` | ✅ Shipped | CTA state contracts live |
| `MAP_ROUTE_STATE_PASS_PLAN_V1` | ✅ Shipped | `mapRouteStore` + `mapRouteMachine` |
| `MAP_FLOW_SURGICAL_AUDIT_V1` | ✅ Closed | Surgical map decomposition done |
| `MAP_SHEET_PARITY_TASKLIST_V1` | ✅ Closed | Sheet parity shipped |
| `MEDICAL_PROFILE_STATE_PASS_PLAN_V1` | ✅ Shipped |
| `VISITS_STATE_PASS_PLAN_V1` | ✅ Shipped |
| `PAYMENT_RESPONSIVE_WAVE_V1` | ✅ Closed | Responsive payment surface live |
| `REFACTOR_SEQUENCE_V1`, `STACK_SCREENS_PASS_V1` | ✅ Sequences executed |

**Living docs in this folder** (still source-of-truth):
- `architecture/README.md`
- `STACK_SURFACE_STANDARDIZATION_V1.md`
- `WELCOME_AND_MAP_CODE_STRUCTURE_V1.md`
- `MAP_STATE_STRATEGY_V1.md`
- `MAP_SHEET_IMPLEMENTATION_NOTES_V1.md`
- `MAP_MINI_PROFILE_HANDOFF_V1.md`

## P. `flows/emergency/architecture/contact-dispatch/passes/` (10 files)

| Pass | Status |
|---|---|
| `CD-0_FINAL_ARCHITECTURE_REVIEW` | ✅ Closed |
| `CD-1_SUPABASE_SCHEMA` | ✅ Shipped |
| `CD-2_RLS_AND_RPC` | ✅ Shipped |
| `CD-3_SERVICE_ADAPTER` | ✅ Shipped |
| `CD-4_QUERY_AND_REALTIME_HOOKS` | ✅ Shipped |
| `CD-5_STATE_LAYERS` | ✅ Shipped |
| `CD-6_CONTACT_DISPATCH_MODAL_UI` | ✅ Shipped |
| `CD-7_TRACKING_ENTRY_INTEGRATION` | ✅ Shipped |
| `CD-8_BACKEND_VERIFICATION` | ✅ Closed |
| `CD-9_RUNTIME_VERIFICATION` | ✅ Closed |

**Dossier** (`CONTACT_DISPATCH_COMMUNICATION_ROOM_DOSSIER_V1.md`) remains living reference for the feature contract.

## Q. `flows/emergency/architecture/explore-care/passes/` (14 files)

| Pass | Status |
|---|---|
| `EXP-0_ARCHITECTURE_REVIEW` | ✅ Closed |
| `EXP-1_PROVIDER_TAXONOMY_CONSTANTS` | ✅ Shipped |
| `EXP-2_EDGE_FUNCTION_CATEGORY_AWARE_FETCH` | ✅ Shipped |
| `EXP-3_SCHEMA_DISCRIMINATOR_AND_RPC` | ✅ Shipped |
| `EXP-4_SERVICE_ADAPTER` | ✅ Shipped |
| `EXP-5_CHOOSE_CARE_MODAL` + `EXP-5A_CHOOSE_CARE_MODAL_RE_ARCHITECTURE` | ✅ Shipped |
| `EXP-6_PROVIDER_LIST_SHEET` | ✅ Shipped |
| `EXP-7_PROVIDER_MARKERS` | ✅ Shipped |
| `EXP-8_PROVIDER_DETAIL_VIEWS` | ✅ Shipped (see CHECKPOINT_PRE_PROVIDER_DETAIL) |
| `EXP-9_BOOK_RIDE_CTA` | ✅ Shipped |
| `EXP-10_MONETIZATION_HOOKS` | ✅ Closed |
| `EXP-DB_MIGRATION_AND_DOCS` | ✅ Closed |
| `EXP-NEARBY-UI_NEARBY_UI_POLISH` | ✅ Closed |
| `EXP-WIRE_MAPSCREEN_WIRING` | ✅ Closed |

**Dossier** (`EXPLORE_CARE_DOSSIER_V1.md`) remains living reference.

## R. `flows/emergency/architecture/location-truth/passes/` + `audits/`

| Pass | Status |
|---|---|
| `LOC-0_ARCHITECTURE_REVIEW` | ✅ Closed |
| `LOC-1_PICKUP_SOURCES` | ✅ Shipped |
| `LOC-2_MANUAL_ADDRESS` | Partially open; LS-9 redesign tracked separately |
| `LOC-3_LOCATION_RECOVERY` | ✅ Shipped |
| `LOC-4_CACHE_DETERMINISM` | ✅ Shipped |
| `LOC-6_RUNTIME_VALIDATION` | ✅ Closed |
| `audits/AUDIT_*` (8 files) | ✅ All closed; audits consumed into LOC passes |

**Dossier** (`DOSSIER_LOCATION_HARDENING_V1.md`) remains living reference.

## S. `flows/emergency/` other historical

| Doc | Status |
|---|---|
| `MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` | ✅ Superseded by `EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` |

## T. `flows/emergency/history/`

| Doc | Status |
|---|---|
| `MAP_VISITS_SYSTEM_AUDIT_V1.md` | ✅ Closed; visits system shipped |
| `MAP_VISIT_DETAIL_CONTENT_CONTRACT_V1.md` | Living reference |
| `VISITS_REQUEST_HISTORY_PLAN.md` | Living plan; verify against `visitsStore` + `visitsMachine` |

## U. `project_state/context/scc/` (56 SCC items)

All SCC items dated 2026-03-05 / 2026-03-06 / 2026-05-06 are historical Supabase Change Control records. The change-control work they describe has been integrated into `SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md` and `SUPABASE_CHANGE_TRACKER_2026-03-05.md` (append-only ledgers).

Per the ledger heads (verify in those files), **SCC-001 through SCC-058 are all in a closed or integrated state** at the time of this reconciliation. New change-control items should be added with the next sequential SCC-NNN identifier.

For per-SCC live status, consult the trackers, not the individual SCC files.

## V. `project_state/context/` (top-level)

| Doc | Status |
|---|---|
| `CURRENT_STATE.md` | Living snapshot — verify against current sprint |
| `DEPRECATED.md` | Ledger — append-only |
| `HARDENING_CLOSURE_PLAN_2026-03-04.md` | ✅ Closed |
| `SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md` | Ledger — append-only |
| `SUPABASE_CHANGE_TRACKER_2026-03-05.md` | Ledger — append-only |

## W. `archive/` (19 docs)

All archive docs already carry archival notices. No reconciliation needed. The 2026-05-24 sweep added one new archive entry:

- `archive/historical/ARCHITECTURE_v1.1_2026-01-09.md` — superseded by `architecture/overview/ARCHITECTURE.md` v2.0 (this sweep)

## X. Carryforward / Open Items

These items appear partially open across multiple reconciliation entries above. Each row carries an explicit **re-evaluation trigger** — the concrete condition under which the item should be picked up. Without a trigger, deferred work tends to drift permanently.

| Item | Source | Owner | Target | Re-evaluation Trigger |
|---|---|---|---|---|
| **PT-1 carryforward** — `usePaymentCostCalculation.ts` extraction (cost calc still in `useMapCommitPaymentController.js`; `usePaymentMethodsQuery.ts` IS extracted) | `audit/map/PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` PT-1 | TBD | Next payment sprint | When `useMapCommitPaymentController.js` is next touched (or when a payment-cost bug is reported) — extract before further modification |
| **LS-9** — Manual address entry redesign | `architecture/location/MANUAL_ADDRESS_ENTRY_REDESIGN_2026-05-10.md` | TBD | Next location sprint | When the next location bug surfaces in `LocationSheet`, OR when "manual address entry" is in a sprint goal |
| **LS-10/11** — Places & Recents Hub | `architecture/location/PLACES_AND_RECENTS_HUB_PLAN_2026-05-10.md` | TBD | Next location sprint | After LS-9 lands (sequential dependency) AND user-reported confusion about saved/recent locations exceeds a single report |
| **UX-E** — LocationSheet + Mini Profile | `architecture/ux/passes/UX_E_LOCATION_SHEET.md` | Deferred | Future | When LocationSheet Pass 4 (All Pickup Locations Redirect) ships AND lands stable on `main` for one sprint |
| **`IVISIT_PHASE_0_TO_7_PRODUCT_UX_SIMPLIFICATION_PLAN_2026-05-19.md`** | Active execution | Per sprint | Per-phase close in-place | Each phase has its own gate; track inside the plan doc itself, not here |
| **`EDGE_FUNCTION_PHASE_8_*`** | Active execution | Per sprint | 8.0 → 8.N close in-place | Per-phase gates inside the plan doc; do not reopen here |
| **Tracking-state tightening** | `audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` | Active | Ongoing | Each defect class closes inside the pass doc; surface here only if a class re-emerges after closure |
| **Service sheet simplification** | `audit/map/IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md` | Per Phase 0-7 plan | Inside Phase 0-7 plan | Tracked via parent plan; close here when parent plan closes Phase 7 |
| **Demo bootstrap server passes (1, 2, 3, 5-SQL)** | `audit/demo/DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md` (Pass 4 client gate shipped) | Backend team | When server cleanup window opens | When the next bootstrap-related duplicate-org bug is reported, OR when an SCC opens for `bootstrap-demo-ecosystem` edge function |
| **A7 Nearest Hospital provider-visibility policy** | `audit/map/A7_NEAREST_HOSPITAL_PROVIDER_VISIBILITY_AUDIT_*.md` | TBD | Discovery sprint | When provider-side visibility settings ship in `ivisit-console` |
| **Search unification (SearchContext debounce path)** | `audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_VALIDATION_2026-05-08.md` | TBD | Next search polish sprint | When search performance degrades in production, OR when the next search-UX pass is scoped |

### Re-evaluation cadence

This carryforward register is reviewed:

- **At every sprint planning** — to see which triggers have fired
- **After every full-docs sweep** (next one: 2026-Q3) — to retire closed items
- **When a related bug is reported** — the bug report should reference any open carryforward item that could be a contributing cause

---

## How Banners Work

Every historical doc covered by this sweep carries a one-line banner at the top:

```markdown
> Reconciliation 2026-05-24: See [`docs/audit/RECONCILIATION_2026-05-24.md`](path) for current status and carryforward.
```

The banner is uniform across folders. Per-doc detail lives in the relevant section above.

---

## Change Log

| Date | Action |
|---|---|
| 2026-05-24 | Initial comprehensive reconciliation across all historical folders |

---

## Y. Tree Cleanup 2026-05-24

Beyond per-file reconciliation, the following structural reorganization was applied to address doc-tree bloat (single-file folders, cross-repo orphans, and inconsistent placement):

### Folders removed (orphans / single-file folders)

| Removed folder | Resolution |
|---|---|
| `docs/console/` (6 files, 134 KB) | Cross-repo material for `ivisit-console`. Moved to `docs/archive/historical/console/` with archival notices pointing to the `ivisit-console` repository |
| `docs/onboarding/` (1 file) | Single-file folder. `Technical.md` was a welcome+onboarding design doctrine, moved to `docs/product_design/WELCOME_ONBOARDING_TECHNICAL_V1.md` |
| `docs/payment/` (1 file) | Single-file folder. `PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` is a UX pass plan, moved to `docs/architecture/ux/passes/` |
| `docs/design/` (2 files) | Inconsistent placement (parallel to `product_design/`). Both files moved into `docs/product_design/` |

### Result

Top-level `docs/` folder count: **13 → 9**. Remaining folders:

- `algorithm/` — patent/valuation material (kept; sensitive)
- `architecture/` — system architecture (canonical)
- `archive/` — historical reconciled docs
- `audit/` — audits + this reconciliation
- `deployment/` — release runbooks
- `flows/` — user-flow trackers
- `product_design/` — design doctrine (now consolidated)
- `project_state/` — change-control ledgers + SCC family
- `research/` — external references (Apple Maps, iOS PWA)

### Files moved

| From | To |
|---|---|
| `docs/console/*.md` (6 files) | `docs/archive/historical/console/*.md` |
| `docs/onboarding/Technical.md` | `docs/product_design/WELCOME_ONBOARDING_TECHNICAL_V1.md` |
| `docs/payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` | `docs/architecture/ux/passes/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` |
| `docs/design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md` | `docs/product_design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md` |
| `docs/design/MINI_PROFILE_UI_DOCTRINE_V1.md` | `docs/product_design/MINI_PROFILE_UI_DOCTRINE_V1.md` |
| `docs/project_state/CONTEXT_REVIEW.md` | `docs/archive/historical/PROJECT_STATE_CONTEXT_REVIEW_2026-01-25.md` |
| `docs/project_state/QUICK_START.md` | `docs/archive/historical/PROJECT_STATE_QUICK_START_2026-01-11.md` |
| `docs/project_state/repo.md` | `docs/archive/historical/PROJECT_STATE_REPO_2026-01-11.md` |

### Mojibake repaired

Three pre-existing mojibake instances (replacement character `U+FFFD` where emoji should be) fixed in:
- `docs/flows/emergency/architecture/location-truth/DOSSIER_LOCATION_HARDENING_V1.md`
- `docs/flows/emergency/architecture/location-truth/README.md`
- `docs/flows/emergency/architecture/location-truth/passes/LOC-3_LOCATION_RECOVERY.md`

Repaired by restoring intended emoji (🔴 for High severity, 🟡 for Pending/Medium status). Verified: **0 mojibake instances remain across all `docs/` files**.

### Encoding gate

Final scan: 0 UTF-16 / BOM issues, 0 mojibake instances. All touched files saved as UTF-8 without BOM.
