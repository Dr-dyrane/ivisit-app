# Multi-Hospital Organization Scoping & RBAC

## Overview
As of 2026-02-17, the system has been upgraded to support **Multi-Hospital Organizations**. This allows an `org_admin` to manage and view data across all hospitals belonging to their parent organization, rather than being restricted to a single hospital entry.

## Architectural Key Insights

### 1. The ID Discrepancy
- **Organization ID (UUID)**: Stored in `profiles.organization_id`. This is the primary key of the `organizations` table.
- **Hospital ID (TEXT)**: Stored in `hospitals.id` (often a Google Place ID or similar).
- **Hospital Organization ID (UUID)**: Stored in `hospitals.organization_id`. This links hospitals to their parent organization.

### 2. Frontend Scoping (`authService.js`)
The `getCurrentUser` function now automatically resolves all sibling hospital IDs for an `org_admin`.
- It fetches `hospitals.id` where `organization_id = user.organization_id`.
- These are stored in a new `hospital_ids` array on the user object.

`applyAuthFilter` handles the dual-scoping:
- **Hospital Scoped**: If a table is filtered by `hospital_id` (e.g., `visits`, `emergency_requests`), it uses `.in('hospital_id', user.hospital_ids)`.
- **Organization Scoped**: If a table is filtered by `organization_id` (e.g., `ambulances`, `hospitals`), it uses `.eq('organization_id', user.organization_id)`.

### 3. Backend RLS (Row Level Security)
Policies have been modernized to use a performance-safe JOIN pattern that bridges the UUID/TEXT discrepancy.

**Pattern Template:**
```sql
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.hospitals h ON CAST(h.organization_id AS text) = CAST(p.organization_id AS text)
        WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.organization_id IS NOT NULL
        AND [table_name].hospital_id = h.id
    )
)
```
This pattern is applied to:
- `public.visits`
- `public.emergency_requests`
- `public.doctors`
- `public.ambulances`

## UI Standardizations
- **Unknown ETA/Distance**: Replaced "Unknown" with premium fallbacks (e.g., "8-12 mins", "--") to maintain high-end UX.
- **Header Synchronization**: Reservation screens now explicitly force-unlock and show the header on navigation to prevent visibility glitches caused by the `UnifiedScrollContext`.
- **Wait Time Calculations**: Standardized dynamic load calculation based on distance, bed availability, and peak hours.

## Migration History
- `20260217200000_fix_org_admin_visits_rls.sql`: Fixes Visits scoping.
- `20260217210000_universal_org_admin_rbac.sql`: Universal implementation for doctors, ambulances, and emergencies.
