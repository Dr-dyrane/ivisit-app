# SCC-004 Modular Schema Bible Baseline (2026-03-05)

## Objective
Create a modular, operational schema bible that links:
- core migration ownership,
- app service touchpoints,
- console service touchpoints,
- and change-control workflow.

This is the baseline step for scaling schema hardening without treating the entire SQL surface as one monolith.

## Scope Reviewed
- App services:
  - `services/*` (runtime Supabase table and RPC usage)
- Console services (artifact-derived from sibling repo scan):
  - `frontend/src/services/*`
- Core migrations:
  - `supabase/migrations/20260219000000_infra.sql`
  - `supabase/migrations/20260219000100_identity.sql`
  - `supabase/migrations/20260219000200_org_structure.sql`
  - `supabase/migrations/20260219000300_logistics.sql`
  - `supabase/migrations/20260219000400_finance.sql`
  - `supabase/migrations/20260219000500_ops_content.sql`
  - `supabase/migrations/20260219000600_analytics.sql`
  - `supabase/migrations/20260219000700_security.sql`
  - `supabase/migrations/20260219000800_emergency_logic.sql`
  - `supabase/migrations/20260219000900_automations.sql`
  - `supabase/migrations/20260219010000_core_rpcs.sql`

## Evidence Inputs
- `docs/audit/static_supabase_usage_2026-03-02.json`
- `docs/audit/rpc_dependency_graph_2026-03-02.json`
- `docs/audit/live_schema_inventory_2026-03-02.json`
- `docs/audit/ui_db_parity_matrix_2026-03-02.json`

## Delivered Artifacts
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`
  - module ownership inventory,
  - table owner mapping,
  - runtime touchpoint summary,
  - RPC ownership model and duplicate-name drift watchlist,
  - operational change-control rules.

## Key Baseline Findings
1. The 11-pillar model is intact and can serve as the module boundary contract.
2. Runtime touchpoints are concentrated in a small set of high-impact tables (`profiles`, `hospitals`, `emergency_requests`, `ambulances`, `visits`, `payments`, wallet tables).
3. Several function names are defined in both domain modules and `core_rpcs`, which increases drift risk unless wrapper intent is explicit and enforced.
4. Unresolved runtime RPC references exist in artifact data and should be tracked as cleanup candidates (`create_emergency_with_payment`, `function_exists`, `get_system_stats`, `get_table_structure`, `validate_payment_method`).

## Decisions Recorded
1. `MODULE_SCHEMA_BIBLE.md` is now the canonical modular index.
2. Owner module is authoritative for table contract changes.
3. `core_rpcs` should remain an API facade layer where possible, not a competing business-logic owner.
4. Future schema work should be opened as SCC slices by module/domain (instead of broad all-in-one changes).

## Recommended Next Slice Candidates
- Normalize duplicated RPC definitions between `emergency_logic` and `core_rpcs`.
- Reconcile runtime references to non-live/legacy surfaces flagged in audit artifacts.
- Add module-by-module contract tests for highest-risk tables first (`emergency_requests`, `visits`, `payments`, wallet tables).
