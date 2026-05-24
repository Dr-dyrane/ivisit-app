# Docs Audit — 2026-05-24

> **Pass 1 — Triage & Inventory.** Verifies whether the 2026-05-19 cleanup classification still matches current code. Flags drift, not rewrites.
>
> Builds on: [`audit/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md`](./DOCS_REPO_CLEANUP_REPORT_2026-05-19.md)
>
> Inventory: 356 markdown files across 14 subdirectories.

---

## Classification Legend

| Class | Definition | Required action |
|---|---|---|
| `LIVING` | Claims about current code; must match `HEAD` | Reconcile against source in Pass 2–4 |
| `LIVING-DRIFTED` | Living doc whose claims no longer match code | Rewrite in Pass 2–4 |
| `HISTORICAL` | Point-in-time record (audit, pass plan, checkpoint, dossier) | **Freeze.** Do not edit content; add archival notice only if still misclassified |
| `STALE` | Was living, now obsolete or superseded | Move to `archive/`, add notice |
| `ORPHAN` | Not linked from INDEX, unclear purpose | Investigate; archive or delete |

---

## Section A — Living Docs (must match code)

### A.1 Top-level doctrine

| File | Class | Drift status | Notes |
|---|---|---|---|
| `README.md` | LIVING | ✅ Clean (2026-05-19) | Portal copy current |
| `INDEX.md` | LIVING | ⚠️ Minor drift | References `flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` as if living in INDEX §5; itself self-marks as historical. Consistent but redundant linkage |
| `MASTER_BLUEPRINT.md` | LIVING-DRIFTED | ❌ Drifted | §"Current Phase" links `MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` as `/map` current state — that doc is marked Historical in INDEX. Should point to `EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` |
| `SPONSOR_SPRINT.md` | LIVING | ✅ Touched 2026-05-24 | Active sprint state — defer to user-owned cadence |
| `CONTRIBUTING.md` | LIVING | ✅ Clean | Folder rules current |
| `REFACTORING_GUARDRAILS.md` | LIVING | 🔄 Verify in Pass 2 | 31 KB — claims about 5-layer architecture, useEffect rules, file size compliance need spot-check against current `stores/`, `atoms/`, `machines/` |
| `rules.json` | LIVING | Out of scope (JSON, not MD) | Tiebreaker doctrine |

### A.2 Architecture overview

| File | Class | Drift status | Notes |
|---|---|---|---|
| `architecture/ARCHITECTURE_README.md` | LIVING | 🔄 Verify | 858 B — likely a stub index |
| `architecture/overview/ARCHITECTURE.md` | **LIVING-DRIFTED** | ❌ Severely drifted | Dated 2026-01-09 v1.1. Describes "Three Layers" (Presentation / Business Logic / Data Access) and **AsyncStorage as the database**. Current reality is the 5-layer Gold Standard (Supabase / TanStack Query / Zustand / XState / Jotai) — see `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`. **Highest-priority rewrite target.** |
| `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` | LIVING | 🔄 Verify | Claims Phases 1–7 complete; verify against existence of `stores/`, `atoms/`, `machines/`, retired `EmergencyContext`. Spot-check shows `EmergencyContext.jsx` still present (228 lines, thin orchestrator over hooks) — confirm roadmap "Phase 5 retire EmergencyContext" actually reflects this thin-orchestrator state, not full deletion |
| `architecture/stores/STORES_README.md` | **LIVING-DRIFTED** | ❌ Severely drifted | Lists only `emergencyTripStore.js` + selectors + `index.js`. Reality: **22 files** in `stores/` covering billingQuote, bookVisit, coverage, emergencyContacts, emergencyTrip, helpSupport, lastHospital, location, mapRoute, medicalProfile, mode, notifications, paymentPreferences, visits. Doc is 1/14 the size of truth. |
| `architecture/refactoring/REFACTORING_BIBLE.md` | LIVING | 🔄 Verify in Pass 3 | Cross-cutting code standards |
| `architecture/refactoring/STASH_AUDIT.md` | HISTORICAL | ✅ Frozen | 224-file categorization snapshot |
| `architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` | LIVING | 🔄 Verify in Pass 4 | Defect classes 2.1–2.12, heuristics H1–H5 — living reference |
| `architecture/refactoring/EDGE_FUNCTION_PHASE_8_*.md` | LIVING | 🔄 Verify in Pass 4 | Active plan, dated 2026-05-19 |
| `architecture/refactoring/IVISIT_PHASE_0_TO_7_*.md` | LIVING | 🔄 Verify in Pass 4 | Active plan, dated 2026-05-19 |
| `architecture/refactoring/CHECKPOINT_PRE_PROVIDER_DETAIL.md` | HISTORICAL | ✅ Frozen | Checkpoint |
| `architecture/roadmap/IMPLEMENTATION_ROADMAP.md` | LIVING | 🔄 Verify | Spot-check against current sprint |
| `architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md` | LIVING | 🔄 Verify | Same |

### A.3 Feature-area living docs

| File | Class | Drift status | Notes |
|---|---|---|---|
| `architecture/emergency/EMERGENCY_STATE_REFACTOR.md` | LIVING | 🔄 Verify | Migration guide; referenced from `stores/README.md` |
| `architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md` | LIVING | 🔄 Verify | Stores `emergencyContactsStore` + atoms + machine all exist — confirm doc matches |
| `architecture/location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md` | LIVING | 🔄 Verify in Pass 4 | 60 KB; cross-check against `locationStore.js`, `GlobalLocationContext.jsx`, `atoms/locationIntentAtoms.js` |
| `architecture/location/LOCATION_SHEET_ARCHITECTURE_PLAN.md` | LIVING | 🔄 Verify | 41 KB |
| `architecture/location/MANUAL_ADDRESS_ENTRY_REDESIGN_2026-05-10.md` | LIVING (plan) | 🔄 Verify | LS-9 plan from memory — still pending |
| `architecture/location/PLACES_AND_RECENTS_HUB_PLAN_2026-05-10.md` | LIVING (plan) | 🔄 Verify | LS-10/11 plans — still pending |
| `architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md` | LIVING | 🔄 Verify | Hooks `useMapExploreFlow` confirmed exists |
| `architecture/map/METRO_ROUTING_FIXES.md` | LIVING | 🔄 Verify | Fix doc; may belong in audit/ |
| `architecture/map/ZERO_COST_MAPBOX_MIGRATION.md` | LIVING | 🔄 Verify | Mapbox usage confirmed in code |
| `architecture/ux/passes/UX_A..E_*.md` | LIVING (plan) | 🔄 Verify | Per memory, plans still pending |
| `architecture/ux/IVISIT_UX_ISSUE_MAPPING_*.md` | LIVING | 🔄 Verify | UX register |
| `architecture/ux/UX_ISSUES_SUBPASS_PLAN_2026-05-10.md` | LIVING | 🔄 Verify | 54 KB plan |
| `architecture/ux/APP_WIDE_SURFACE_AUDIT_FOR_LOCATION_*.md` | HISTORICAL | ✅ Frozen | Dated audit |
| `architecture/ux/MODAL_RECOVERY_PASS_OTA_RATING_V1.md` | LIVING | 🔄 Verify | Small doc |

### A.4 Flow docs (active emergency surface)

| File | Class | Drift status | Notes |
|---|---|---|---|
| `flows/README.md` | LIVING | 🔄 Verify | Workflow hub |
| `flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` | LIVING | 🔄 Verify in Pass 4 | Primary current-truth tracker |
| `flows/emergency/MASTER_REFERENCE_FLOW_V1.md` | LIVING | 🔄 Verify | Locked doctrine |
| `flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` | LIVING | 🔄 Verify in Pass 4 | 56 KB; MapScreen.jsx is 38 KB — verify rules still describe current shape after Pass 1/2 decomposition (`useMapShell`, `useMapHistoryFlow` extracted per memory) |
| `flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` | LIVING | 🔄 Verify | Demo bootstrap |
| `flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md` | LIVING | 🔄 Verify | Welcome flow |
| `flows/emergency/workflow_map.md` | LIVING | 🔄 Verify | Workflow map |
| `flows/emergency/ambulance_and_bed_booking.md` | LIVING | 🔄 Verify | Core flow |
| `flows/emergency/CHOOSE_HOSPITAL_PHASE_DOSSIER.md` | LIVING | 🔄 Verify | Phase dossier |
| `flows/emergency/LOCATION_SEARCH_MODAL_DOSSIER.md` | LIVING | 🔄 Verify | Modal dossier |
| `flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` | HISTORICAL | ✅ Frozen | Marked historical in INDEX; **remove from MASTER_BLUEPRINT current-state link** |
| `flows/emergency/architecture/*` (24 files) | Mixed | Mostly HISTORICAL pass plans | Most are completed V1 pass plans → freeze. `explore-care/`, `contact-dispatch/`, `location-truth/` are active dossier+passes per INDEX |
| `flows/emergency/history/*.md` | LIVING | 🔄 Verify | Visits + history flow |
| `flows/emergency/ux/*` | LIVING | 🔄 Verify | UX notes |
| `flows/emergency/checklists/POST_BOOKING_UI_CHECKLIST.md` | LIVING | 🔄 Verify | Checklist |
| `flows/auth/login.md`, `register.md` | LIVING | 🔄 Verify | Jan 2026 — verify still current |
| `flows/auth/REGISTRATION_UI_UX.md` | LIVING | 🔄 Verify | |
| `flows/auth/workflow_map.md` | LIVING | 🔄 Verify | |
| `flows/auth/OAUTH_TROUBLESHOOTING.md` | LIVING | 🔄 Verify | Apr 2026 |
| `flows/payment/payment.md`, `workflow_map.md` | LIVING | 🔄 Verify | Payment flow |
| `flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md` | LIVING (plan) | 🔄 Verify | `billingQuoteStore.js` + `billingQuoteMachine.js` exist — confirm shipped |
| `flows/search/SAVED_LOCATIONS_USER_FLOW.md` | LIVING | 🔄 Verify | |

### A.5 Design / product

| File | Class | Notes |
|---|---|---|
| `design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md` | LIVING | Verify |
| `design/MINI_PROFILE_UI_DOCTRINE_V1.md` | LIVING | Verify |
| `product_design/manifesto.md` | LIVING | Doctrine |
| `product_design/ui_ux_bible.md` | LIVING | Doctrine |
| `product_design/ANDROID_GLASS_PATTERN.md` | LIVING | Verify |
| `product_design/SCREEN_CONSISTENCY_GUIDE.md` | LIVING | Verify |
| `product_design/FAB_ANALYSIS_REVIEW.md` | STALE? | Jan 2026; verify if FAB still relevant — `FABContext.jsx` exists |
| `product_design/GLOBAL_FAB_IMPLEMENTATION_PLAN.md` | STALE? | Same |
| `product_design/marketing/*` | LIVING | Marketing |

### A.6 Deployment + research

| File | Class | Notes |
|---|---|---|
| `deployment/VERCEL_WEB_DEPLOYMENT.md` | LIVING | Verify |
| `deployment/WEB_MAPS_SETUP.md` | LIVING | Verify |
| `deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md` | LIVING | Verify |
| `deployment/GOOGLE_PLAY_CLOSED_TESTING.md` | LIVING | Verify (2026-05-22) |
| `research/APPLE_MAPS_IPHONE_UI_REFERENCE.md` | LIVING (ref) | External reference, frozen content |
| `research/IOS_PWA.md` | LIVING (ref) | Reference |

### A.7 Algorithm

| File | Class | Notes |
|---|---|---|
| `algorithm/EMERGENCY_COMMIT_GRAPH_DOSSIER.md` | LIVING | 33 KB; verify (2026-05-24) |
| `algorithm/EMERGENCY_COMMIT_GRAPH_FILING_PACK.md` | LIVING | 56 KB; verify (2026-05-24) |

### A.8 Console docs (cross-repo)

| File | Class | Notes |
|---|---|---|
| `console/console-ui-theme-guide.md` | STALE? | Jan 2026; `ivisit-console` lives in a separate repo — these may belong there. Candidate to move or archive |
| `console/dashboard-crud-plan.md` | STALE? | Same |
| `console/implementation-guide.md` | STALE? | Same |
| `console/quick-reference.md` | STALE? | Same |
| `console/starter-template.md` | STALE? | Same |
| `console/WEB_DASHBOARD_SPEC.md` | STALE? | Verify if still tracked here |

### A.9 Onboarding + payment singletons

| File | Class | Notes |
|---|---|---|
| `onboarding/Technical.md` | STALE? | 2025-12-28; verify currency |
| `payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` | LIVING (plan)? | Verify if shipped |

---

## Section B — Historical (frozen, no rewrites)

All entries below are point-in-time records. They MUST NOT be rewritten. The only acceptable edits are adding archival notices or fixing broken links.

### B.1 Already in `archive/` — leave alone

- `archive/historical/*` (8 files)
- `archive/legacy_specs/*` (10 files)

### B.2 Audit logs (`audit/**`) — 137 files

All `audit/**` content is by definition historical evidence. Treat the entire tree as **HISTORICAL → freeze**, with these exceptions:

| File | Class | Notes |
|---|---|---|
| `audit/AUDIT_CHECKLIST.md` | LIVING | Reusable checklist |
| `audit/BUG_CLASSIFICATION_SYSTEM.md` | LIVING | Reusable taxonomy |
| `audit/README.md` | LIVING | Index |
| `audit/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md` | HISTORICAL | Cleanup record |
| `audit/DOCS_AUDIT_2026-05-24.md` | LIVING (this doc) | |
| All other `audit/**/*.md` | HISTORICAL | Audit/pass/checkpoint records |

### B.3 SCC items (`project_state/context/scc/**`) — 56 files

All `SCC-XXX_*` items are historical change-control records. **Freeze entire folder.**

### B.4 SUPABASE change trackers

| File | Class | Notes |
|---|---|---|
| `project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md` | LIVING (ledger) | 87 KB ledger — append-only, not rewritten |
| `project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md` | LIVING (ledger) | 110 KB ledger — append-only |
| `project_state/context/CURRENT_STATE.md` | LIVING | 5 KB — verify |
| `project_state/context/HARDENING_CLOSURE_PLAN_2026-03-04.md` | HISTORICAL | Closure plan |
| `project_state/context/DEPRECATED.md` | LIVING (ledger) | |

### B.5 Project state early-2026

| File | Class | Recommendation |
|---|---|---|
| `project_state/CONTEXT_REVIEW.md` | STALE | 2026-01-25; superseded by current architecture docs. **Move to archive/** |
| `project_state/QUICK_START.md` | STALE | 2026-01-11; superseded by `README.md`. **Move to archive/** |
| `project_state/repo.md` | STALE | 2026-01-11; superseded by `README.md`. **Move to archive/** |

---

## Section C — Drift Summary (Pass 2/3/4 targets)

### C.1 Must-rewrite (highest priority)

1. **`architecture/overview/ARCHITECTURE.md`** — completely rewrite to describe the 5-layer Gold Standard. Pre-Gold-Standard 3-layer story is misleading new contributors.
2. **`architecture/stores/STORES_README.md`** — expand from 1 store to all 22 stores. Group by domain (trip / booking / coverage / location / map / mode / etc.).
3. **`stores/README.md` (in code)** — mirror the doc-side STORES_README update.
4. **`MASTER_BLUEPRINT.md`** — update §"Current Phase" links: remove `MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md`, point at `EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` instead.

### C.2 Verify-and-touch-up

5. `REFACTORING_GUARDRAILS.md` — confirm 5-layer + file-size + useEffect rules still match enforcement.
6. `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` — confirm Phase 5 "EmergencyContext retired" wording matches the **thin-orchestrator** reality (file still exists at 228 lines, delegating to `hooks/emergency/*`).
7. `flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` — verify suspicions/fix-order still match current sprint.
8. `flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` — reconcile against post-decomposition MapScreen (`useMapShell`, `useMapHistoryFlow`).
9. `architecture/location/LOCATION_*` — verify against `locationStore.js`, `GlobalLocationContext.jsx`, `locationIntentAtoms.js`.
10. `architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md` — confirm all 5 layers exist (store / selectors / atoms / machine / hooks).

### C.3 Move to archive

11. `project_state/CONTEXT_REVIEW.md` → `archive/historical/`
12. `project_state/QUICK_START.md` → `archive/historical/` (replaced by `README.md`)
13. `project_state/repo.md` → `archive/historical/`
14. `product_design/FAB_ANALYSIS_REVIEW.md` + `GLOBAL_FAB_IMPLEMENTATION_PLAN.md` → **decision needed** (`FABContext.jsx` exists; either keep as living spec or archive if abandoned)
15. `console/*` (6 files) → **decision needed** (move to `ivisit-console` repo, or archive here)
16. `onboarding/Technical.md` → **decision needed** (verify currency)

### C.4 Verify shipped, then archive plans

17. `payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` — if shipped → archive
18. `flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md` — `billingQuoteStore` + `billingQuoteMachine` exist; if plan complete → archive
19. UX-A through UX-D pass plans — verify shipped state per `SPONSOR_SPRINT.md`

---

## Section D — Inventory totals

| Folder | Files | Living | Living-Drifted | Historical | Stale | Orphan |
|---|---:|---:|---:|---:|---:|---:|
| root | 6 | 5 | 1 | 0 | 0 | 0 |
| algorithm | 2 | 2 | 0 | 0 | 0 | 0 |
| architecture | 31 | ~22 | 2 | ~7 | 0 | 0 |
| archive | 19 | 0 | 0 | 19 | 0 | 0 |
| audit | 137 | 3 | 0 | 134 | 0 | 0 |
| console | 6 | 0 | 0 | 0 | 6 (TBD) | 0 |
| deployment | 4 | 4 | 0 | 0 | 0 | 0 |
| design | 2 | 2 | 0 | 0 | 0 | 0 |
| flows | 99 | ~40 | 0 | ~59 | 0 | 0 |
| onboarding | 1 | 0 | 0 | 0 | 1 (TBD) | 0 |
| payment | 1 | 0 | 0 | 0 | 1 (TBD) | 0 |
| product_design | 8 | 6 | 0 | 0 | 2 (TBD) | 0 |
| project_state | 61 | ~5 | 0 | ~53 | 3 | 0 |
| research | 2 | 2 | 0 | 0 | 0 | 0 |
| **Total** | **356** | **~91** | **3** | **~272** | **~13** | **0** |

> Notes:
> - "Historical" includes the entire `audit/`, `archive/`, `project_state/context/scc/`, completed pass plans under `flows/emergency/architecture/`, and append-only ledgers.
> - "Living" is the working set that Pass 2–5 will actually touch.
> - No orphans detected; INDEX.md links to substantially all living docs.

---

## Section E — Pass plan (next)

| Pass | Scope | Targets |
|---|---|---|
| 2 | Top-level living doctrine | `MASTER_BLUEPRINT.md` (link fix), `REFACTORING_GUARDRAILS.md` (verify), `README.md` (verify) |
| 3 | Architecture overview rewrites | `architecture/overview/ARCHITECTURE.md` (full rewrite — 5-layer), `architecture/stores/STORES_README.md` + `stores/README.md` (full inventory), `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` (Phase 5 wording) |
| 4 | Feature-area living docs | Emergency / Location / Map / UX-passes / Flow trackers — reconcile against current code |
| 5 | Archive sweep | Move `project_state/{CONTEXT_REVIEW,QUICK_START,repo}.md` to `archive/historical/`; resolve TBDs on `console/`, `product_design/FAB_*`, `onboarding/`; update INDEX.md |

---

> **End of Pass 1.** No content changes have been made to other files. Awaiting approval to proceed to Pass 2.
