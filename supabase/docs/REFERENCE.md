# 📜 iVisit System Reference

Single source of truth for the iVisit schema, ID system, data flows, and critical RPCs.

---

## 1. Core Migration Pillars

The schema is organized into **11 authoritative pillar modules**. A forward deployment migration may exist briefly to apply an already-reviewed pillar delta to an initialized database, but it is removed after live verification and remote-history repair.

### 1.1 Authoritative Pillars

| File Pillar | Module Name | Primary Responsibility |
|---|---|---|
| `0000_infra` | Infrastructure | Extensions (PostGIS, pgcrypto), Enums, Core Utils |
| `0001_identity` | Identity & Registry | Profiles, Preferences, Medical Profiles, Emergency Contacts, Fluid ID Logic, `id_mappings` |
| `0002_org_structure` | Org Structure | Organizations, Hospitals, Providers (Doctors) |
| `0003_logistics` | Logistics | Ambulances, Emergency Requests, Visits |
| `0004_finance` | Financials | Wallets (Org/Patient), Ledger, Payments, Insurance |
| `0005_ops_content` | Ops & Content | Notifications, Support Tickets, CMS (News) |
| `0006_analytics` | Analytics | Activity Logs, Search History, Trending Topics |
| `0007_security` | Security / RLS | Row-Level Security Policies, Unified Access Control |
| `0008_emergency_logic`| Emergency Logic | Atomic RPCs (`create_emergency_v4`), Status Management |
| `0009_automations` | Automations | System Triggers, Cross-Table Hooks, User Init |
| `0100_core_rpcs` | Core APIs | Production RPCs for App/Console discovery |

### 1.2 Absorbed Forward Deployments

The entries below are historical deployments whose final SQL is already owned by the listed pillar. Their files and remote ledger rows do not remain after the absorb/delete/repair lifecycle described in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

| Migration | Scope | Owner Pillar |
|---|---|---|
| `20260412050000_hospital_media_pipeline.sql` | `hospital_media` table + `hospitals.image_*` columns | `org_structure` |
| `20260423000100_active_request_concurrency_guard.sql` | Unique partial indexes preventing duplicate active ambulance/bed requests per user | `logistics` |

Strict standard: pillar files stay the source of truth for their domain. Never rely on editing an applied pillar to update the live database; emit a narrow forward deployment, verify it live, absorb the exact SQL into its owner pillar, remove the temporary file, and repair its remote migration version as reverted.

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
| `organization_facility_claims` | `id` (UUID) | `organization_id`, `facility_id`, `submitted_by`, `reviewed_by` | - |
| `organization_verification_documents` | `id` (UUID) | `organization_id`, `facility_id`, `facility_claim_id`, `uploaded_by`, `reviewed_by` | - |
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
| `check_patient_cash_eligibility(...)` | Emergency | Patient-safe boolean cash preflight from canonical pricing; never exposes organization wallet or fee details |
| `nearby_hospitals(lat, lng)` | Core RPCs | PostGIS-powered discovery |
| `nearby_ambulances(lat, lng)` | Core RPCs | PostGIS-powered ambulance lookup |
| `get_console_identity_projection()` | Core RPCs | Returns backend-confirmed Console role, organization, complete `facilityIds` scope, onboarding, and wallet reflection |
| `get_user_statistics()` | Core RPCs | Returns platform totals to platform admins and organization-only totals to organization admins; all other callers are denied |
| `search_onboarding_facilities(query)` | Core RPCs | Read-only duplicate/ownership/claimability search for public Console onboarding |
| `provision_console_organization(payload)` | Core RPCs | Atomically provisions organization, new facility or existing-facility claim, profile scope, wallet reflection, and evidence |
| `review_organization_verification_document(...)` | Core RPCs | Platform-admin evidence accept/reject/request-changes command |
| `review_console_facility_claim(...)` | Core RPCs | Platform-admin ownership claim decision; approval requires accepted claim evidence |
| `review_console_organization(...)` | Core RPCs | Platform-admin organization decision; approval requires accepted evidence and required facility linkage |
| `complete_console_user_invitation(...)` | Core RPCs | Service-only invited-profile role and organization assignment after Auth delivery |
| `log_user_activity(...)` | Analytics | Structured audit logging |

### 6.1 Console Onboarding And Invitation Boundary

- Public Auth signup always initializes `profiles.role = patient`; Auth user metadata cannot grant a Console role.
- `profiles.organization_id` references `organizations.id`. A hospital or facility UUID is never an organization-scope fallback.
- Console identity projection returns every facility UUID owned by the organization so client filters can fail closed; the first ordered UUID is only the primary display facility.
- User statistics are caller-scoped inside the `SECURITY DEFINER` receiver. Platform admins receive global totals, organization admins receive only their organization, and unscoped actors are denied.
- Public onboarding can create a new canonical organization or submit a reviewed claim for an existing unowned facility through `provision_console_organization`. Claim approval links ownership only; evidence, organization, and facility verification remain separate platform-admin decisions.
- Facilities already linked to an organization are never transferred by the onboarding claim receiver.
- Onboarding evidence is private in `documents/onboarding/{auth.uid()}/*` and becomes immutable to the submitter after the provisioning RPC links it to `organization_verification_documents`.
- Console invitation email is sent by the `invite-user` Edge Function. The function requires an explicit `CONSOLE_URL`, targets only `{CONSOLE_URL}/set-password`, and labels Auth metadata with `invitation_surface = console`; it must never fall back to the patient-app Auth callback. The service-only invitation RPC validates the actor, role, organization scope, invited Auth user, and reflected profile assignment.
- The retired `check-user` endpoint returns HTTP 410 and must not be restored as an account-existence or password-state oracle.

---

## 7. Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Migration workflow, service patterns, scalability rules.
- **[TESTING.md](TESTING.md)**: Comprehensive testing guide.
- **[MODULE_SCHEMA_BIBLE.md](MODULE_SCHEMA_BIBLE.md)**: Canonical module ownership map and runtime touchpoint index.

---
**Strict Standard**: No tiny migration files. All fixes committed to the relevant Pillar.
