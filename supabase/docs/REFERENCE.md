# 📜 iVisit System Reference

Single source of truth for the iVisit schema, ID system, data flows, and critical RPCs.

---

## 1. Core Migration Pillars (The 11 Modules)

| File Pillar | Module Name | Primary Responsibility |
|---|---|---|
| `0000_infra` | Infrastructure | Extensions (PostGIS, pgcrypto), Enums, Core Utils |
| `0001_identity` | Identity & Registry | Profiles, Preferences, Medical Profiles, Fluid ID Logic |
| `0002_org_structure` | Org Structure | Organizations, Hospitals, Providers (Doctors) |
| `0003_logistics` | Logistics | Ambulances, Emergency Requests, Visits |
| `0004_finance` | Financials | Wallets (Org/Patient), Ledger, Payments, Insurance |
| `0005_ops_content` | Ops & Content | Notifications, Support Tickets, CMS (News) |
| `0006_analytics` | Analytics | Activity Logs, Search History, Trending Topics |
| `0007_security` | Security / RLS | Row-Level Security Policies, Unified Access Control |
| `0008_emergency_logic`| Emergency Logic | Atomic RPCs (`create_emergency_v4`), Status Management |
| `0009_automations` | Automations | System Triggers, Cross-Table Hooks, User Init |
| `0100_core_rpcs` | Core APIs | Production RPCs for App/Console discovery |

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

- **Storage**: `display_id` column lives directly on each table. No mapping table.
- **Generation**: `stamp_entity_display_id()` trigger fires `BEFORE INSERT`, generating a 6-char hex suffix with a module prefix.
- **Resolution**: `get_entity_id(display_id)` RPC resolves any display ID to its UUID by checking the prefix and querying the correct table.
- **Prefixes**: `USR-`, `ORG-`, `HSP-`, `DOC-`, `AMB-`, `REQ-`, `VIST-`, `PAY-`, `NTF-`

---

## 4. Master Triggers

### `stamp_entity_display_id()`
- **Type**: `BEFORE INSERT` on all core entities
- **Logic**: Generates display ID, stamps it on the row. No external writes.

### `handle_updated_at()`
- **Type**: `BEFORE UPDATE`
- **Logic**: Refreshes `updated_at` timestamp.

### `initialize_new_user()`
- **Type**: `AFTER INSERT` on `auth.users`
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

---
**Strict Standard**: No tiny migration files. All fixes committed to the relevant Pillar.
