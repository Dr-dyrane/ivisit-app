# 🎯 Ground Zero Specification: ID Native UUID & Display ID Mapping

## 1. The Core Law: UUID Native
Every table in the iVisit ecosystem **MUST** use `UUID` for its internal identifiers (`id`).

- **PRIMARY KEYS**: All `id` columns must be `UUID` (Default: `gen_random_uuid()` or `auth.uid()`).
- **FOREIGN KEYS**: All references to other tables must use the `UUID` of the target record.
- **NO EXCEPTIONS**: `TEXT` is permanently deprecated for internal record identification.

## 2. Human-Friendly Identities (Display IDs)
To provide a premium user experience, we present users with clean, prefixed alphanumeric IDs instead of raw UUIDs.

- **Column**: `display_id` (Type: `TEXT`, Unique).
- **Naming Convention**:
  - `HSP-XXXXXX` (Hospitals)
  - `AMB-XXXXXX` (Ambulances)
  - `REQ-XXXXXX` (Emergency Requests)
  - `USR-XXXXXX` (User Profiles)
  - `VIST-XXXXX` (Visits)

## 3. The Mapping Registry (`id_mappings`)
Every entity generated in the system is registered in a central mapping table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary Key. |
| `entity_id` | `UUID` | The internal record ID. |
| `display_id` | `TEXT` | The human-friendly text ID. |
| `entity_type`| `TEXT` | Table name or type (e.g., 'hospital'). |
| `created_at` | `TIMESTAMPTZ` | Timestamp of registration. |

## 4. Automation: The Master Trigger
The system uses a `SECURITY DEFINER` function `stamp_entity_display_id()` and a trigger to ensure every insert automatically receives a Display ID and a registry entry.

### Logic Flow:
1. **Insert**: A new record is inserted (e.g., into `ambulances`).
2. **Trigger**: Before insert, the system generates a random 6-character suffix.
3. **Prefixing**: It attaches the appropriate prefix (e.g., `AMB-`).
4. **Collision Check**: It ensures the `display_id` is unique.
5. **Mapping**: It registers the link between the new `UUID` and the `display_id`.
6. **Persistence**: The record is saved with both IDs.

## 5. Transition Rule: Any historical data required?
Reference the **Archived Migrations** in `supabase/migrations/archive/` to understand old logic or data structures. The current `migrations/` folder remains the **pristine "Ground Zero" state.**

## 5. Consolidation Compliance Requirements

### UUID Native Consolidation Requirements
All consolidated changes must comply with:
- **UUID Internal IDs**: All primary/foreign keys use UUID
- **Display ID Mapping**: Human-readable IDs preserved
- **No TEXT for Internal**: Never use TEXT for internal identifiers
- **Type Safety**: Strong typing throughout consolidated schema

### Living Baseline Management
- **Single Consolidated File**: `20260218060000_consolidated_schema.sql`
- **Floating Fixes**: Temporary migrations for production issues
- **Staged Evolution**: Complex changes in phases
- **Nuclear De-Recursion**: RLS fixes using SECURITY DEFINER

### Consolidation Quality Gates
- **Testing Required**: All consolidated changes must pass tests
- **Error Management**: Proper error logging and classification
- **Documentation**: Update all relevant documentation
- **Performance**: No degradation in response times

---
*Confirmed and Standardized - February 18, 2026*
