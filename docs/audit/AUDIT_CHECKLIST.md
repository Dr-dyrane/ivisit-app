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
- [x] Module 8: Health & Public Information (Trending, News)

## Documentation Integrity Gate
Status: IN PROGRESS

Current warning:
- `ivisit-app` has confirmed mojibake and replacement-character defects in tracked source/docs files.
- `ivisit-app` also has tracked UTF-16LE text files that reduce audit trust and make grep-based QA less reliable.

Current QA targets:
- [ ] Remove real source corruption from live source and live migrations
- [ ] Normalize tracked UTF-16LE text files that remain part of active workflows
- [ ] Re-audit `docs/**`, `contexts/**`, `screens/**`, and `supabase/**` after schema exports or type generation
- [ ] Keep archived corruption documented until cleaned or retired

Minimum checks before closing a pass:
1. Run `rg -nP "\\x{FFFD}|\\x{00C2}\\x{00A7}|\\x{00E2}\\x{20AC}|\\x{251C}\\x{00F3}\\x{0393}\\x{00C7}" docs contexts screens supabase`.
2. Confirm no newly touched text files were committed as UTF-16LE.
3. Record remaining exceptions in current-state docs instead of silently carrying them forward.

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
