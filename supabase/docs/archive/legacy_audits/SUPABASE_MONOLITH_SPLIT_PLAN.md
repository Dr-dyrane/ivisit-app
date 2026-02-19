# 🏯 Supabase Monolith Split Plan (Modular Baseline)

**Date**: February 18, 2026  
**Status**: Approved / Execution Phase  
**Objective**: Transition from a single unwieldy 26k-line monolith to a **Modular Baseline** for faster iteration, easier audits, and clear ownership.

## 1. The Strategy: "Feature-Based Modular Splitting"
We are abandoning the "one giant file" approach in favor of **8 logical modules**. Each module contains the Table definitions, unique Triggers, and related Functions for that domain. All RLS policies are consolidated into a final security layer.

## 2. The 8-Module Architecture

| Order | Module | Target File | Description |
| :--- | :--- | :--- | :--- |
| **01** | **Infra** | `01_infra.sql` | Extensions (`postgis`, `pgcrypto`), Core Utils (`handle_updated_at`), Shared Types. |
| **02** | **Identity** | `02_identity.sql` | `profiles`, `user_roles`, `user_sessions`, `id_mappings`, `preferences`, `medical_profiles`, `subscribers`. |
| **03** | **Facilities** | `03_org_structure.sql` | `organizations`, `hospitals`, `doctors`. |
| **04** | **Logistics** | `04_logistics.sql` | `ambulances`, `hospital_rooms`, `emergency_requests`, `visits`, `hospital_import_logs`. |
| **05** | **Finance** | `05_finance.sql` | `organization_wallets`, `patient_wallets`, `ivisit_main_wallet`, `wallet_ledger`, `payments`, `payment_methods`, `insurance_policies`, `pricing`. |
| **06** | **Ops & Content** | `06_ops_content.sql` | `notifications`, `support_tickets`, `support_faqs`, `health_news`, `documents`, `access_requests`, `document_invites`. |
| **07** | **Analytics** | `07_analytics.sql` | `user_activity`, `admin_audit_log`, `trending_topics`, `search_history`, `search_events`. |
| **08** | **Security (RLS)** | `08_rls_security.sql` | All `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements. Includes RLS helper functions. |

## 3. Implementation Workflow

### Step 1: Baseline Extraction
Extract the "Clean" table definitions from `20260218190000_uuid_native_schema.sql` into their respective module files.

### Step 2: Behavior Restoration
Identify and restore crucial Triggers and Functions from the `backups/migrations_backup_/` directory:
- `handle_new_user()` → `02_identity.sql`
- `sync_emergency_to_history()` → `04_logistics.sql`
- `auto_assign_driver()` → `04_logistics.sql`
- `process_payment_with_ledger()` → `05_finance.sql`

### Step 3: Security Unification
Extract all RLS policies into `08_rls_security.sql`. Use `SECURITY DEFINER` functions to prevent recursion, following the **Nuclear De-Recursion** standard.

### Step 4: Verification & Sync
1. Run local validation.
2. Update the `scripts/sync_to_console.js` to handle the multi-file baseline.
3. Replace the old migration history with the new **Grouped v2.0 Baseline**.

## 4. Deletion Checklist
- [ ] `docs/archive/POST_PAYMENT_EMERGENCY_FLOW_PLAN.md` (Done)
- [ ] `docs/archive/POST_PAYMENT_FLOW_ANALYSIS.md` (Done)
- [ ] `docs/project_state/baseline-documentation.md` (Done)
- [ ] `20260218190000_uuid_native_schema.sql` (Pending extraction)
- [ ] `20260218060000_consolidated_schema.sql` (Confirm deletion)

---
*Architected for clarity, scale, and surgical precision.*
