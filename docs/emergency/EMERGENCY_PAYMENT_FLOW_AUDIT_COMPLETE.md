# Emergency Payment Flow — Complete Audit

## Date: 2026-02-17
## Status: ✅ IMPLEMENTED

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│ CARD PAYMENT (No Approval Gate)                  │
├──────────────────────────────────────────────────┤
│ User → Confirm → RPC → Payment(completed)        │
│ → Emergency(in_progress) → Visit(upcoming)        │
│ → Fee deducted immediately → Ambulance dispatched │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ CASH PAYMENT (3-Phase Approval Gate)             │
├──────────────────────────────────────────────────┤
│ Phase 1: Creation                                │
│   User → Confirm → RPC → Payment(pending)        │
│   → Emergency(pending_approval) → Visit(pending)  │
│   → Org admin notified                           │
│   → User sees "Waiting for Approval" screen      │
│                                                  │
│ Phase 2a: APPROVED                               │
│   Org admin taps Approve → approve_cash_payment  │
│   → Fee deducted from org wallet                 │
│   → Payment(completed) → Emergency(in_progress)  │
│   → Visit(upcoming) → Patient notified           │
│   → Modal auto-transitions → Ambulance dispatched│
│                                                  │
│ Phase 2b: DECLINED                               │
│   Org admin taps Decline → decline_cash_payment  │
│   → Payment(declined) → Emergency(payment_declined)│
│   → Patient notified → Modal returns to checkout │
│   → User picks different payment method          │
│   → Selections preserved (hospital, ambulance)   │
└──────────────────────────────────────────────────┘
```

---

## Files Changed

### Database (Migrations)

| File | Purpose |
|------|---------|
| `20260217090000_cash_approval_gate.sql` | Modified `create_emergency_with_payment` RPC for cash approval gate. Added `approve_cash_payment` and `decline_cash_payment` RPCs. Updated `sync_emergency_to_history` trigger. |
| `20260217090100_cross_user_notifications.sql` | Added RLS policy allowing any authenticated user to INSERT notifications for any user (required for cross-user notification dispatch). |

### Services

| File | Changes |
|------|---------|
| `emergencyRequestsService.js` | Added `PENDING_APPROVAL` and `PAYMENT_DECLINED` statuses. Updated `list()` to include `pending_approval` in active statuses. Updated `create()` return to include `requiresApproval`, `paymentStatus`, `feeAmount`. |
| `notificationDispatcher.js` | Added `dispatchToUser()` for cross-user notifications. Added `dispatchCashApprovalToOrgAdmins()` for org admin notification. Added `dispatchPaymentStatusToPatient()` for approval/decline feedback. Added `pending_approval` and `payment_declined` cases to `dispatchEmergencyUpdate()`. |
| `paymentService.js` | Added `approveCashPayment()` and `declineCashPayment()` methods that call the RPCs and send patient notifications. |

### Hooks

| File | Changes |
|------|---------|
| `useRequestFlow.js` | After `createRequest` succeeds with `requiresApproval: true`, dispatches cash approval notification to org admins and waiting notification to patient. Returns `requiresApproval`, `paymentId`, `paymentStatus` in result. |
| `EmergencyContext.jsx` | Updated `isActiveStatus` to include `pending_approval`. This ensures requests waiting for approval are hydrated on app launch and correctly tracked as active. |

### Components

| File | Changes |
|------|---------|
| `EmergencyRequestModal.jsx` | Added `pendingApproval` state and `approvalSubRef`. Added real-time Supabase subscription for `emergency_requests` status changes. Added `waiting_approval` step with approval waiting UI. On approval → auto-transition to dispatched. On decline → return to checkout with preserved selections. Updated header for waiting state (orange, no back button). |
| `TripSummaryCard.jsx` | Updated to display "Awaiting Approval" status. Hides responder widget and progress bar when status is `pending_approval`. |
| `BedBookingSummaryCard.jsx` | Updated to display "Awaiting Approval" status. Hides progress tracking when status is `pending_approval`. |

---

## Status Mapping

| Emergency Status | Visit Status | Payment Status | Meaning |
|---|---|---|---|
| `pending_approval` | `pending` | `pending` | Cash payment awaiting org admin approval |
| `in_progress` | `upcoming` | `completed` | Approved / Card payment — ambulance dispatched |
| `accepted` | `upcoming` | `completed` | Ambulance accepted the request |
| `arrived` | `in-progress` | `completed` | Ambulance arrived |
| `completed` | `completed` | `completed` | Trip finished |
| `cancelled` | `cancelled` | varies | Cancelled by user or system |
| `payment_declined` | `cancelled` | `declined` | Org admin declined cash payment |

---

## Notification Flow

### On Cash Payment Created:
1. **To org_admin users** → "Cash Payment Approval Required" (URGENT, orange, action: `approve_cash_payment`)
2. **To patient** → "Awaiting Hospital Approval" (via `dispatchEmergencyUpdate`)

### On Approval:
1. **To patient** → "Payment Approved — Dispatching" (GREEN, action: `view_request`)

### On Decline:
1. **To patient** → "Cash Payment Declined" (RED, action: `retry_payment`)

---

## State Preservation

When a cash payment is declined, the following user selections are **preserved**:
- Selected hospital
- Selected ambulance type  
- Selected specialty
- Bed type/count (for bookings)
- Cost calculation

Only `selectedPaymentMethod` is cleared, sending the user back to the payment step to pick an alternative method.

---

## Real-Time Subscription

The modal subscribes to `postgres_changes` on `emergency_requests` filtered by the specific request UUID. This means:
- Only relevant updates are received
- Channel auto-cleans up on component unmount
- No polling — instant response when org admin acts

---

## RPC Security

All three RPCs use `SECURITY DEFINER`:
- `create_emergency_with_payment` — Creates payment + emergency atomically
- `approve_cash_payment` — Deducts fee, completes payment, dispatches
- `decline_cash_payment` — Marks declined, no fee deducted

`approve_cash_payment` records `approved_by: auth.uid()` in metadata for audit trail.
`decline_cash_payment` records `declined_by: auth.uid()` in metadata for audit trail.

---

## Wallet Ledger Audit Trail

On approval:
- Organization wallet: DEBIT `−$fee` with description "Platform Fee (Cash Job Approved)"
- Platform wallet: CREDIT `+$fee` with description "Fee from Approved Cash Job"
- Both reference `payment_id` for traceability

On decline:
- No wallet movements (fee was never deducted)

---

## 2026-02-17 Update: V2 Stabilization & Notification Engine

The system has been further hardened to ensure zero-latency feedback and unified financial reporting.

### 1. Automated Notification Engine (Trigger-Based)
Implemented a centralized `notify_emergency_events` database trigger. This replaces ad-hoc service-side notifications with guaranteed system-level alerts:
- **Org Admins**: Instantly notified of NEW incoming requests.
- **Patients**: Notified the millisecond an Admin clicks "Approve" (Cash collected).
- **Status Updates**: Automated "Help is on the way" and "Service Completed" notifications.

### 2. Financial Ledger Robustness
- **Org-Attributed Reporting**: Platform fee credits in `ivisit_main_wallet` now carry the `organization_id`. This allows iVisit admins to generate revenue reports per organization.
- **RLS Standardized**: Fixed a gap where Admins were being restricted from viewing certain ledger entries. Admins now have guaranteed visibility across all wallets and payments.

### 3. Console UX Enhancements
- **Multi-Source Financial View**: Added a "Service Payments" tab to the Wallet Management page. Users can now cross-reference `wallet_ledger` entries with raw `payments` records.
- **Crash Prevention**: Added null-guards for `reference_id` link rendering in the transaction list.
- **Live Refresh**: Added a manual refresh button to the ledger to accommodate for webhook/RPC propagation delays.

---
**Audit Complete.** Flow is now fully automated and observable from both Patient App and Provider Console.
