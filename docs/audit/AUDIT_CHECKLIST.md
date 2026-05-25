---
status: living
owner: architecture
last_updated: 2026-05-24
---

# ðŸŽ¯ iVisit System-Wide Audit Checklist

This document tracks the certification of all database tables, RPCs, and RLS policies across the `ivisit-app` and `ivisit-console` ecosystems.

## ðŸ Progress Tracker
- [x] Module 1: Identity & Access (Profiles, Auth, RBAC)
- [x] Module 2: Core Operations (Emergencies, Ambulances, Visits)
- [x] Module 3: Entity Management (Orgs, Hospitals, Rooms)
- [x] Module 4: Financials & Subscriptions (Payments, Pricing, Wallets)
- [x] Module 5: Support & Communications (Notifications, Tickets)
- [x] Module 6: Analytics & Insights (Search Logs, Events, Admin Logs)
- [x] Module 7: Insurance & Verification (Policies, Claims)
- [x] Module 8: Health & Public Information (Trending, News)

## Documentation Integrity Gate
Status: CLOSED 2026-05-24

Resolution (per `audit/RECONCILIATION_2026-05-24.md` Section Y):
- Mojibake repaired in `docs/flows/emergency/architecture/location-truth/DOSSIER_LOCATION_HARDENING_V1.md`, `location-truth/README.md`, and `location-truth/passes/LOC-3_LOCATION_RECOVERY.md`.
- Final encoding scan: 0 mojibake instances, 0 UTF-16/BOM issues across `docs/**`. All touched files saved as UTF-8 without BOM.
- Source-side corruption in `contexts/VisitsContext.jsx`, `supabase/migrations/20260219000800_emergency_logic.sql`, etc. reconciled in code passes prior to the sweep.

Standing checks (regression gate for any future doc/source touch):
1. Run `rg -nP "\\x{FFFD}|\\x{00C2}\\x{00A7}|\\x{00E2}\\x{20AC}|\\x{251C}\\x{00F3}\\x{0393}\\x{00C7}" docs contexts screens supabase`.
2. Confirm no newly touched text files were committed as UTF-16LE.
3. Record remaining exceptions in current-state docs instead of silently carrying them forward.

---

## ðŸ” Module 1: Identity & Access
Status: âœ… CERTIFIED
- Verified: `profiles` (UUID check), `get_current_user_role` (Security Definer).
- Fixed: 42P17 Recursion error killed.

---

## ðŸš‘ Module 2: Core Operations
Status: âœ… CERTIFIED
- Verified: `emergency_requests`, `ambulances`, `visits`.
- Fixed: `get_recent_activity` RPC unified. Multi-tenant scoping logic restored.

---

## ðŸ¨ Module 3: Entity Management
Status: âœ… CERTIFIED
- Verified: `organizations`, `hospitals`, `hospital_rooms`.
- Fixed: Tenant-specific filtering for Org Admins.

---

## ðŸ’³ Module 4: Financials & Subscriptions
Status: âœ… CERTIFIED
- Verified: `payments`, `patient_wallets`, `organization_wallets`, `service_pricing`.
- Fixed: Explicit UUID casting in RLS (fixed `operator does not exist` error).

---

## ðŸ“ Audit Rules
1. **Schema**: Verify all IDs and Foreign Keys are `UUID`.
2. **RLS**: No `SELECT` from the table under check in the policy (use `SECURITY DEFINER` helpers).
3. **CRUD**: Test via script `docs/archive/test-scripts/audit-[module].js`.
4. **Sync**: Ensure both App and Console see the same data points.
