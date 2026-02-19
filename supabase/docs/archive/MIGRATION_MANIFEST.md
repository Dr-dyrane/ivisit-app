# 🚀 Fluid Migration Strategy: The "Monolith Split"

This manifest outlines the strict execution order of our new modular migration system.
Each file represents a distinct functional domain. The sequence is critical for resolving dependencies (e.g., standardizing foreign keys and triggers).

## 📦 Migration Order & Contents

### 1. `20260219000000_infra.sql`
**Foundation Layer**
- **Extensions**: `uuid-ossp`, `postgis` (for geo-queries)
- **Utilities**: `handle_updated_at`, `generate_display_id` (The core ID generator)

### 2. `20260219000100_identity.sql`
**User & Profile Layer**
- **Tables**: `profiles`, `preferences`, `medical_profiles`, `subscribers`, `user_roles`, `user_sessions`
- **Logic**: Base schemas for user data.
- *Dependencies*: `auth.users` (Supabase generic)

### 3. `20260219000200_org_structure.sql`
**Provider Network Layer**
- **Tables**: `organizations`, `hospitals`, `doctors`
- **Logic**: Defines the hierarchy of care providers.
- *Dependencies*: `profiles` (for Org Admins, Doctors)

### 4. `20260219000300_logistics.sql`
**Operations Layer**
- **Tables**: `ambulances`, `emergency_requests`, `visits`
- **Logic**: The core business objects for emergency handling.
- *Dependencies*: `hospitals` (locations), `profiles` (patients/drivers)

### 5. `20260219000400_finance.sql`
**Financial Layer**
- **Tables**: `organization_wallets`, `patient_wallets`, `ivisit_main_wallet`, `wallet_ledger`, `payments`, `payment_methods`, `insurance_policies`
- **Logic**: Money movement and accounting.
- *Dependencies*: `organizations`, `profiles`, `emergency_requests`

### 6. `20260219000500_ops_content.sql`
**Support & Content Layer**
- **Tables**: `support_tickets`, `staff`, `audit_logs`, `health_articles`, `notifications`
- **Logic**: Operational support tools.

### 7. `20260219000600_analytics.sql`
**Data Layer**
- **Tables**: `app_analytics`, `error_logs`, `performance_metrics`
- **Logic**: System health tracking.

### 8. `20260219000700_security.sql`
**Security Layer**
- **Tables**: `suspicious_activity`, `blocked_ips`, `access_logs`
- **Logic**: Threat monitoring.

### 9. `20260219000800_emergency_logic.sql`
**Business Logic Layer (RPCs)**
- **Functions**: `create_emergency_v4`, `approve_cash_payment`, `process_cash_payment_v2`
- **Purpose**: Complex transactional logic that spans multiple tables.
- *Dependencies*: `emergency_requests`, `payments`, `wallets`, `visits`

### 10. `20260219000900_automations.sql` ⚡
**The Glue Layer (Triggers)**
- **Critical Fix**: Resolves circular dependencies.
- **Triggers**:
    - `handle_new_user`: Creates Profile + Wallet (Identity <-> Finance dependency)
    - `sync_emergency_to_visit`: Updates Logistics tables
    - `auto_assign_driver`: Links Logic & Logistics
- *Purpose**: Ensures all tables exist before triggers try to write to them.

### 11. `20260219010000_core_rpcs.sql`
**Discovery Layer**
- **Functions**: `nearby_hospitals`, `nearby_ambulances`
- **Purpose**: PostGIS queries for the client map.

---

## 🧪 Verification Plan
After applying these migrations (via `db push`), run the following tests:
1.  **Frontend Build**: Confirm `npm start` passes without import errors.
2.  **RPC Check**: Run `test_emergency_system.js` to verify functions exist.
3.  **Automation Check**: Run `test_profile_creation.js` to verify user cleanup/creation.

*Doc generated: 2026-02-19*
