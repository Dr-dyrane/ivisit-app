# 🎯 iVisit System-Wide Audit Checklist

This document tracks the certification of all database tables, RPCs, and RLS policies across the `ivisit-app` and `ivisit-console` ecosystems.

## 🏁 Progress Tracker
- [x] Module 1: Identity & Access (Profiles, Auth, RBAC)
- [x] Module 2: Core Operations (Emergencies, Ambulances, Visits)
- [x] Module 3: Entity Management (Orgs, Hospitals, Rooms)
- [x] Module 4: Financials & Subscriptions (Payments, Pricing, Wallets)
- [x] Module 5: Support & Communications (Notifications, Tickets)
- [x] Module 6: Analytics & Insights (Search Logs, Events, Admin Logs)
- [x] Module 7: Insurance & Verification (Policies, Claims)

---

## 🔐 Module 1: Identity & Access
Status: ✅ CERTIFIED
- Verified: `profiles` (UUID check), `get_current_user_role` (Security Definer).
- Fixed: 42P17 Recursion error killed.

---

## 🚑 Module 2: Core Operations
Status: ✅ CERTIFIED
- Verified: `emergency_requests`, `ambulances`, `visits`.
- Fixed: `get_recent_activity` RPC unified. Multi-tenant scoping logic restored.

---

## 🏨 Module 3: Entity Management
Status: ✅ CERTIFIED
- Verified: `organizations`, `hospitals`, `hospital_rooms`.
- Fixed: Tenant-specific filtering for Org Admins.

---

## 💳 Module 4: Financials & Subscriptions
Status: ✅ CERTIFIED
- Verified: `payments`, `patient_wallets`, `organization_wallets`, `service_pricing`.
- Fixed: Explicit UUID casting in RLS (fixed `operator does not exist` error).

---

## 📝 Audit Rules
1. **Schema**: Verify all IDs and Foreign Keys are `UUID`.
2. **RLS**: No `SELECT` from the table under check in the policy (use `SECURITY DEFINER` helpers).
3. **CRUD**: Test via script `docs/archive/test-scripts/audit-[module].js`.
4. **Sync**: Ensure both App and Console see the same data points.
