# 📜 iVisit System Reference

Single source of truth for the iVisit schema, ID system, data flows, and critical RPCs.

---

## 1. Core Migration Pillars

The schema is organized into **11 pillar modules** (authoritative) plus targeted post-pillar patch migrations applied in date order.

### 1.1 Authoritative Pillars

| File Pillar | Module Name | Primary Responsibility |
|---|---|---|
| `0000_infra` | Infrastructure | Extensions (PostGIS, pgcrypto), Enums, Core Utils |
| `0001_identity` | Identity & Registry | Profiles, Preferences, Medical Profiles, Fluid ID Logic, `id_mappings` |
| `0002_org_structure` | Org Structure | Organizations, Hospitals, Providers (Doctors) |
| `0003_logistics` | Logistics | Ambulances, Emergency Requests, Visits |
| `0004_finance` | Financials | Wallets (Org/Patient), Ledger, Payments, Insurance |
| `0005_ops_content` | Ops & Content | Notifications, Support Tickets, CMS (News) |
| `0006_analytics` | Analytics | Activity Logs, Search History, Trending Topics |
| `0007_security` | Security / RLS | Row-Level Security Policies, Unified Access Control |
| `0008_emergency_logic`| Emergency Logic | Atomic RPCs (`create_emergency_v4`), Status Management |
| `0009_automations` | Automations | System Triggers, Cross-Table Hooks, User Init |
| `0100_core_rpcs` | Core APIs | Production RPCs for App/Console discovery |

### 1.2 Post-Pillar Patches (applied in date order)

Targeted patches live as separate migrations instead of touching pillar files. They are not new pillars — table/RPC ownership still belongs to the originating pillar.

| Migration | Scope | Owner Pillar |
|---|---|---|
| `20260412050000_hospital_media_pipeline.sql` | `hospital_media` table + `hospitals.image_*` columns | `org_structure` |
| `20260423000100_active_request_concurrency_guard.sql` | Unique partial indexes preventing duplicate active ambulance/bed requests per user | `logistics` |

Strict Standard: pillar files stay the source of truth for their domain. New post-pillar patches may add fields, indexes, or guards, but any rename or contract change must land in the pillar.

---

## 2. Core Tables (UUID Native)

Every table uses `UUID` for internal identity. No exceptions.

| Table | Primary Key | Foreign Keys | Display ID Prefix |
|---|---|---|---|
| `profiles` | `id` (UUID) | - | `USR-` |
| `hospitals` | `id` (UUID) | `organization_id` | `HSP-` |
| `ambulances` | `id` (UUID) | `hospital_id`, `profile_id` | `AMB-` |
| `emergency_requests` | `id` (UUID) | `user_id`, `hospital_id`, `ambulance_id` | `REQ-` |
| `visits` | `id` (UUID) | `user_id`, `hospital_id`, `request_id` | `VIST-` |
| `organizations` | `id` (UUID) | - | `ORG-` |
| `doctors` | `id` (UUID) | `organization_id`, `profile_id` | `DOC-` |
| `payments` | `id` (UUID) | `user_id`, `emergency_request_id` | `PAY-` |

---

## 3. Fluid Display ID System

Users see clean alphanumeric IDs (e.g., `REQ-887213`). Internally, everything is UUID.

### 3.1 Storage
- Each core table carries its own `display_id TEXT UNIQUE` column (per-row storage).
- `public.id_mappings` (owned by `identity`) is a central resolution registry: `(entity_id, display_id, entity_type)` rows are written by the stamp trigger on insert.
- The per-row column is the primary read path for UI; `id_mappings` exists so `get_entity_id(display_id)` can resolve any prefix without knowing the table.

### 3.2 Generation
- `stamp_entity_display_id()` trigger fires `BEFORE INSERT` on each core entity.
- Generates a module/role-aware prefix + 6-char hex suffix.
- On profile inserts, prefix is derived from `role` and (for providers) `provider_type`.
- Same trigger inserts the `(entity_id, display_id, entity_type)` row into `id_mappings` after stamping.

### 3.3 Resolution
- `get_entity_id(display_id)` RPC resolves any display ID to its UUID using the prefix to select the correct table, with `id_mappings` as the fallback/central index.

### 3.4 Prefix Matrix (role-aware)

| Prefix | Entity | Role / Source |
|---|---|---|
| `USR-` | `profiles` | default fallback for profiles |
| `PAT-` | `profiles` | role = `patient` |
| `ADM-` | `profiles` | role = `admin` |
| `OAD-` | `profiles` | role = `org_admin` |
| `DPC-` | `profiles` | role = `dispatcher` |
| `VWR-` | `profiles` | role = `viewer` |
| `SPN-` | `profiles` | role = `sponsor` |
| `PRO-` | `profiles` | role = `provider`, unspecified provider_type |
| `DOC-` | `profiles` / `doctors` | role = `provider` + provider_type = `doctor`, or `doctors` row |
| `DRV-` | `profiles` | provider_type = `driver` |
| `PMD-` | `profiles` | provider_type = `paramedic` |
| `AMS-` | `profiles` | provider_type = `ambulance_service` |
| `PHR-` | `profiles` | provider_type = `pharmacy` |
| `CLN-` | `profiles` | provider_type = `clinic` |
| `ORG-` | `organizations` | — |
| `HSP-` | `hospitals` | — |
| `AMB-` | `ambulances` | — |
| `REQ-` | `emergency_requests` | — |
| `VIST-` | `visits` | — |
| `PAY-` | `payments` | — |
| `NTF-` | `notifications` | — |
| `WLT-` | `patient_wallets` | — |
| `OWL-` | `organization_wallets` | — |
| `ID-` | fallback | unknown / unmapped table |

Source of truth: `stamp_entity_display_id()` trigger body in [`supabase/migrations/20260219000100_identity.sql`](../migrations/20260219000100_identity.sql). The duplicate in `supabase/scripts/apply_live_fixes.sql` is a live-hotfix mirror and is missing the `VWR-` and `SPN-` branches — if the two ever disagree, the pillar wins.

---

## 4. Master Triggers

### `stamp_entity_display_id()`
- **Type**: `BEFORE INSERT` (also fires `AFTER UPDATE` on `profiles` when role-derived prefix changes)
- **Logic**: Resolves role/provider-aware prefix, generates a 6-char hex suffix, stamps `display_id` on the row, and inserts a matching row into `public.id_mappings`. On profile role changes, updates the existing `id_mappings` row.

### `handle_updated_at()`
- **Type**: `BEFORE UPDATE`
- **Logic**: Refreshes `updated_at` timestamp.

### `handle_new_user()`
- **Type**: `AFTER INSERT` on `auth.users` (trigger: `on_auth_user_created`)
- **Owner pillar**: `automations` (`20260219000900_automations.sql`)
- **Logic**: Creates Profile, Preferences, Medical Profile, and Patient Wallet.

---

## 5. Emergency Data Flow

### Phase A: Initiation
1. Patient calls `create_emergency_v4` (atomic RPC).
2. `stamp_entity_display_id` sets `REQ-XXXXXX` on the record.
3. Visit entry created with `status = 'pending'`.
4. Payment entry created (`pending` for cash, `completed` for card).

### Phase B: Cash Financial Guard
1. Request held at `pending_approval`.
2. `org_admin` calls `approve_cash_payment`.
3. Org Wallet adjusted → Request moves to `in_progress` → Visit moves to `active`.

### Phase C: Logistics Coupling
1. `auto_assign_driver` assigns ambulance.
2. `ambulances.status` → `on_duty`, `emergency_requests.ambulance_id` → UUID.
3. Realtime update dispatched to patient via Supabase Channels.

### Phase D: Stripe (Card)
1. Webhook: `payment_intent.succeeded`.
2. Resolve `PAY-XXXXXX` → update `payments` → update `emergency_requests`.
3. `process_payment_distribution` credits Platform and Org wallets, logs to `wallet_ledger`.

---

## 6. Critical RPCs

| Function | Module | Purpose |
|---|---|---|
| `get_entity_id(display_id)` | Identity | Resolves human-readable ID to UUID |
| `create_emergency_v4(...)` | Emergency | Atomic creation of request + payment intent |
| `nearby_hospitals(lat, lng)` | Core RPCs | PostGIS-powered discovery |
| `nearby_ambulances(lat, lng)` | Core RPCs | PostGIS-powered ambulance lookup |
| `log_user_activity(...)` | Analytics | Structured audit logging |

---

## 7. Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Migration workflow, service patterns, scalability rules.
- **[TESTING.md](TESTING.md)**: Comprehensive testing guide.
- **[MODULE_SCHEMA_BIBLE.md](MODULE_SCHEMA_BIBLE.md)**: Canonical module ownership map and runtime touchpoint index.

---
**Strict Standard**: No tiny migration files. All fixes committed to the relevant Pillar.
