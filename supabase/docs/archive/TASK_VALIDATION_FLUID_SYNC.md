# Task Validation: Fluid Flow Synchronization

## 🎯 Objective
Verify the transition from `id_mappings` table to prefix-driven virtual resolution and ensure atomic lifecycle operations (v4) are stable.

## 📋 Validation Strategy
For each change fix:
1. Create this validation document.
2. Implement/Modify the migration.
3. Deploy migration to local Supabase.
4. Execute test scripts from `docs/archive/test-scripts/`.
5. Verify edge cases (Invalid IDs, missing parameters, RLS blocks).
6. Log errors to `supabase/errors/migration/` or `supabase/errors/testing/`.

## 🛠️ Components for Verification
- [ ] `create_emergency_v4` RPC (App Side)
- [ ] `get_entity_id` RPC (Global Resolver)
- [ ] `approve_cash_payment` RPC (Console Side)
- [ ] `process_cash_payment_v2` RPC (Console Side)
- [ ] `stamp_entity_display_id` Trigger (Infrastructure)
- [x] Resolve Circular Dependencies (Identity <-> Finance)
- [ ] Verify `handle_new_user` Automation (Profile + Wallet Creation)

## 🧪 Edge Cases to Test
- **Case 1**: User attempts to resolve a non-existent display ID.
- **Case 2**: Organization with low balance attempts to approve a cash payment.
- **Case 3**: Emergency creation without payment data provided (Legacy mode).
- **Case 4**: Invalid UUID provided as `hospital_id` in `v4`.

## 📊 Error Logging
Errors must be logged with:
- Timestamp
- Category (DATABASE/RPC/RLS)
- Context (Parameters used)
- Resolution status

---
*Status: READY FOR START*
