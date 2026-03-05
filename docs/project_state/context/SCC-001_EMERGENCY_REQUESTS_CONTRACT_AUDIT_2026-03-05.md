# SCC-001 Emergency Requests Contract Audit (2026-03-05)

## Scope
Audit `public.emergency_requests` contract ownership across:
- schema,
- write authorities (RPCs + triggers),
- app read/write paths,
- console runtime references available in audit artifacts.

## Evidence Inputs
- Schema and constraints: `supabase/migrations/20260219000300_logistics.sql:31-73`
- Status write guard + transition log: `supabase/migrations/20260219000800_emergency_logic.sql:1770-1950`
- Patient/app request creation + payment RPCs:
  - `supabase/migrations/20260219000800_emergency_logic.sql:441-583`
  - `supabase/migrations/20260219000800_emergency_logic.sql:587-777`
  - `supabase/migrations/20260219000800_emergency_logic.sql:792-894`
- Console/operator RPC boundary:
  - `supabase/migrations/20260219010000_core_rpcs.sql:1331-1616`
  - `supabase/migrations/20260219010000_core_rpcs.sql:1619-2187`
  - `supabase/migrations/20260219010000_core_rpcs.sql:2189-3214`
- Automation hooks:
  - `supabase/migrations/20260219000900_automations.sql:147-164`
  - `supabase/migrations/20260219000900_automations.sql:504-658`
  - `supabase/migrations/20260219000900_automations.sql:661-827`
- App service usage:
  - `services/emergencyRequestsService.js:82-509`
  - `services/paymentService.js:799-913`
  - `services/serviceCostService.js:57-101`
  - `hooks/emergency/useRequestFlow.js:293-449`
  - `hooks/emergency/useEmergencyHandlers.js:67-200`
  - `services/visitsService.js:89-200,250-349`
  - `utils/domainNormalize.js:36-55`
- Console evidence (repo artifact, console code not in this workspace):
  - `docs/audit/static_supabase_usage_2026-03-02.json`
  - `docs/audit/ui_db_parity_matrix_2026-03-02.json:151-194`

## Canonical DB Contract (Live Core)
`emergency_requests` authoritative columns are those defined in `0003_logistics`:
- identity and ownership: `id`, `user_id`, `hospital_id`, `ambulance_id`
- lifecycle: `status`, `payment_status`, `created_at`, `updated_at`, `completed_at`, `cancelled_at`
- request snapshot: `service_type`, `hospital_name`, `specialty`, `ambulance_type`, `bed_number`, `patient_snapshot`
- geo/realtime: `pickup_location`, `destination_location`, `patient_location`, `responder_location`, `responder_heading`
- responder snapshot: `responder_id`, `responder_name`, `responder_phone`, `responder_vehicle_type`, `responder_vehicle_plate`
- doctor linkage: `assigned_doctor_id`, `doctor_assigned_at`
- costs/display: `total_cost`, `display_id`

## Write Authority Map
### Primary writers (intended)
- `create_emergency_v4` inserts request (patient/app path).
- `patient_update_emergency_request` updates patient location, triage snapshot, and allowed status transitions.
- `console_create_emergency_request` inserts request (operator path).
- `console_update_emergency_request` broad operator mutation path.
- `console_dispatch_emergency` dispatch assignment and responder snapshot update.
- `assign_ambulance_to_emergency` / `auto_assign_ambulance` assign ambulance and responder snapshot.
- `approve_cash_payment` / `decline_cash_payment` update request + payment lifecycle.
- `console_complete_emergency` / `console_cancel_emergency` and legacy wrappers (`complete_trip`, `cancel_trip`, `discharge_patient`, `cancel_bed_reservation`) finalize lifecycle.

### Guardrails enforcing authority
- Direct status updates are blocked unless transition context enables status write:
  - `enforce_emergency_status_write_path` trigger.
- Every status transition is append-logged into `emergency_status_transitions`.
- Legal status graph is validated by `is_valid_emergency_status_transition` + trigger.

### Trigger side-writers
- `auto_assign_driver` trigger can set `ambulance_id`, responder fields, and status `accepted`.
- `handle_ambulance_unavailability_failover` can reassign/clear responder and ambulance fields.
- `sync_emergency_to_visit` only updates `visits` when request reaches `completed`.

## Read Path Map
### App
- App reads active rows directly from `emergency_requests` and subscribes realtime updates.
- App writes through RPCs (`create_emergency_v4`, `patient_update_emergency_request`, cash approval RPCs).
- App also contains a payment update helper that calls `console_update_emergency_request` (operator RPC surface).

### Console (artifact-derived)
- Runtime refs include:
  - `frontend/src/components/pages/EmergencyRequestsPage.jsx`
  - `frontend/src/services/emergencyResponseService.js`
  - `frontend/src/services/emergencyService.js`
- Console emergency service calls RPCs:
  - `create_emergency_v4`, `approve_cash_payment`, `decline_cash_payment`
- Console response service uses `emergency_requests`/`ambulances` table runtime paths (artifact scan).

## Findings
### F1 (High): Visit identity mismatch uses request UUID as visit ID in app flow
Evidence:
- `hooks/emergency/useEmergencyHandlers.js:73-104,119-149` passes `active*Trip.requestId` into visit mutations.
- `services/visitsService.js:289-349` falls back to upsert by `id` when update finds no row.
- `create_emergency_v4` creates visit with its own generated `visits.id` and links by `request_id` (`...00800_emergency_logic.sql:539-549`).
Impact:
- Duplicate/placeholder visits can be created with sparse fields (hospital/doctor unknown), while canonical visit row linked by `request_id` already exists.

### F2 (High): Visit hospital label normalization drops `hospital_name`
Evidence:
- `services/visitsService.js:89-107` maps DB row but does not map `hospital_name -> hospital`.
- `utils/domainNormalize.js:39-53` falls back to `"Hospital"` when `raw.hospital` is absent.
Impact:
- UI shows "Unknown Facility"/generic hospital labels despite populated `hospital_name` column.

### F3 (Medium): Frontend emergency shape drift vs live DB schema
Evidence:
- App emergency mapping references non-live request fields (`bed_type`, `bed_count`, `estimated_arrival`, `patient_heading`, `payment_method_id`, `shared_data_snapshot`) in `services/emergencyRequestsService.js:115-123,166-179`.
- Console type drift recorded in parity matrix (`docs/audit/ui_db_parity_matrix_2026-03-02.json:175-194`).
Impact:
- Silent undefined values, inconsistent UI assumptions, and increased risk of stale code paths.

### F4 (Medium): App helper calls operator RPC surface
Evidence:
- `services/serviceCostService.js:86-89` calls `console_update_emergency_request`.
Impact:
- Patient-side context can hit operator-scoped mutation surface and fail authorization depending on caller/session role.

### F5 (Medium): Request->Visit sync trigger is completion-only
Evidence:
- `sync_emergency_to_visit` only updates visit on `status=completed` (`...00900_automations.sql:147-156`).
Impact:
- No trigger-level remediation for missing/incomplete visit rows during earlier lifecycle stages.

### F6 (Low): Stale code comment references non-existent trigger name
Evidence:
- `hooks/emergency/useRequestFlow.js:338` mentions `sync_emergency_to_history`; live trigger is `sync_emergency_to_visit`.
Impact:
- Increases maintenance confusion and wrong debugging assumptions.

## Recommended Follow-On (SCC-002 handoff)
1. Make visit operations request-key aware (`request_id` first, not `visits.id`).
2. Remove UUID fallback upsert path that invents visits by emergency request ID.
3. Normalize `hospital_name` and `doctor_name` into UI domain model consistently.
4. Reconcile emergency frontend shapes to live schema contract.
5. Gate `console_update_emergency_request` usage away from app patient contexts.
6. Extend request->visit sync policy (or explicit RPC) for non-terminal lifecycle updates.

## SCC-001 Completion State
- Contract ownership mapping: complete.
- Mismatch inventory for `emergency_requests` interface: complete.
- Remediation package: queued into SCC-002/SCC-003 execution lanes.
