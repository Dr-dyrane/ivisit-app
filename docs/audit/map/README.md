---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Map & Tracking Audits

Audits for map screen, tracking sheet, visit detail, routing, and related flows.

## Files

### Search Audits (`search/`)

Unified search sheet, saved locations, and location-search integration audits.

- `search/SEARCH_SHEET_APPLE_ALIGNMENT_AUDIT_2026-05-07.md` - Comprehensive audit for search sheet UI/UX alignment with Apple HIG and iVisit UI Rules v2.1. Includes user flow analysis for location-off, permission-denied, and first-timer scenarios.
- `search/SEARCH_SHEET_APPLE_ALIGNMENT_MANIFEST_2026-05-07.json` - Machine-readable implementation manifest with 3-phase plan (Foundation/Enhance/Future), deliverables, and user flow scenarios.
- `search/SEARCH_SHEET_APPLE_ALIGNMENT_VALIDATION_2026-05-08.md` - Validation report confirming audit soundness against REFACTORING_GUARDRAILS.md, docs authority hierarchy, and historical audit patterns. Grade: A+ (9.9/10).
- `search/SAVED_LOCATIONS_DB_AUDIT_2026-05-08.md` - Database vs Zustand analysis for saved locations. Recommends `locationStore` extension over DB migration.
- `search/LOCATION_ARCHITECTURE_AUDIT_2026-05-08.md` - 5-layer location flow architecture audit. Maps GPS â†’ Search â†’ Pickup flow.
- `search/SEARCH_ARCHITECTURE_DEEP_AUDIT_2026-05-08.md` - Complete search state flow from context â†’ model â†’ UI. Recommends mode chip removal.

### Explore Care (2026-05-16)

- `EXPLORE_CARE_IMPLEMENTATION_CHECKPOINT_2026-05-16.md` - Full wiring checkpoint for EXPLORE-CARE-01 (EXP-1â€“EXP-10 + DB + Nearby UI + MapScreen wiring). Records all passes, atom additions, `extraMarkers` prop, TanStack Query cache sharing, migration hygiene, and edge function deploy fix.

### Service Sheet Simplification (2026-05-19)

- `IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md` - Problem statement, actual service-flow audit, feasibility decisions, and pass plan for simplifying iVisit's perceived service UX without collapsing critical map-sheet runtime responsibilities.
- `IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md` - Current flow matrix for Welcome, map sheets, location management, profile/auth overlays, emergency decisions, Explore Care, tracking, history, and Book Visit before simplification passes.

### Map & Location Audits

- `MAP_PASS18_WORKTREE_CHECKPOINT_2026-05-07.md` - Mixed-owner worktree checkpoint for Pass 18 with implemented-vs-needed status and deterministic staging buckets.
- `MAP_PASS18_WORKTREE_CHECKPOINT_2026-05-07.json` - Machine-readable Pass 18 worktree checkpoint and git-update bucket manifest.
- `NEAREST_HOSPITAL_SELECTION_AUDIT_2026-05-07.md` - Audit for why a far hospital can beat a closer Lagos hospital and why current "nearby" semantics are false.
- `NEAREST_HOSPITAL_SELECTION_MANIFEST_2026-05-07.json` - Machine-readable root-cause and fix-order manifest for local-nearest hospital truth.
- `PICKUP_CONTROL_AND_QUOTE_ADOPTION_AUDIT_2026-05-07.md` - Audit for pickup edit discoverability, return-contract needs, and incomplete billing-quote adoption in live `/map` phases.
- `PICKUP_CONTROL_AND_QUOTE_ADOPTION_MANIFEST_2026-05-07.json` - Machine-readable manifest for quote-adoption gaps and pickup-edit state requirements.
- `MAP_LOCATION_NEARBY_AND_ROUTE_FAILURE_AUDIT_2026-05-07.md` - Failure audit for location-off deadlock, broad/far hospital discovery, route API invalid-input leakage, and nearby-selector truth gaps.
- `MAP_LOCATION_NEARBY_AND_ROUTE_FAILURE_MANIFEST_2026-05-07.json` - Machine-readable manifest for the current map fine-tuning defects and fix order.
- `HOSPITAL_MARKER_RENDER_RULE_2026-05-06.md` - Cross-platform hospital-marker fix rule: web uses imageSize, native uses PNG bitmap size.
- `HOSPITAL_MARKER_SIZE_CHECKPOINT.json` - Machine-readable checkpoint and rollback ledger for the current hospital-marker contract.
- `LOCATION_CONTROL_AND_MANUAL_PICKUP_AUDIT_2026-05-07.md` - Canonical location truth audit for location-off honesty, manual pickup UX, and nearest-hospital refresh.
- `LOCATION_CONTROL_REMEDIATION_MANIFEST_2026-05-07.json` - Machine-readable manifest for the live `/map` location-control remediation pass.
- `MAP_TOP_LEFT_CONTROL_PRE_2026-05-03.md` - MapTopLeftControl pre-implementation audit (floating canvas circle, guest back + auth avatar).
- `MAP_TOP_LEFT_CONTROL_POST_2026-05-03.md` - MapTopLeftControl post-implementation record.
- `MAP_CTA_STATE_CONTRACT_AUDIT_2026-05-02.md` - CTA state contract audit.
- `MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md` - Entity render state checkpoint.
- `MAP_ROUTE_STATE_HARDENING_CHECKPOINT_2026-04-29.md` - Route state hardening.
- `MAP_ROUTE_STATE_IMPLEMENTATION_CHECKPOINT_2026-04-29.md` - Route state implementation.
- `DEMO_BOOTSTRAP_BLOAT_REMEDIATION_CHECKPOINT_2026-05-01.md` - Demo bootstrap bloat remediation.
- `TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md` - Tracking sheet phase audit.
- `VISIT_DETAIL_PHASE_AUDIT_2026-04-27.md` - Visit detail phase audit.
- `PRE_TRACKING_PHASE_AUDIT_2026-04-27_FINAL.md` - Pre-tracking phase audit.
- `LAYOUT_RUNTIME_SHELL_AUDIT_2026-04-24.md` - Layout runtime shell audit.
