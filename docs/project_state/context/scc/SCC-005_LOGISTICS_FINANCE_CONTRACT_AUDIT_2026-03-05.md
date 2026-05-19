# SCC-005 Logistics + Finance Contract Audit (2026-03-05)

## Objective
Audit `0003_logistics` and `0004_finance` contracts against runtime app/console usage and mutation authority (RPC + trigger paths).

## Scope
- Schema pillars:
  - `supabase/migrations/20260219000300_logistics.sql`
  - `supabase/migrations/20260219000400_finance.sql`
- Related mutation pillars:
  - `supabase/migrations/20260219000800_emergency_logic.sql`
  - `supabase/migrations/20260219000900_automations.sql`
  - `supabase/migrations/20260219010000_core_rpcs.sql`
- Runtime evidence:
  - `docs/audit/static_supabase_usage_2026-03-02.json`
  - `docs/audit/rpc_dependency_graph_2026-03-02.json`
  - `docs/audit/ui_db_parity_matrix_2026-03-02.json`
  - `docs/audit/live_schema_inventory_2026-03-02.json`

## Canonical Table Contracts (Owner Pillars)

### Logistics (`0003_logistics`)
- `ambulances` (`...00300_logistics.sql:5`)
- `emergency_requests` (`...00300_logistics.sql:31`)
- `visits` (`...00300_logistics.sql:127`)
- `emergency_status_transitions` (status transition audit table in logistics pillar)

### Finance (`0004_finance`)
- `organization_wallets` (`...00400_finance.sql:5`)
- `patient_wallets` (`...00400_finance.sql:15`)
- `ivisit_main_wallet` (`...00400_finance.sql:25`)
- `wallet_ledger` (`...00400_finance.sql:33`)
- `payment_methods` (`...00400_finance.sql:46`)
- `payments` (`...00400_finance.sql:58`)
- `insurance_policies` (`...00400_finance.sql:78`)
- `insurance_billing` (`...00400_finance.sql:92`)

## Writer Authority Map (High-Impact Paths)

### Emergency + logistics writes
- `create_emergency_v4` inserts/links request + visit + payment (`...00800_emergency_logic.sql:441`).
- `approve_cash_payment` mutates payment/request lifecycle (`...00800_emergency_logic.sql:587` and wrapper in `...0100_core_rpcs.sql:2492`).
- `decline_cash_payment` mutates payment/request lifecycle (`...00800_emergency_logic.sql:792` and wrapper in `...0100_core_rpcs.sql:2711`).
- `process_cash_payment_v2` finance/emergency mutation path (`...00800_emergency_logic.sql:898`).
- Console operators mutate/dispatch through:
  - `console_update_emergency_request` (`...0100_core_rpcs.sql:1484`)
  - `console_dispatch_emergency` (`...0100_core_rpcs.sql:1619`)
- Guard/transition triggers:
  - `trg_enforce_emergency_status_write_path` (`...00800_emergency_logic.sql:1789`)
  - `trg_log_emergency_status_transition` (`...00800_emergency_logic.sql:1893`)
  - `trg_validate_emergency_status_transition` (`...00800_emergency_logic.sql:1947`)
  - `on_emergency_start_dispatch` automation (`...00900_automations.sql:228`)
  - `on_emergency_completed` automation (`...00900_automations.sql:162`)

### Finance writes
- Canonical wallet payment logic in `process_wallet_payment` (`...00400_finance.sql:146`) with wrapper surface also present in `...0100_core_rpcs.sql:769`.
- Payment completion trigger:
  - `on_payment_completed` (`...00400_finance.sql:248`).
- Cash eligibility/ops billing surfaces:
  - `check_cash_eligibility` (`...0100_core_rpcs.sql:752`).

## Runtime Touchpoints (Service Surfaces)
Counts are from static runtime usage artifacts.

| Table | App Service Refs | Console Service Refs |
|---|---:|---:|
| `ambulances` | 1 | 5 |
| `emergency_requests` | 3 | 5 |
| `visits` | 1 | 1 |
| `payments` | 1 | 0 |
| `patient_wallets` | 1 | 0 |
| `organization_wallets` | 1 | 2 |
| `ivisit_main_wallet` | 0 | 1 |
| `payment_methods` | 1 | 0 |
| `wallet_ledger` | 1 | 1 |
| `insurance_policies` | 4 | 0 |
| `insurance_billing` | 0 | 0 |

## Findings

### F1 (High): `emergency_requests` console type parity drift remains large
- Evidence: `ui_db_parity_matrix` shows console missing live columns (`assigned_doctor_id`, `created_at`, `destination_location`, `doctor_assigned_at`) while still carrying stale fields (`bed_type`, `bed_count`, `payment_method_id`, `shared_data_snapshot`, etc.).
- Risk: action rendering and payload assumptions can diverge from actual DB contract.

### F2 (High): `payments` and wallet-adjacent type drift in console/app contracts
- Evidence:
  - `payments`: console missing core columns and carrying extras not in live table.
  - `wallet_ledger`: console expects extra fields while missing `external_reference`.
  - `payment_methods`: app missing multiple live columns (`expiry_month`, `expiry_year`, `is_active`, `metadata`, `organization_id`, `updated_at`).
- Risk: incomplete UI render, brittle mutation payloads, and reporting inconsistencies.

### F3 (Medium): duplicate function names across owner and facade modules
- Evidence: `approve_cash_payment`, `decline_cash_payment`, `process_wallet_payment` and other emergency operations are defined in both domain and `core_rpcs`.
- Risk: semantic drift and uncertainty over canonical authority.

### F4 (Medium): logistics audit table visibility gap in live snapshot artifact
- Evidence: `emergency_status_transitions` is defined in logistics migration but absent from `live_schema_inventory_2026-03-02.json`.
- Risk: artifact staleness can hide transition-audit regressions if not refreshed.

### F5 (Low): runtime usage concentration on a small table set
- Evidence: the majority of logistics/finance runtime behavior concentrates on `emergency_requests`, `ambulances`, `payments`, wallet tables, and `insurance_policies`.
- Impact: hardening should prioritize these first before lower-touch tables.

## Remediation Queue (Next SCC Candidates)
1. Reconcile console/app table type contracts for logistics+finance high-surface tables.
2. Decide canonical authority for duplicate RPC names (`domain` vs `core_rpcs` wrappers) and document/enforce it.
3. Refresh live inventory artifact and add a deterministic check that verifies presence of logistics transition audit tables.
4. Add targeted contract tests for `emergency_requests`, `payments`, and wallet tables as a dedicated matrix lane.
