# 📜 Ground Zero: System Reference (v1.0)

This document contains the verified inventory of the standardized iVisit schema. 

---

## 🏗️ 1. Core Tables (UUID Native)

| Table | Primary Key | Foreign Keys | Display ID Prefix |
|---|---|---|---|
| `profiles` | `id` (UUID) | - | `USR-` |
| `hospitals` | `id` (UUID) | `organization_id` | `HSP-` |
| `ambulances` | `id` (UUID) | `hospital_id`, `profile_id` | `AMB-` |
| `emergency_requests` | `id` (UUID) | `user_id`, `hospital_id`, `ambulance_id`, `responder_id` | `REQ-` |
| `visits` | `id` (UUID) | `user_id`, `hospital_id`, `request_id` | `VIST-` |
| `notifications` | `id` (UUID) | `user_id` | - |

## 🗺️ 2. The Identity Registry (`id_mappings`)
Maps every record to its human-friendly counterpart.

- **Table**: `public.id_mappings`
- **Unique Constraints**: `entity_id` (UUID), `display_id` (TEXT)

## ⚡ 3. Automation (Master Triggers)

### `stamp_entity_display_id()`
- **Type**: `BEFORE INSERT`
- **Tables**: `profiles`, `hospitals`, `ambulances`, `emergency_requests`, `visits`.
- **Logic**: Generates a random alphanumeric ID and registers it in the `id_mappings` table.

### `handle_updated_at()`
- **Type**: `BEFORE UPDATE`
- **Logic**: Automatically refreshes the `updated_at` timestamp.

## 🛠️ 4. Critical RPCs

| Function | Purpose |
|---|---|
| `is_admin()` | Returns `TRUE` if currently authenticated user is an admin. |
| `get_system_stats()` | Returns aggregated counts for the dashboard. |
| `generate_display_id(prefix)` | Internal helper for ID generation. |

---
**Strict Standard**: Any modification to these structures must be added to the Baseline and synced across workspaces.
