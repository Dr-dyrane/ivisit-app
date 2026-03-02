# iVisit Full System Autonomous Reconstruction Report
Date: 2026-03-02
Scope: ivisit-app + ivisit-console + linked Supabase project (public schema)

## 1) Architectural Audit Report

### 1.1 Indexed system inventory (live)
- Tables: 40
- Columns: 456
- Foreign keys: 46
- Indexes: 91
- RLS policies: 66
- Triggers: 58
- Public routines: 829
- Realtime publication tables: 1 (`access_requests` only)

Source artifacts:
- `docs/audit/live_schema_inventory_2026-03-02.json`
- `docs/audit/static_supabase_usage_2026-03-02.json`
- `docs/audit/ui_db_parity_matrix_2026-03-02.json`
- `docs/audit/type_parity_diff_2026-03-02.json`
- `docs/audit/schema_drift_analysis_2026-03-02.json`
- `docs/audit/orphaned_logic_inventory_2026-03-02.json`
- `docs/audit/rpc_dependency_graph_2026-03-02.json`
- `docs/audit/permission_exposure_surface_map_2026-03-02.json`
- `docs/audit/flow_dependency_graph_2026-03-02.json`
- `docs/audit/trigger_duplication_inventory_2026-03-02.json`
- `docs/audit/deterministic_emergency_state_model_2026-03-02.json`

### 1.2 Emergency lifecycle trace (actual)
User submit -> `create_emergency_v4` -> `emergency_requests` + `payments` write -> `auto_assign_driver` trigger path -> updates to `emergency_requests` + `ambulances` -> realtime subscriptions in mobile/console -> driver/location updates -> completion/cancel path -> visit/audit side effects.

### 1.3 Structural failures detected
1. Realtime propagation is structurally broken for core entities.
- Runtime listens on 17 tables, publication contains only `access_requests`.

2. State machine is non-deterministic/invalid in current SQL surface.
- `discharge_patient` writes `status='discharged'`, but table status check does not allow `discharged`.

3. Auto-dispatch has race exposure.
- `auto_assign_driver` selects first available ambulance without row-level locking.

4. Console performs direct writes to `emergency_requests` despite restrictive update policy.
- Direct `.update()`/`.delete()` paths bypass RPC boundary and depend on caller role/RLS luck.

5. Orphaned logic references non-live relations in runtime.
- `available_hospitals`, `hospital_import_logs`, `hospital_rooms`, `search_selections`, `trending_searches_view`, plus runtime reference classification for `images` as relation.

6. Duplicate trigger execution exists on multiple finance/notification tables.
- Double stamp triggers on `notifications`, `organization_wallets`, `patient_wallets`, `payments`.

7. Permission surface is over-broad.
- Table grants show `anon/authenticated` write privileges across all 40 public tables; posture relies almost entirely on RLS.
- Security definer routine execution is broadly granted, including `exec_sql`.

8. Query/index mismatch for realtime/dispatch workloads.
- Critical query columns (`emergency_requests.hospital_id/status/created_at`, `ambulances.hospital_id/status`, `payments.emergency_request_id`, `visits.request_id`) lack targeted non-PK indexes in live inventory.

9. Type and schema drift persists between live DB and app/console TS types.
- Console types include removed tables and stale columns; app types miss live columns in key tables.

## 2) Risk Prioritization Matrix

| ID | Severity | Area | Failure Mode | Impact | Priority Fix |
|---|---|---|---|---|---|
| R1 | P0 | Realtime | Publication excludes subscribed tables | Silent non-delivery, stale UI, ghost states | Add required tables to `supabase_realtime` publication and verify CDC e2e |
| R2 | P0 | State | `discharge_patient` writes disallowed state | Runtime errors or hidden failed updates | Replace with canonical transition (`arrived/in_progress` -> `completed` for bed flow) |
| R3 | P0 | Dispatch | `auto_assign_driver` no locking/idempotency guard | Double assignment / ghost drivers under concurrency | Lock candidate ambulance row (`FOR UPDATE SKIP LOCKED`), idempotent guard |
| R4 | P0 | AuthZ | Console direct writes conflict with RLS | Dispatch/complete/delete failures by role | Move all emergency mutations behind vetted RPCs |
| R5 | P0 | Data Surface | Runtime references non-live tables/views | Hard failures / dead code paths | Remove/replace orphaned references and align schema/types |
| R6 | P1 | Triggering | Duplicate stamp triggers on same table/event | duplicate side effects / sequence skew | Keep one trigger per table/action; drop duplicates |
| R7 | P1 | Security | Broad table + function execute grants | High blast radius if policy/function drift | Reduce grants, enforce allowlisted mutator RPC roles |
| R8 | P1 | Performance | Missing secondary indexes on hot predicates | Dispatch latency, realtime lag under load | Add concurrent indexes for emergency/ambulance/payment lookup paths |
| R9 | P1 | Contract | Type drift app/console vs live | UI contradiction, bad assumptions, runtime bugs | Regenerate DB types from live schema and enforce CI drift gate |
| R10 | P2 | Product UX | Mixed fallback/simulation logic in emergency flows | Jitter and non-canonical UX | Canonical state hydration + optimistic reconciliation rules |

## 3) Refactor / Restructuring Plan

### Phase A: Contract Lock (P0)
1. Freeze emergency mutation surface to RPCs only.
2. Introduce canonical transition RPC `transition_emergency_status(p_request_id, p_next_status, p_reason, p_source)`.
3. Patch invalid transition writers (`discharge_patient`, direct console writes) to call transition RPC.
4. Enable realtime publication for all subscribed emergency-path tables.

Exit criteria:
- No direct `emergency_requests` updates/deletes from UI code.
- All transition writes pass transition-log checks.
- Realtime messages observed for emergency + ambulance + payments in both app and console.

### Phase B: Dispatch Determinism (P0/P1)
1. Replace `auto_assign_driver` selection with row-locked candidate acquisition.
2. Add idempotent guards to prevent re-assignment when responder/ambulance already set.
3. Move ambulance status mutation into same transaction path.
4. Add explicit failure status/queue for unassigned dispatch attempts.

Exit criteria:
- No duplicate ambulance assignment in concurrent load tests.
- `emergency_requests` and `ambulances` state transitions remain atomic.

### Phase C: AuthZ/RLS Hardening (P1)
1. Narrow table grants and function execute grants.
2. Rework policies to least privilege by actor role and org scope.
3. Add explicit role checks inside mutating SECURITY DEFINER RPCs.

Exit criteria:
- Unauthorized role matrix cannot mutate out-of-scope entities.
- Admin/dispatcher/provider actions succeed only through approved RPCs.

### Phase D: Drift + Runtime Cleanup (P1)
1. Remove orphaned table/view references from runtime.
2. Regenerate types in app and console from live schema.
3. Add CI checks for type parity + RPC existence.

Exit criteria:
- 0 runtime references to non-live relations.
- 0 prod RPC calls unresolved in live schema.

### Phase E: Mobile and Console Cohesion (P2)
1. Canonical cache invalidation and optimistic reconciliation rules.
2. Reduce render surface for emergency cards/map markers.
3. Ensure stale data banners and degraded-mode behaviors are deterministic.

Exit criteria:
- No contradictory emergency status rendering between mobile and console.
- Stable frame times during active realtime updates.

## 4) RPC Reconciliation Document

### 4.1 Runtime RPC inventory
- Runtime RPCs detected: 57
- Unresolved RPC names: 5 (`create_emergency_with_payment`, `function_exists`, `get_system_stats`, `get_table_structure`, `validate_payment_method`)
- Unresolved production-path RPCs: 0

### 4.2 Reconciliation decisions
1. Keep runtime production RPC surface as source of truth.
2. Mark unresolved RPCs as test/archive-only and prevent promotion to runtime code.
3. Enforce mutation via approved RPC set for emergency domain:
- `create_emergency_v4`
- `approve_cash_payment`
- `decline_cash_payment`
- `complete_trip`
- `cancel_trip`
- `cancel_bed_reservation`
- `transition_emergency_status` (new)
- `assign_ambulance_to_emergency` (if retained, behind transition checks)

### 4.3 Direct-write replacement map
- Console `emergencyResponseService` direct updates -> replace with `transition_emergency_status` + `assign_ambulance_to_emergency`.
- Console `EmergencyRequestModal` edit/update/delete -> replace with admin RPC wrappers enforcing org scope.
- Console bulk delete -> replace with soft-cancel RPC (hard delete disallowed in prod path).

## 5) RLS Correction Proposals

### 5.1 Emergency requests
Current:
- SELECT: user own + org-admin hospital scope (+ admin)
- UPDATE: user own only
- INSERT: user own

Proposed:
1. Remove direct table UPDATE/DELETE reliance from clients.
2. Keep end-user INSERT/SELECT minimal.
3. Add role-scoped mutator RPCs with in-function assertions:
- dispatcher/org_admin can transition requests within own org hospitals.
- drivers can update only responder telemetry for assigned requests.
- admin can perform audited override operations.
4. Add WITH CHECK on status transitions through RPC only (table UPDATE not granted to client roles).

### 5.2 Ambulances
1. Replace broad public read with role-sensitive projection if PII/operational details included.
2. Constrain writes to org scope and assigned driver scope (status/location only for assigned unit).

### 5.3 Payments and wallets
1. Keep SELECT scoped by user/org/admin.
2. Ensure no direct client write grants; mutation through payment webhooks/RPCs only.
3. Add immutable ledger constraints at DB layer.

### 5.4 Security definer controls
1. Add explicit role and scope checks in all mutating SECURITY DEFINER functions.
2. Revoke execute on high-risk maintenance functions from `anon/authenticated` (including `exec_sql`).
3. Keep administrative utilities service-role only.

## 6) Non-Destructive DB Diff Plan

```sql
-- A) Deterministic transition log
create table if not exists public.emergency_transition_log (
  id uuid primary key default gen_random_uuid(),
  emergency_request_id uuid not null references public.emergency_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid,
  actor_role text,
  source text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- B) Canonical transition function (new)
-- create or replace function public.transition_emergency_status(...)
-- validates allowed transition graph + writes transition log atomically

-- C) Fix invalid state writer
create or replace function public.discharge_patient(request_uuid text)
returns boolean as $$
begin
  -- canonical bed discharge maps to completed
  update public.emergency_requests
  set status='completed', updated_at=now()
  where id=request_uuid::uuid and service_type='bed' and status in ('arrived','accepted','in_progress');
  return found;
end;
$$ language plpgsql security definer;

-- D) Dispatch race fix (lock selection)
-- in auto_assign_driver():
-- select id, profile_id from public.ambulances
-- where hospital_id = NEW.hospital_id and status='available'
-- order by created_at asc
-- for update skip locked
-- limit 1;

-- E) Remove duplicate triggers (non-destructive)
drop trigger if exists stamp_ntf_display_id on public.notifications;
drop trigger if exists stamp_organization_wallet_display_id on public.organization_wallets;
drop trigger if exists stamp_patient_wallet_display_id on public.patient_wallets;
drop trigger if exists stamp_payment_display_id on public.payments;

-- F) Realtime publication repair
alter publication supabase_realtime add table
  public.emergency_requests,
  public.ambulances,
  public.hospitals,
  public.payments,
  public.visits,
  public.notifications,
  public.health_news,
  public.service_pricing,
  public.room_pricing,
  public.support_tickets,
  public.organizations,
  public.profiles,
  public.doctors,
  public.user_activity,
  public.insurance_policies;

-- G) Hot-path indexes (concurrently in separate migration tx blocks)
create index concurrently if not exists idx_emergency_requests_status on public.emergency_requests(status);
create index concurrently if not exists idx_emergency_requests_hospital_id on public.emergency_requests(hospital_id);
create index concurrently if not exists idx_emergency_requests_created_at on public.emergency_requests(created_at desc);
create index concurrently if not exists idx_ambulances_hospital_status on public.ambulances(hospital_id, status);
create index concurrently if not exists idx_payments_emergency_request_id on public.payments(emergency_request_id);
create index concurrently if not exists idx_visits_request_id on public.visits(request_id);
```

## 7) Deterministic Emergency State Model

Canonical states:
- `pending_approval`
- `payment_declined` (terminal)
- `in_progress`
- `accepted`
- `arrived`
- `completed` (terminal)
- `cancelled` (terminal)

Disallowed state:
- `discharged`

Transition invariants:
1. Terminal states are immutable except audit metadata.
2. `ambulance_id` and `responder_id` must be set together for ambulance workflows.
3. Every transition writes an audit row.
4. Realtime fanout is commit-after, never pre-commit.

Reference artifact:
- `docs/audit/deterministic_emergency_state_model_2026-03-02.json`

## 8) Deterministic E2E Blueprint

### 8.1 Test lanes
1. Emergency lifecycle lane (cash and card).
2. Role isolation lane (user, org_admin/dispatcher, driver, admin).
3. Realtime lane (mobile + console subscriptions).
4. Failure lane (RLS denied, no ambulance available, payment failure, realtime disconnect).

### 8.2 Core assertions
1. Exactly one active ambulance assignment per request.
2. No illegal status transitions.
3. Visit row consistency after completion.
4. Wallet/payment consistency after approval/decline.
5. Unauthorized role cannot mutate out-of-scope rows.
6. Realtime latency SLA under load and reconnect.

### 8.3 Deterministic seed model
1. Seed one org, two hospitals, three ambulances, three drivers, two users.
2. Seed explicit ambulance statuses and hospital capacities.
3. Seed payment method permutations (cash/card).
4. Seed deterministic timestamps and IDs to verify transition order.

### 8.4 CI gate requirements
1. Schema/type drift check against live export.
2. RPC existence and signature parity check.
3. Realtime publication membership check for subscribed tables.
4. Role matrix regression suite required to merge.

## 9) Real-Time Driver Activation Architecture

### 9.1 Activation principles
1. Driver state is canonical in DB, not client memory.
2. Assignment and ambulance state update occur in one transaction boundary.
3. Location streaming writes are scoped to assigned request/ambulance only.
4. Console map and mobile trip UI consume the same canonical rows.

### 9.2 Data path
1. Dispatch event sets `emergency_requests.ambulance_id/responder_id/status` and `ambulances.status/current_call` atomically.
2. Driver app streams location via role-checked RPC:
- input: `request_id`, `ambulance_id`, `location`, `heading`, `captured_at`
- guard: caller must match assigned responder.
3. RPC updates:
- `ambulances.location`, `ambulances.updated_at`
- `emergency_requests.responder_location`, `responder_heading`, `updated_at`
4. Realtime fanout:
- emergency channel: status + responder fields
- ambulance channel: position + availability fields
5. Completion/cancel transitions clear assignment and return ambulance to available.

### 9.3 Ghost-driver prevention
1. Assignment uses row lock + idempotent predicate.
2. Driver heartbeat timeout marks telemetry stale without mutating terminal state.
3. Reassignment requires explicit transition with audit reason.

### 9.4 Mobile fluidity requirements
1. Optimistic update only for local gesture feedback; reconcile to DB truth on ack.
2. Degraded mode banner when realtime disconnected; fallback polling uses canonical table only.
3. Render minimization via memoized selectors keyed by `id + updated_at`.

## 10) Immediate Implementation Order

1. Apply publication repair, state-writer fixes, auto-assign lock fix, duplicate trigger cleanup in non-destructive migrations.
2. Remove direct emergency table writes from console; route through vetted RPCs.
3. Harden RLS + function execute grants.
4. Regenerate app/console DB types and remove orphaned table/view usage.
5. Activate deterministic E2E matrix as merge gate.
