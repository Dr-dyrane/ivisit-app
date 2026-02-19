# 🎯 Ground Zero Specification: ID Native UUID & Fluid Display IDs

## 1. The Core Law: UUID Native
Every table in the iVisit ecosystem **MUST** use `UUID` for its internal identifiers (`id`).

- **PRIMARY KEYS**: All `id` columns must be `UUID` (Default: `gen_random_uuid()` or `auth.uid()`).
- **FOREIGN KEYS**: All references to other tables must use the `UUID` of the target record.
- **NO EXCEPTIONS**: `TEXT` is permanently deprecated for internal record identification.

## 2. Fluid Display IDs
To provide a premium user experience, we present users with clean, prefixed alphanumeric IDs instead of raw UUIDs. Unlike legacy systems, these are stored **directly** on the table.

- **Column**: `display_id` (Type: `TEXT`, Unique).
- **Naming Convention**:
  - `HSP-XXXXXX` (Hospitals)
  - `AMB-XXXXXX` (Ambulances)
  - `REQ-XXXXXX` (Emergency Requests)
  - `USR-XXXXXX` (User Profiles)
  - `VIST-XXXXX` (Visits)
  - `PAY-XXXXXX` (Payments)

## 3. The Resolution Logic
Since the frontend often handles `display_id` for URL routing and user visibility, the database provides a virtual resolver:

- **Function**: `public.get_entity_id(p_display_id TEXT)`
- **Behavior**: Inspects the prefix and performs a high-speed lookup on the appropriate table to return the native `UUID`.

## 4. Automation: The Master Trigger
The system uses a `SECURITY DEFINER` function `stamp_entity_display_id()` to ensure every record receives a Display ID automatically upon creation.

### Logic Flow:
1. **Insert**: A new record is inserted (e.g., into `ambulances`).
2. **Trigger**: Before insert, the system generates a random 6-character suffix.
3. **Prefixing**: It attaches the appropriate prefix (e.g., `AMB-`).
4. **Collision Check**: It ensures the `display_id` is unique.
5. **Persistence**: The record is saved with both IDs.

## 5. Architectural Pillars
The schema is maintained in **11 Core Pillars**. Do not create new migration files for small logic changes; modify the relevant pillar to maintain a clean "Ground Zero" state.

1. `infra`
2. `identity` 
3. `org_structure`
4. `logistics`
5. `finance`
6. `ops_content`
7. `analytics`
8. `security`
9. `emergency_logic`
10. `automations`
11. `core_rpcs`

---
*Standardized & Verified - February 18, 2026*
