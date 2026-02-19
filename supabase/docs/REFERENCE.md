# 📜 Ground Zero: System Reference (v2.0)

This document contains the verified inventory of the standardized iVisit modular schema.

---

## 🏗️ 1. Core Migration Pillars (The 11 Modules)

The system is organized into functional modules to prevent migration bloating and ensure architectural clarity.

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

## 🏗️ 2. Core Tables (UUID Native)

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

## ⚡ 3. Automation (Master Triggers)

### `stamp_entity_display_id()`
- **Type**: `BEFORE INSERT`
- **Tables**: All core entities.
- **Logic**: Generates a 6-character alphanumeric suffix with a module-specific prefix. This is stored directly in the `display_id` column of the table.

### `handle_updated_at()`
- **Type**: `BEFORE UPDATE`
- **Logic**: Automatically refreshes the `updated_at` timestamp.

### `initialize_new_user()`
- **Type**: `AFTER INSERT` on `auth.users`
- **Logic**: Automatically creates the Profile, Preferences, Medical Profile, and Patient Wallet.

---

## 🛠️ 4. Critical RPCs

| Function | Module | Purpose |
|---|---|---|
| `get_entity_id(display_id)` | Identity | Resolves human-readable ID to UUID. |
| `create_emergency_v4(...)` | Emergency | Atomic creation of request + payment intent. |
| `nearby_hospitals(lat, lng)`| Core RPCs | PostGIS-powered discovery. |
| `log_user_activity(...)` | Analytics | Structured audit logging. |

---

## 📋 5. Documentation Hub
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Staged Evolution Workflow.
- **[ENGINEERING_PATTERNS.md](ENGINEERING_PATTERNS.md)**: Retry, Bulk, Streaming & Audit Patterns.
- **[TESTING.md](TESTING.md)**: Comprehensive Testing Guide.

---
**Strict Standard**: No tiny migration files. All fixes must be committed back to the relevant Pillar file.
