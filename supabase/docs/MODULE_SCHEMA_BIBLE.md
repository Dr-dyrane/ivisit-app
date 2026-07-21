# iVisit Modular Schema Bible

Canonical ownership map for the 11 migration pillars, with runtime touchpoints for app and console services.

## Purpose
- Keep one source of truth for where schema changes belong.
- Prevent drift between migration pillars, RPC layers, and frontend service assumptions.
- Make the 3000+ line schema manageable through module ownership instead of one giant mental model.

## Source Inputs
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
- `docs/audit/static_supabase_usage_2026-03-02.json`
- `docs/audit/rpc_dependency_graph_2026-03-02.json`
- `docs/audit/live_schema_inventory_2026-03-02.json`

## Pillar Inventory
| Pillar File | Module | Tables | Functions | Triggers |
|---|---|---:|---:|---:|
| `20260219000000_infra.sql` | `infra` | 0 | 3 | 0 |
| `20260219000100_identity.sql` | `identity` | 8 | 7 | 7 |
| `20260219000200_org_structure.sql` | `org_structure` | 6 | 0 | 7 |
| `20260219000300_logistics.sql` | `logistics` | 7 | 5 | 10 |
| `20260219000400_finance.sql` | `finance` | 8 | 6 | 9 |
| `20260219000500_ops_content.sql` | `ops_content` | 5 | 4 | 5 |
| `20260219000600_analytics.sql` | `analytics` | 6 | 1 | 2 |
| `20260219000700_security.sql` | `security` | 0 | 4 | 0 |
| `20260219000800_emergency_logic.sql` | `emergency_logic` | 2 | 24 | 5 |
| `20260219000900_automations.sql` | `automations` | 0 | 11 | 11 |
| `20260219010000_core_rpcs.sql` | `core_rpcs` | 0 | 58 | 1 |

## Post-Pillar Patches
Date-ordered migrations that extend a pillar without owning its contract. Ownership still belongs to the originating pillar.

| Migration | Scope | Owner Pillar |
|---|---|---|
| `20260412050000_hospital_media_pipeline.sql` | `hospital_media` table + `hospitals.image_source/image_confidence/image_attribution_text/image_synced_at` columns | `org_structure` |
| `20260423000100_active_request_concurrency_guard.sql` | Unique partial indexes on `emergency_requests(user_id)` preventing duplicate active ambulance/bed requests per user | `logistics` |

Rule: post-pillar patches may add columns, indexes, or guards. Contract renames, table removals, or RPC signature changes must land in the owner pillar instead.

## Table Ownership (Authoritative)

### `identity`
- `profiles`
- `preferences`
- `medical_profiles`
- `emergency_contacts`
- `subscribers`
- `user_roles`
- `user_sessions`
- `id_mappings`

### `org_structure`
- `organizations`
- `organization_facility_claims`
- `organization_verification_documents`
- `hospitals` (unique constraint on `latitude, longitude` to prevent duplicate locations)
- `doctors`
- `doctor_schedules`
- `emergency_doctor_assignments`

### `logistics`
- `ambulances`
- `emergency_requests`
- `visits`
- `emergency_status_transitions`
- `emergency_chat_rooms`
- `emergency_chat_participants`
- `emergency_chat_messages`

Scheduled care reuses `visits` and the existing `emergency_chat_*` family.
`doctor_schedules` remains owned by `org_structure`; patient-safe availability,
booking, lifecycle, schedule administration, and async-consult commands are
exposed from `core_rpcs`. No parallel appointment or telemedicine-session table
owns encounter truth.

### `finance`
- `ivisit_main_wallet`
- `organization_wallets`
- `patient_wallets`
- `payment_methods`
- `payments`
- `wallet_ledger`
- `insurance_policies`
- `insurance_billing`

### `ops_content`
- `notifications`
- `support_tickets`
- `support_faqs`
- `health_news`
- `documents`
- `access_requests`
- `document_invites`

Data Room content bodies remain release-governed by the private `iVisit-docs`
manifest. Supabase is the runtime projection. Authenticated clients receive only
eligible metadata columns; `documents.content`, access mutations, and invite
rows remain server-receiver boundaries.

### `analytics`
- `admin_audit_log`
- `user_activity`
- `search_events`
- `search_history`
- `search_selections`
- `trending_topics`

### `emergency_logic`
- `service_pricing`
- `room_pricing`

## Runtime Service Touchpoints (Current)
Counts below are app/console service file references from `static_supabase_usage`.

| Table | Owner Module | App Services | Console Services |
|---|---|---:|---:|
| `profiles` | `identity` | 4 | 11 |
| `emergency_requests` | `logistics` | 3 | 5 |
| `ambulances` | `logistics` | 1 | 5 |
| `visits` | `logistics` | 1 | 1 |
| `emergency_chat_rooms` | `logistics` | 0 | 0 |
| `emergency_chat_participants` | `logistics` | 0 | 0 |
| `emergency_chat_messages` | `logistics` | 0 | 0 |
| `hospitals` | `org_structure` | 5 | 10 |
| `organizations` | `org_structure` | 1 | 0 |
| `organization_facility_claims` | `org_structure` | 0 | 1 |
| `organization_verification_documents` | `org_structure` | 0 | 1 |
| `insurance_policies` | `finance` | 4 | 0 |
| `payments` | `finance` | 1 | 0 |
| `wallet_ledger` | `finance` | 1 | 1 |
| `notifications` | `ops_content` | 2 | 1 |
| `support_tickets` | `ops_content` | 1 | 0 |
| `search_events` | `analytics` | 1 | 2 |
| `user_activity` | `analytics` | 0 | 1 |
| `service_pricing` | `emergency_logic` | 3 | 0 |
| `room_pricing` | `emergency_logic` | 2 | 0 |

Use the audit artifact for full table coverage. This section tracks high-surface tables first.

## RPC Ownership Model

### Rule
- Domain logic RPCs are owned by their domain module (`identity`, `finance`, `emergency_logic`, etc.).
- `core_rpcs` is an API boundary and facade layer for app/console consumption, not a second source of business rules.

### Current Drift Watchlist (Duplicate Function Names)
- `approve_cash_payment` (`emergency_logic`, `core_rpcs`)
- `assign_ambulance_to_emergency` (`emergency_logic`, `core_rpcs`)
- `auto_assign_ambulance` (`emergency_logic`, `core_rpcs`)
- `cancel_bed_reservation` (`emergency_logic`, `core_rpcs`)
- `cancel_trip` (`emergency_logic`, `core_rpcs`)
- `complete_trip` (`emergency_logic`, `core_rpcs`)
- `decline_cash_payment` (`emergency_logic`, `core_rpcs`)
- `discharge_patient` (`emergency_logic`, `core_rpcs`)
- `process_wallet_payment` (`finance`, `core_rpcs`)

### Active Runtime RPC Surfaces
Key RPCs called directly by app/console services:
- App-heavy: `create_emergency_v4`, `process_wallet_payment`, `process_cash_payment_v2`, `calculate_emergency_cost_v2`, `notify_cash_approval_org_admins`, `reload_schema`
- Console-heavy: `console_*`, `get_console_identity_projection`, `get_user_statistics`, `search_onboarding_facilities`, `provision_console_organization`, `complete_console_user_invitation`, `cancel_trip`, `complete_trip`, `cancel_bed_reservation`, `discharge_patient`, `check_cash_eligibility`, `search_auth_users`, `update_profile_by_admin`, `update_hospital_by_admin`
- Contact Dispatch: `ensure_emergency_chat_room`, `send_emergency_chat_message`, `mark_emergency_chat_room_read`
- Scheduled-care backend contract (runtime adoption pending):
  `get_book_visit_availability`, `book_scheduled_visit`,
  `get_console_doctor_schedules`, `upsert_doctor_schedule`,
  `delete_doctor_schedule`, `transition_scheduled_visit`,
  `ensure_async_consult_room`, `send_async_consult_message`, and
  `mark_async_consult_room_read`

Detailed doctrine and rollout gates live in
`docs/flows/visits/SCHEDULED_VISITS_ASYNC_CONSULT_DATA_PASS_PLAN_V1.md`.

Console identity scope rule: `get_console_identity_projection` returns the canonical organization UUID plus its complete facility UUID set. `get_user_statistics` is global only for platform admins or `service_role`; organization admins receive organization-bound aggregates and every other role is denied.

## Change Control Rules (Operational)
1. Add a tracker/plan item (`SCC-###`) before schema-impacting work.
2. Change only the owner pillar file for table contract updates.
3. If `core_rpcs` wraps domain RPCs, keep behavior centralized in domain layer and document wrapper intent.
4. Sync migration/docs/types to console: `node supabase/scripts/sync_to_console.js`.
5. Run hard gates before closure:
   - `npm run hardening:cleanup-dry-run-guard`
   - `npm run hardening:contract-drift-guard`
6. Update:
   - `docs/project_state/context/SUPABASE_CHANGE_CONTROL_PLAN_2026-03-05.md`
   - `docs/project_state/context/SUPABASE_CHANGE_TRACKER_2026-03-05.md`

## Modular Maintenance Strategy
- Treat this file as the index.
- Keep deep SQL details in the owner migration file and `SCHEMA_SNAPSHOT.md`.
- Use SCC items to stage one module at a time (contract, RPCs, triggers, runtime consumers).
- Prefer small, deterministic audit slices over broad one-shot rewrites.
