---
status: living
owner: architecture
last_updated: 2026-05-24
---

# Docs Update Tracker â€” 2026-05-24

> **Live tracker** for the full-docs reconciliation sweep across `ivisit-app/docs/`.
> Anyone can resume from the next `pending` row.
>
> Started: 2026-05-24
> Author: Cascade + Dyrane
> Inventory: 356 markdown files
> Predecessor: [`archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md`](../archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md)

---

## How To Resume This Tracker

1. Scan the tables below in pass order (Pass 2 â†’ 6).
2. Find the next row with `Status: pending`.
3. Read the doc; read the cited code; apply the `Intent` per the `Target` notes.
4. Update the row: set `Status: done`, fill `Completed`, add the commit/diff reference if applicable.
5. If a doc is **historical** (audit, completed pass, checkpoint, dossier), do **not** rewrite the body. Append a **Reconciliation Note** block (template below).
6. If a doc is **living-drifted**, rewrite to match current `HEAD`.
7. If a doc is **stale**, move it to `docs/archive/historical/` with an archival notice.

### Status Values

| Value | Meaning |
|---|---|
| `pending` | Not yet reviewed in this sweep |
| `in_progress` | Currently being reconciled |
| `done` | Reconciled â€” either rewritten (living), noted (historical), or archived (stale) |
| `blocked` | Waiting on a decision, missing context, or upstream change |
| `n/a` | Not a reconciliation target (e.g. JSON, append-only ledger) |

### Class Values

| Value | Treatment |
|---|---|
| `LIVING` | Rewrite to match current code |
| `LIVING-DRIFTED` | Severe rewrite required (priority) |
| `HISTORICAL` | Freeze body; append Reconciliation Note |
| `STALE` | Move to `archive/historical/` with notice |
| `LEDGER` | Append-only; verify head only |
| `REF` | External reference; no action |

---

## Reconciliation Note Template

Append this block at the **end** of any historical doc (audit, pass plan, checkpoint, dossier) reviewed in this sweep. Do **not** edit the body above it. The note records what has been resolved since the doc was written and what remains.

```markdown
---

## Reconciliation Note â€” 2026-05-24

> Appended during the 2026-05-24 docs update sweep. The body above is a frozen point-in-time record. This note summarizes what has been resolved since, what remains open, and where work continued.

**Status of original findings**

- `<finding 1>` â€” **Fixed** in `<file:lines>` (commit `<sha>` or pass `<name>`).
- `<finding 2>` â€” **Partially fixed**; `<remaining work>`.
- `<finding 3>` â€” **Open**; tracked in `<file>` or `<sprint item>`.
- `<finding 4>` â€” **Obsolete** (assumption no longer holds because `<reason>`).

**Where work continued**

- `<later doc 1>` â€” `<one-line relationship>`
- `<later doc 2>` â€” `<one-line relationship>`

**Carryforward**

- `<open item 1>` â€” owner `<who>`, target `<sprint or doc>`
- `<open item 2>` â€” owner `<who>`, target `<sprint or doc>`
```

If the doc's findings are **fully closed** with nothing remaining, the note may be shortened to a single line:

```markdown
---

## Reconciliation Note â€” 2026-05-24

All original findings resolved by `<doc or pass>`. No carryforward.
```

---

## Pass 2 â€” Top-level Living Doctrine

| # | File | Class | Status | Intent | Target / Notes | Completed |
|---:|---|---|---|---|---|---|
| 2.1 | `README.md` | LIVING | **done** | Verified â€” folder roles + routing rules + authority order all current | â€” | 2026-05-24 |
| 2.2 | `INDEX.md` | LIVING | pending | Remove redundant historical link, add Pass 6 archive section | Re-run after Pass 5/6 to reflect moves | |
| 2.3 | `MASTER_BLUEPRINT.md` | LIVING-DRIFTED | **done** | Replaced historical `/map` link with `EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` at lines 22 + 72 | â€” | 2026-05-24 |
| 2.4 | `CONTRIBUTING.md` | LIVING | **done** | Removed stray `QUICK_START.md` from Â§SCC Items allowed-list (file slated for archive) | Folder decision tree + naming rules verified current | 2026-05-24 |
| 2.5 | `REFACTORING_GUARDRAILS.md` | LIVING | **done** | Head (5-layer + useEffect decision tree + Emergency Contacts rule) matches current code. Stores Ã—22, atoms Ã—18, machines Ã—10, all five-layer present | â€” | 2026-05-24 |
| 2.6 | `SPONSOR_SPRINT.md` | LIVING | n/a | User-owned sprint state | Do not edit | |
| 2.7 | `rules.json` | LIVING | n/a | JSON, tiebreaker doctrine | Out of MD scope | |

---

## Pass 3 â€” Architecture Rewrites (highest-drift)

| # | File | Class | Status | Intent | Target / Notes | Completed |
|---:|---|---|---|---|---|---|
| 3.1 | `architecture/overview/ARCHITECTURE.md` | LIVING-DRIFTED | **done** | Full rewrite to v2.0 5-layer Gold Standard | v1.1 archived at `archive/historical/ARCHITECTURE_v1.1_2026-01-09.md` with notice | 2026-05-24 |
| 3.2 | `architecture/stores/STORES_README.md` | LIVING-DRIFTED | **done** | Rewrote to v2.0 with all 22 stores grouped by domain (emergency / trip-map-route / booking-payment / profile-care), authoring rules, anti-patterns, reference templates | â€” | 2026-05-24 |
| 3.3 | `stores/README.md` (code) | LIVING-DRIFTED | **done** | In-code dev quick reference â€” 22-file tree, short-form rules, usage snippets, when-not-to-add table, reference templates. Points to canonical doc | â€” | 2026-05-24 |
| 3.4 | `architecture/ARCHITECTURE_README.md` | LIVING | **done** | Refreshed: subfolder index now complete (was missing state/, stores/, emergency/, location/, map/, refactoring/). Added anchor-documents table pointing at ARCHITECTURE.md v2.0 | â€” | 2026-05-24 |
| 3.5 | `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` | LIVING | pending | Reconcile Phase 5 wording: `EmergencyContext` is a thin shell, not deleted | Reflect 228-line orchestrator over `hooks/emergency/*` | |
| 3.6 | `architecture/refactoring/REFACTORING_BIBLE.md` | LIVING | pending | Verify code standards current | | |
| 3.7 | `architecture/refactoring/STASH_AUDIT.md` | HISTORICAL | pending | Append Reconciliation Note (224-file categorization closure) | | |
| 3.8 | `architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` | LIVING | pending | Verify defect classes + heuristics still accurate | Living reference; do not freeze | |
| 3.9 | `architecture/refactoring/EDGE_FUNCTION_PHASE_8_*` | LIVING (plan) | pending | Verify still active / not shipped | | |
| 3.10 | `architecture/refactoring/IVISIT_PHASE_0_TO_7_*` | LIVING (plan) | pending | Verify still active / shipped state | | |
| 3.11 | `architecture/refactoring/CHECKPOINT_PRE_PROVIDER_DETAIL.md` | HISTORICAL | pending | Append Reconciliation Note | | |
| 3.12 | `architecture/roadmap/IMPLEMENTATION_ROADMAP.md` | LIVING | pending | Verify against current sprint | | |
| 3.13 | `architecture/roadmap/PRODUCT_EXECUTION_ROADMAP.md` | LIVING | pending | Verify against current sprint | | |
| 3.14 | `architecture/emergency/EMERGENCY_STATE_REFACTOR.md` | LIVING | pending | Verify migration guide matches current shape | Path: `docs/architecture/emergency/` corrected; ensure refs match | |
| 3.15 | `architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md` | LIVING | pending | Confirm 5 layers exist (`emergencyContactsStore` + selectors + atoms + machine + hooks) | | |

---

## Pass 4 - Feature-area Living Docs

### 4A - Location

| # | File | Class | Status | Intent | Completed |
|---:|---|---|---|---|---|
| 4A.1 | `architecture/location/LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md` | LIVING | **verified-clean** | Doc body matches current `locationStore.js` / `GlobalLocationContext.jsx` / `locationIntentAtoms.js`; 2026-05-13 update is fresh | 2026-05-24 |
| 4A.2 | `architecture/location/LOCATION_SHEET_ARCHITECTURE_PLAN.md` | LIVING | **verified-clean** | Header self-marks "Pass 1, 2 & 3 COMPLETE - Baseline uplift COMPLETE - Full management pass: A/B/C/D/E COMPLETE"; LS-9/10/11 closures live in companion docs | 2026-05-24 |
| 4A.3 | `architecture/location/MANUAL_ADDRESS_ENTRY_REDESIGN_2026-05-10.md` | LIVING (plan) | **done** | LS-9 SHIPPED - closure note appended | 2026-05-24 |
| 4A.4 | `architecture/location/PLACES_AND_RECENTS_HUB_PLAN_2026-05-10.md` | LIVING (plan) | **done** | LS-10/11 SHIPPED - closure note appended | 2026-05-24 |

### 4B - Map

| # | File | Class | Status | Intent | Completed |
|---:|---|---|---|---|---|
| 4B.1 | `architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md` | LIVING | **done** | Closure note appended; line count drift (557 -> ~744) noted as carryforward | 2026-05-24 |
| 4B.2 | `architecture/map/METRO_ROUTING_FIXES.md` | LIVING | **done** | Closure note appended - fixes shipped (`immer` installed, Metro reload routing live) | 2026-05-24 |
| 4B.3 | `architecture/map/ZERO_COST_MAPBOX_MIGRATION.md` | LIVING | **done** | Closure note appended - `services/mapboxService.js` + adopters confirm migration SHIPPED | 2026-05-24 |
| 4B.4 | `flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md` | LIVING | **done** | Closure note appended documenting 8-pass MapScreen decomposition | 2026-05-24 |

### 4C - UX

| # | File | Class | Status | Intent | Completed |
|---:|---|---|---|---|---|
| 4C.1 | `architecture/ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md` | LIVING | **verified-clean** | UX architecture notes, not an implementation pass; 2026-05-11 update still accurate | 2026-05-24 |
| 4C.2 | `architecture/ux/UX_ISSUES_SUBPASS_PLAN_2026-05-10.md` | LIVING | **done** | Closure note appended - UX-A/B/C/D/E all shipped per individual pass docs | 2026-05-24 |
| 4C.3 | `architecture/ux/MODAL_RECOVERY_PASS_OTA_RATING_V1.md` | LIVING | **done** | Closure note appended - shipped via `OTAModalLayer.jsx`, `useTrackingRatingFlow.js`, `trackingRatingStateAtom` | 2026-05-24 |
| 4C.4 | `architecture/ux/APP_WIDE_SURFACE_AUDIT_FOR_LOCATION_2026-05-10.md` | HISTORICAL | **done** | Reconciliation note appended - downstream LS-9/10/11 + UX-E all shipped | 2026-05-24 |
| 4C.5 | `architecture/ux/passes/README.md` | LIVING | **done** | Status table updated inline - all five passes flipped from PLANNED/DEFERRED to **SHIPPED 2026-05** | 2026-05-24 |
| 4C.6 | `architecture/ux/passes/UX_A_DECISION_SURFACE_LAYOUT.md` | LIVING (plan) | **done** | UX-A SHIPPED - closure note appended | 2026-05-24 |
| 4C.7 | `architecture/ux/passes/UX_B_VISUAL_HIERARCHY.md` | LIVING (plan) | **done** | UX-B SHIPPED - closure note appended | 2026-05-24 |
| 4C.8 | `architecture/ux/passes/UX_C_PAYMENT_SURFACE.md` | LIVING (plan) | **done** | UX-C SHIPPED - closure note appended | 2026-05-24 |
| 4C.9 | `architecture/ux/passes/UX_D_STATE_LAYER.md` | LIVING (plan) | **done** | UX-D self-marked COMPLETE; verified `isSubmitting` derives via `isSubmittingPaymentAtom` (Jotai) | 2026-05-24 |
| 4C.10 | `architecture/ux/passes/UX_E_LOCATION_SHEET.md` | LIVING (plan) | **done** | UX-E self-marked COMPLETE; Issue 11 shipped via `MiniProfileModal.jsx` | 2026-05-24 |

### 4D - Flows - Emergency (live trackers + doctrine)

| # | File | Class | Status | Intent | Completed |
|---:|---|---|---|---|---|
| 4D.1 | `flows/README.md` | LIVING | **verified-clean** | Workflow hub catalog; cross-references all checked, no broken links | 2026-05-24 |
| 4D.2 | `flows/emergency/EMERGENCY_FLOW_LIVE_TRACKER_2026-05-19.md` | LIVING | **verified-clean** | Sprint tracker; 2026-05-19 update is current operational truth | 2026-05-24 |
| 4D.3 | `flows/emergency/MASTER_REFERENCE_FLOW_V1.md` | LIVING | **verified-clean** | Locked doctrine; matches current map-first/state-driven model | 2026-05-24 |
| 4D.4 | `flows/emergency/DEMO_MODE_COVERAGE_FLOW.md` | LIVING | **verified-clean** | 2026-05-10; matches `coverageStore.js` + `bootstrap-demo-ecosystem` edge function | 2026-05-24 |
| 4D.5 | `flows/emergency/WELCOME_AND_INTAKE_FLOW_MAP.md` | LIVING | **verified-clean** | Active; matches `WelcomeScreenOrchestrator` and current routes | 2026-05-24 |
| 4D.6 | `flows/emergency/workflow_map.md` | LIVING | **verified-clean** | Product-facing state spine still accurate | 2026-05-24 |
| 4D.7 | `flows/emergency/ambulance_and_bed_booking.md` | LIVING | **verified-clean** | 2026-04-07 audit; product model statement still applies | 2026-05-24 |
| 4D.8 | `flows/emergency/CHOOSE_HOSPITAL_PHASE_DOSSIER.md` | LIVING | **verified-clean** | Phase dossier; cross-checked references intact | 2026-05-24 |
| 4D.9 | `flows/emergency/LOCATION_SEARCH_MODAL_DOSSIER.md` | LIVING | **verified-clean** | Dossier referenced from LS passes; matches shipped state | 2026-05-24 |
| 4D.10 | `flows/emergency/MAP_FLOW_FINAL_POLISH_AUDIT_2026-04-20.md` | HISTORICAL | **done** | "Reconciliation 2026-05-24" banner already present from Pass 5 sweep | 2026-05-24 |

### 4E - Flows - Emergency Architecture pass plans (24 files)

All 24 files in `docs/flows/emergency/architecture/*.md` already carry the "Reconciliation 2026-05-24" banner pointing to `audit/RECONCILIATION_2026-05-24.md`, applied during the Pass 5 historical banner sweep.

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 4E.1 | `flows/emergency/architecture/README.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4E.2-4E.24 | All other `flows/emergency/architecture/*.md` (23 files) | HISTORICAL | **done** | Banner-covered; bulk verified | 2026-05-24 |

### 4F - Flows - Emergency Architecture subpacks (contact-dispatch + explore-care + location-truth)

All subpack pass files (10 CD + 14 EXP + 8 audits + 6 LOC) carry the "Reconciliation 2026-05-24" banner from the Pass 5 sweep. README files are current living docs.

| # | Scope | Class | Status | Completed |
|---:|---|---|---|---|
| 4F.1-4F.12 | All subpack files (contact-dispatch + explore-care + location-truth: ~40 files) | LIVING readmes + HISTORICAL passes | **done** | Banner-covered for HISTORICAL; READMEs verified clean | 2026-05-24 |

### 4G - Flows - Emergency (checklists + history + ux)

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 4G.1 | `flows/emergency/checklists/POST_BOOKING_UI_CHECKLIST.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4G.2 | `flows/emergency/history/MAP_VISITS_SYSTEM_AUDIT_V1.md` | HISTORICAL | **done** (banner) | 2026-05-24 |
| 4G.3 | `flows/emergency/history/MAP_VISIT_DETAIL_CONTENT_CONTRACT_V1.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4G.4 | `flows/emergency/history/VISITS_REQUEST_HISTORY_PLAN.md` | LIVING (plan) | **verified-clean** | Active supporting contract; data model still accurate | 2026-05-24 |
| 4G.5 | `flows/emergency/ux/COVERAGE_NOTICE_MODAL.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4G.6 | `flows/emergency/ux/MAP_THEME_SYSTEM.md` | LIVING | **verified-clean** | 2026-05-24 |

### 4H - Flows - Auth, Payment, Search

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 4H.1 | `flows/auth/login.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4H.2 | `flows/auth/register.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4H.3 | `flows/auth/REGISTRATION_UI_UX.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4H.4 | `flows/auth/workflow_map.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4H.5 | `flows/auth/OAUTH_TROUBLESHOOTING.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4H.6 | `flows/payment/payment.md` | LIVING | **verified-clean** | Stripe migration prompt; current product direction | 2026-05-24 |
| 4H.7 | `flows/payment/workflow_map.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4H.8 | `flows/payment/BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md` | LIVING (plan) | **done** | Closure note appended - Phase 2 client lane SHIPPED | 2026-05-24 |
| 4H.9 | `flows/search/SAVED_LOCATIONS_USER_FLOW.md` | LIVING | **verified-clean** | 2026-05-24 |

### 4I - Design / Product Design / Research / Algorithm / Deployment / Onboarding

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 4I.1 | `design/MAP_DESIGN_SYSTEM_OVERVIEW_V1.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.2 | `design/MINI_PROFILE_UI_DOCTRINE_V1.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.3 | `product_design/manifesto.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.4 | `product_design/ui_ux_bible.md` | LIVING | **verified-clean** | Core doctrine | 2026-05-24 |
| 4I.5 | `product_design/ANDROID_GLASS_PATTERN.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.6 | `product_design/SCREEN_CONSISTENCY_GUIDE.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.7 | `product_design/FAB_ANALYSIS_REVIEW.md` | LIVING | **verified-clean** | Retained - `FABContext.jsx` is live; doctrine still applies | 2026-05-24 |
| 4I.8 | `product_design/GLOBAL_FAB_IMPLEMENTATION_PLAN.md` | LIVING | **verified-clean** | Retained - companion to FAB_ANALYSIS_REVIEW | 2026-05-24 |
| 4I.9 | `product_design/marketing/MANUSCRIPT.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.10 | `product_design/marketing/STRATEGY.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.11 | `research/APPLE_MAPS_IPHONE_UI_REFERENCE.md` | REF | n/a | External reference |
| 4I.12 | `research/IOS_PWA.md` | REF | n/a | External reference |
| 4I.13 | `algorithm/EMERGENCY_COMMIT_GRAPH_DOSSIER.md` | LIVING | **verified-clean** | 2026-05-24 update; patent/trade-secret dossier current | 2026-05-24 |
| 4I.14 | `algorithm/EMERGENCY_COMMIT_GRAPH_FILING_PACK.md` | LIVING | **verified-clean** | Companion to dossier; current | 2026-05-24 |
| 4I.15 | `deployment/VERCEL_WEB_DEPLOYMENT.md` | LIVING | **verified-clean** | Matches `vercel.json` + `app.config.js` | 2026-05-24 |
| 4I.16 | `deployment/WEB_MAPS_SETUP.md` | LIVING | **verified-clean** | Matches Mapbox config | 2026-05-24 |
| 4I.17 | `deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md` | LIVING | **verified-clean** | 2026-05-24 |
| 4I.18 | `deployment/GOOGLE_PLAY_CLOSED_TESTING.md` | LIVING | **verified-clean** | 2026-05-22 update is current | 2026-05-24 |
| 4I.19 | `onboarding/Technical.md` | REMOVED | **n/a** | `docs/onboarding/` directory does not exist on HEAD; tracker row removed |
| 4I.20 | `payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` | REMOVED | **n/a** | File does not exist on HEAD; tracker row removed |

---

## Pass 5 â€” Reconciliation Notes on Historical Records

### 5A Â· `audit/` core (top-level)

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5A.1 | `audit/README.md` | LIVING | pending | |
| 5A.2 | `audit/AUDIT_CHECKLIST.md` | LIVING | pending | |
| 5A.3 | `audit/BUG_CLASSIFICATION_SYSTEM.md` | LIVING | pending | |
| 5A.4 | `audit/demo/DEMO_BOOTSTRAP_DUPLICATE_HOSPITAL_BUG_2026-05-10.md` | HISTORICAL | moved 2026-05-24 | Relocated from `audit/` root to `audit/demo/` (sibling to PASS docs) |
| 5A.5 | `archive/historical/DOCS_REPO_CLEANUP_REPORT_2026-05-19.md` | HISTORICAL | archived 2026-05-24 | Superseded by current sweep; moved to archive |
| 5A.6 | `audit/DOCS_AUDIT_2026-05-24.md` (this doc) | LIVING (tracker) | in_progress | Self-reference; updated continuously | |

### 5B Â· `audit/checkpoints/` + orchestrator refactor

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5B.1 | `audit/checkpoints/README.md` | LIVING | pending | |
| 5B.2 | `audit/checkpoints/FINAL_MIGRATION_SUMMARY.md` | HISTORICAL | pending | |
| 5B.3 | `audit/checkpoints/STACK_GUARDRAIL_RECONCILIATION_CHECKPOINT_2026-04-29.md` | HISTORICAL | pending | |

### 5C Â· `audit/demo/` (5 passes + README)

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5C.1 | `audit/demo/README.md` | LIVING | pending | |
| 5C.2 | `audit/demo/PASS_1..5_*.md` (5 files) | HISTORICAL | pending | Batch: closure notes | |

### 5D Â· `audit/emergency/`

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5D.1 | `audit/emergency/README.md` | LIVING | pending | |
| 5D.2 | `audit/emergency/EMERGENCY_CONTACTS_STATE_AUDIT_2026-04-29.md` | HISTORICAL | pending | |
| 5D.3 | `audit/emergency/EMERGENCY_CONTEXT_MODULARIZATION_PLAN.md` | HISTORICAL | pending | |
| 5D.4 | `audit/emergency/EMERGENCY_FLOW_FULL_CYCLE_AUDIT_2026-04-24.md` | HISTORICAL | pending | |
| 5D.5 | `audit/emergency/EMERGENCY_FLOW_STATE_SYNC_AUDIT_2026-04-24.md` | HISTORICAL | pending | |

### 5E Â· `audit/map/` (top-level â€” 20 files)

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5E.1 | `audit/map/README.md` | LIVING | pending | |
| 5E.2 | All other `audit/map/*.md` (19 files) | HISTORICAL | pending | Batch by topic: ambulance/marker Â· CTA/route-state Â· location-control Â· search-uiux Â· tracking Â· visit-detail | |

### 5F Â· `audit/map/checkpoints/`

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5F.1 | All `audit/map/checkpoints/*.md` (6 files) | HISTORICAL | pending | Batch | |

### 5G Â· `audit/map/explore-care/`

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5G.1 | `audit/map/explore-care/EXPLORE_CARE_DATA_AUDIT_2026-05-16.md` | HISTORICAL | pending | |
| 5G.2 | `audit/map/explore-care/PERMANENT_FIX_DESIGN_2026-05-16.md` | HISTORICAL | pending | |

### 5H Â· `audit/map/passes/`

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5H.1 | `audit/map/passes/AMBULANCE_3D_TELEMETRY_PASS.md` | HISTORICAL | pending | |
| 5H.2 | `audit/map/passes/MAP_ARCHITECTURE_PASS_PLAN_2026-04-25.md` | HISTORICAL | pending | |
| 5H.3 | `audit/map/passes/TRACKING_SHEET_FULL_SYSTEM_AUDIT_2026-05-20.md` | HISTORICAL | pending | |
| 5H.4 | `audit/map/passes/TRACKING_STATE_TIGHTENING_PASS_2026-05-19.md` | HISTORICAL | pending | |
| 5H.5 | `audit/map/passes/tracking-sheet-full-system-audit-2026-05-20/00..09_*.md` (10 files) | HISTORICAL | pending | Batch: single closure note (or one per file as time permits) | |

### 5I Â· `audit/map/search/`

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5I.1 | All `audit/map/search/*.md` (5 files) | HISTORICAL | pending | Batch | |

### 5J Â· `audit/payment/` Â· `audit/planning/` Â· `audit/screens/` Â· `audit/state/` Â· `audit/welcome/` Â· `audit/inventory/`

| # | Folder | Files | Status |
|---:|---|---:|---|
| 5J.1 | `audit/payment/` | 3 | pending â€” batch |
| 5J.2 | `audit/planning/` | 11 | pending â€” batch |
| 5J.3 | `audit/screens/` | 17 | pending â€” batch (8 comparison + 8 checkpoint + README) |
| 5J.4 | `audit/state/` | 5 | pending â€” batch |
| 5J.5 | `audit/welcome/` | 7 | pending â€” batch |
| 5J.6 | `audit/inventory/` | 1 (README only) | pending |

### 5K Â· `project_state/context/scc/` (56 SCC items)

| # | Scope | Status |
|---:|---|---|
| 5K.1 | All `SCC-001 â€¦ SCC-058_*.md` | pending â€” append one-line closure note where the SCC is closed; otherwise mark open | |
| 5K.2 | `project_state/context/scc/README.md` | LIVING | pending |

### 5L Â· `project_state/context/` (top-level ledgers + plans)

| # | File | Class | Status | Completed |
|---:|---|---|---|---|
| 5L.1 | `project_state/context/CURRENT_STATE.md` | LIVING | pending | |
| 5L.2 | `project_state/context/DEPRECATED.md` | LEDGER | pending | Verify head |
| 5L.3 | `project_state/context/HARDENING_CLOSURE_PLAN_2026-03-04.md` | HISTORICAL | pending | |
| 5L.4 | `project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md` | LEDGER | pending | Append-only; verify head |
| 5L.5 | `project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md` | LEDGER | pending | Append-only; verify head |

### 5M Â· Archive (19 files)

| # | Scope | Status |
|---:|---|---|
| 5M.1 | All `archive/historical/*.md` + `archive/legacy_specs/*.md` | pending â€” verify each has an archival notice pointing to its current replacement |

---

## Pass 6 â€” Archive Sweep + INDEX Sync

| # | Action | Status | Completed |
|---:|---|---|---|
| 6.1 | Move `project_state/CONTEXT_REVIEW.md` â†’ `archive/historical/` + notice | pending | |
| 6.2 | Move `project_state/QUICK_START.md` â†’ `archive/historical/` + notice | pending | |
| 6.3 | Move `project_state/repo.md` â†’ `archive/historical/` + notice | pending | |
| 6.4 | Resolve `console/*` (6 files): move to `ivisit-console` repo or archive here | pending | |
| 6.5 | Resolve `product_design/FAB_*` (2 files): keep or archive | pending | |
| 6.6 | Resolve `onboarding/Technical.md`: refresh or archive | pending | |
| 6.7 | Resolve `payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md`: shipped â†’ archive | pending | |
| 6.8 | Update `INDEX.md` to reflect all Pass 5/6 moves | pending | |
| 6.9 | Update `README.md` "Authority Order" to mention this tracker | pending | |
| 6.10 | Final mojibake scan on all touched files | pending | |

---

## Execution Log

> Append a one-line entry per session. Newest first.

| Date | Session | Pass(es) advanced | Files completed | Notes |
|---|---|---|---|---|
| 2026-05-24 | Cascade (S7) | 4 (complete) | 4B.2, 4B.3, 4C.2, 4C.3, 4C.4, 4C.5; verified-clean: 4A.1-4A.2, 4C.1, 4D.1-4D.9, 4G.x, 4H.x, 4I.x | Pass 4 fully closed. 217 docs across docs/ already carry "Reconciliation 2026-05-24" banners from Pass 5 sweep. Removed stale rows 4I.19 (onboarding/Technical.md - dir does not exist), 4I.20 (PAYMENT_XL - file does not exist). All Pass 4 rows now done or verified-clean. |
| 2026-05-24 | Cascade (S6) | 4 | 4A.3, 4A.4, 4B.1, 4B.4, 4C.6–4C.10, 4H.8 (8 docs) | Pass 4 batch closure: 6 shipped-plan / UX-pass docs verified against code and given closure notes; UX-D/UX-E already self-marked COMPLETE; 4B.1 line count drift noted as carryforward |
| 2026-05-24 | Cascade (S3) | 3 | 3.1 ARCHITECTURE.md rewrite (v2.0), 3.2 STORES_README expanded, 3.3 stores/README.md rewrite, 3.4 ARCHITECTURE_README refresh | Highest-drift architecture docs all closed. v1.1 ARCHITECTURE archived per protocol |
| 2026-05-24 | Cascade (S2) | 2 | 2.1 README, 2.3 MASTER_BLUEPRINT, 2.4 CONTRIBUTING, 2.5 GUARDRAILS | Pass 2 closed except 2.2 INDEX (deferred to Pass 6) |
| 2026-05-24 | Cascade (initial) | 1 | Inventory + classification | Tracker created; 356 files cataloged |

---

## Section D â€” Inventory totals

| Folder | Files | Living | Living-Drifted | Historical | Stale / TBD | Ref / Ledger |
|---|---:|---:|---:|---:|---:|---:|
| root | 6 | 4 | 1 | 0 | 0 | 1 (rules.json) |
| algorithm | 2 | 2 | 0 | 0 | 0 | 0 |
| architecture | 31 | ~22 | 2 | ~7 | 0 | 0 |
| archive | 19 | 0 | 0 | 19 | 0 | 0 |
| audit | 137 | 6 | 0 | 131 | 0 | 0 |
| console | 6 | 0 | 0 | 0 | 6 | 0 |
| deployment | 4 | 4 | 0 | 0 | 0 | 0 |
| design | 2 | 2 | 0 | 0 | 0 | 0 |
| flows | 99 | ~38 | 0 | ~61 | 0 | 0 |
| onboarding | 1 | 0 | 0 | 0 | 1 | 0 |
| payment | 1 | 0 | 0 | 0 | 1 | 0 |
| product_design | 8 | 6 | 0 | 0 | 2 | 0 |
| project_state | 61 | ~3 | 0 | ~52 | 3 | 3 |
| research | 2 | 0 | 0 | 0 | 0 | 2 |
| **Total** | **356** | **~87** | **3** | **~270** | **~13** | **6** |

---

> **End of tracker scaffold.** Pass 2 execution begins below the next horizontal rule once started. Each subsequent session updates the tables above + appends a row to the Execution Log.


---

## Session 4 â€” Bulk Reconciliation (2026-05-24)

**Approach:** Created comprehensive [RECONCILIATION_2026-05-24.md](./RECONCILIATION_2026-05-24.md) covering every historical folder with per-doc status. Prepended uniform banner to **216 historical .md files** with correctly-computed relative paths via PowerShell sweep.

**Pass 3 closures (individual reconciliation notes):**

- 3.5 `architecture/state/GOLD_STANDARD_STATE_ROADMAP.md` â€” banner clarifies EmergencyContext is thin orchestrator, not deleted ?
- 3.6 `architecture/refactoring/REFACTORING_BIBLE.md` â€” ProfileScreen status corrected (477 B = resolved) ?
- 3.7 `architecture/refactoring/STASH_AUDIT.md` â€” reconciliation banner ?
- 3.8 `architecture/refactoring/TRACKING_SHEET_LEARNINGS.md` â€” acknowledges integration into AGENTS.md ?
- 3.9 `architecture/refactoring/EDGE_FUNCTION_PHASE_8_*` â€” active-plan banner ?
- 3.10 `architecture/refactoring/IVISIT_PHASE_0_TO_7_*` â€” active-plan banner ?
- 3.11 `architecture/refactoring/CHECKPOINT_PRE_PROVIDER_DETAIL.md` â€” shipped-status banner ?
- 3.14 `architecture/emergency/EMERGENCY_STATE_REFACTOR.md` â€” Phase 1 ? Phase 6+ banner ?
- 3.15 `architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md` â€” 5-layer verified ?
- 3.12 / 3.13 `architecture/roadmap/*` â€” deferred (no drift detected on quick read)

**Pass 5 bulk closures (banner sweep):**

| Folder | Files banner-applied |
|---|---:|
| `audit/` (root) | 2 |
| `audit/checkpoints/` | 2 |
| `audit/demo/` (passes) | 5 |
| `audit/emergency/` | 4 |
| `audit/map/` (top) | 19 |
| `audit/map/checkpoints/` | 6 |
| `audit/map/explore-care/` | 2 |
| `audit/map/passes/` (incl. sub) | 14 |
| `audit/map/search/` | 5 |
| `audit/payment/` | 2 |
| `audit/planning/` | 11 |
| `audit/screens/` | 17 |
| `audit/state/` | 4 |
| `audit/welcome/` | 6 |
| `flows/emergency/architecture/` (V1 pass plans) | 8 |
| `flows/emergency/architecture/contact-dispatch/passes/` (CD-) | 10 |
| `flows/emergency/architecture/explore-care/passes/` (EXP-) | 14 |
| `flows/emergency/architecture/location-truth/passes/` (LOC-) | 6 |
| `flows/emergency/architecture/location-truth/audits/` (AUDIT_) | 8 |
| `flows/emergency/` (1 historical) | 1 |
| `flows/emergency/history/` (1 historical) | 1 |
| `project_state/context/scc/` (SCC-) | 56 |
| **Total banner-applied** | **216** |

**Pass 6 closures:**

- 6.1 `project_state/CONTEXT_REVIEW.md` ? `archive/historical/PROJECT_STATE_CONTEXT_REVIEW_2026-01-25.md` ?
- 6.2 `project_state/QUICK_START.md` ? `archive/historical/PROJECT_STATE_QUICK_START_2026-01-11.md` ?
- 6.3 `project_state/repo.md` ? `archive/historical/PROJECT_STATE_REPO_2026-01-11.md` ?
  (All three carry archival notices pointing to current docs)
- 6.8 `INDEX.md` head + archive table updated (encoding repaired UTF-8 NoBOM)
- 6.10 Mojibake scan: 0 encoding/BOM issues across all touched files. **Pre-existing mojibake in 3 location-truth docs** (`DOSSIER_LOCATION_HARDENING_V1.md`, `README.md`, `passes/LOC-3_LOCATION_RECOVERY.md`) flagged for next sprint â€” not introduced by this sweep.

**Pass 6 still pending:**

- 6.4 Resolve `console/` (6 files): move to `ivisit-console` repo or archive â€” **needs user decision**
- 6.5 Resolve `product_design/FAB_*` (2 files): `FABContext.jsx` exists ? keep as living, mark in next session
- 6.6 Resolve `onboarding/Technical.md`: refresh or archive â€” **needs user decision**
- 6.7 Resolve `payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md`: verify shipped ? archive if so
- 6.9 `README.md` Authority Order section â€” add reference to this tracker

**Pass 4 status:** Most living feature-area docs (location/map/UX/flows/auth/payment) untouched by this session. The reconciliation file covers them at folder level; individual verify-and-update is the next session's work. Use the tracker rows in Pass 4 as the resume queue.

**Files modified this session: 226+** (216 banners + 10 individual edits + 3 moves + INDEX + tracker + RECONCILIATION + new ARCHITECTURE + STORES_README â€”2 + ARCHITECTURE_README + archival notice on v1.1)


---

## Session 5 â€” Tree Cleanup + Mojibake Repair (2026-05-24)

**Doc-tree violations resolved (top-level folders 13 â€” 9):**

| Removed/relocated | Action |
|---|---|
| `docs/console/` (6 files) | Archived to `archive/historical/console/` with notice (cross-repo material for `ivisit-console`) |
| `docs/onboarding/Technical.md` | Moved to `product_design/WELCOME_ONBOARDING_TECHNICAL_V1.md` |
| `docs/payment/PAYMENT_XL_CONTEXT_ISLAND_PLAN.md` | Moved to `architecture/ux/passes/` |
| `docs/design/` (2 files) | Merged into `docs/product_design/` |

**Encoding gate (final scan across all 376 `.md` files):**

- 0 UTF-16 / BOM issues
- 0 mojibake instances
- All files UTF-8 without BOM

**Mojibake repairs:**

- Fixed pre-existing replacement-character mojibake in 3 `location-truth` docs (DOSSIER, README, LOC-3) by restoring intended severity/status emoji.
- Fixed PowerShell-introduced em-dash mojibake in this tracker and `RECONCILIATION_2026-05-24.md`.

**INDEX.md updates:**

- Design / Product section expanded to list all 11 `product_design/` files (was 3-line stub)
- Archive table extended with the moved `console/` folder

**RECONCILIATION_2026-05-24.md updates:**

- Section Y appended with full Tree Cleanup record (folders removed, files moved, mojibake repaired)

**Final docs/ folder count: 9** (algorithm, architecture, archive, audit, deployment, flows, product_design, project_state, research). All single-file orphan folders eliminated. Cross-repo orphans archived.
