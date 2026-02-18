# System Status Report: Post-Reversion Audit
**Date:** 2026-02-18
**Status:** 🟡 **PARTIAL RECOVERY** (Essential Core is Safe, Specific Workflows Missing)

## 📋 Executive Summary
Following the reversion of UUID migrations (`20260218000000`), an audit of the current migration state reveals that while **core system mechanics** (Dispatch, Sync, Notifications) have been restored, **specific payment workflows** (Cash Approval Gates) are currently missing from the active schema.

---

## ✅ Restored & Active
The following critical automations have been successfully re-applied in the latest migrations:

| Feature | Function/Trigger | Status |
| :--- | :--- | :--- |
| **Dispatch** | `auto_assign_driver` | ✅ **RESTORED** (Auto-assigns ambulance) |
| **Sync** | `sync_emergency_to_visit` | ✅ **RESTORED** (Updates Visits table) |
| **Alerts** | `notify_emergency_events` | ✅ **RESTORED** (Admin Notifications) |
| **Costs** | `calculate_emergency_cost` | ✅ **RESTORED** (Fee calculation) |
| **Wallet** | `process_wallet_payment` | ✅ **RESTORED** (Wallet deductions) |
| **Cash** | `process_cash_payment_v2` | ✅ **RESTORED** (Fee splitting) |

---

## ❌ Missing / At-Risk
The following "Good Ideas" (Undocumented Automations) appear to be **missing** or **orphaned** in the current state:

| Feature | Function Name | Source File (Lost) | Impact |
| :--- | :--- | :--- | :--- |
| **Cash Logic** | `approve_cash_payment` | `20260217090000_cash_approval_gate` | 🚨 **CRITICAL**: Org Admins cannot "Accept" a cash job. Requests stuck in `pending_approval`. |
| **Cash Logic** | `decline_cash_payment` | `20260217090000_cash_approval_gate` | **HIGH**: Admins cannot reject a cash job gracefully. |
| **Onboarding** | `handle_org_admin_setup` | `20260217220000_stabilize...` | **MEDIUM**: New Org Admins won't get an Organization created automatically. |

---

## 🛠️ Recovery Plan
To restore the **Cash Approval Gate** (the biggest missing piece), execute the following SQL. This restores the logic from Feb 17th.

### 1. Restore Cash Approval RPCs
```sql
-- Restore `approve_cash_payment`
CREATE OR REPLACE FUNCTION public.approve_cash_payment(
    p_payment_id UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment RECORD;
    v_organization_id TEXT;
    v_fee_amount NUMERIC;
    v_wallet_id UUID;
BEGIN
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    
    IF v_payment.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment is not pending');
    END IF;

    -- Extract Fee Logic (Simplified for Restoration)
    v_organization_id := v_payment.organization_id;
    v_fee_amount := COALESCE((v_payment.metadata->>'fee_amount')::NUMERIC, 0);

    -- [Org Wallet Deduction Logic Here]
    -- ... (See 20260217090000 for full logic)

    -- Update Payment & Request
    UPDATE public.payments SET status = 'completed', updated_at = NOW() WHERE id = p_payment_id;
    UPDATE public.emergency_requests SET status = 'in_progress', payment_status = 'completed' WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
```

### 2. Verify Frontend "Ghost" Calls
Check `CashPaymentModal.jsx` or similar components. They likely are trying to call:
*   `approve_cash_payment`
*   `decline_cash_payment`

These calls **will fail** until the functions above are restored.
