# Post-Payment Dispatch Flow — Source of Truth

**Date**: 2026-02-17
**Status**: ✅ AUDITED & VERIFIED
**Scope**: What happens after payment is processed, through dispatch, to completion.

> **Design Principle**: Ambulances are **hospital-docked**, not roaming.
> Each hospital manages its own emergencies. Same-hospital dispatch only.

---

## 1. Payment → Dispatch Pipeline

### 1A. Card/Digital Payment (Immediate)

```
User confirms payment
  → create_emergency_v3(p_payment_data, p_request_data, p_user_id)
    → Payment record created (status: 'completed')
    → Emergency request created (status: 'in_progress')
    → Visit record created (status: 'upcoming')
    → Patient ledger entry logged (PENDING debit)
    → TRIGGER: process_payment_with_ledger fires
      → Org wallet credited (97.5%)
      → Platform wallet credited (2.5% fee)
      → Ledger entries created for both
    → TRIGGER: notify_emergency_events fires
      → All org_admins for this hospital notified
    → TRIGGER: auto_assign_driver fires ✅
      → Finds available ambulance at hospital_id
      → Sets responder_id, responder_name, ambulance_id
      → Marks ambulance 'on_trip'
```

### 1B. Cash Payment (Approval Gate)

```
User confirms cash payment
  → create_emergency_v3(...)
    → Payment record created (status: 'pending')
    → Emergency request created (status: 'pending_approval')
    → Visit record created (status: 'pending')
    → Patient ledger entry logged (status: PENDING)
    → TRIGGER: notify_emergency_events fires
      → Org admins notified of new request
    → TRIGGER: auto_assign_driver fires ⚠️
      → PROBLEM: Ambulance assigned before approval!
      → (See Issue #2 in Known Issues below)

  User sees "Waiting for Approval" screen
  Real-time subscription watches emergency_requests

  ┌─ Org Admin approves:
  │  → approve_cash_payment(p_payment_id, p_request_id)
  │    → Validates payment is 'pending'
  │    → Checks org wallet balance >= fee
  │    → Updates payment status to 'completed'
  │      → TRIGGER: process_payment_with_ledger fires
  │        → Fee deducted from org wallet
  │        → Platform wallet credited
  │    → Emergency request → 'in_progress'
  │    → TRIGGER: notify_emergency_events fires
  │      → Patient notified "Payment Approved"
  │
  └─ Org Admin declines:
     → decline_cash_payment(p_payment_id, p_request_id)
       → Payment → 'declined'
       → Emergency → 'payment_declined'
       → TRIGGER: notify_emergency_events fires
         → Patient notified "Payment Declined"
       → User returned to payment method selection
       → Selections preserved (hospital, ambulance type, specialty)
```

---

## 2. Dispatch & Assignment System

### What Exists Today (Verified)

| Component | Source | Behavior |
|:---|:---|:---|
| `auto_assign_driver()` | `20260126200000_enhanced_driver_automation.sql` | Trigger on INSERT. Finds first available ambulance at `NEW.hospital_id` with a linked driver profile. |
| `update_ambulance_status()` | Same migration | Trigger on UPDATE. Syncs ambulance status with request status (completed/cancelled → available). |
| `update_bed_availability()` | Same migration | Trigger on UPDATE. Decrements `hospitals.available_beds` on in_progress, restores on completed/cancelled. |
| `complete_trip(request_uuid)` | Same migration | RPC sets status='completed'. Triggers cascade. |
| `cancel_trip(request_uuid)` | Same migration | RPC sets status='cancelled'. Triggers cascade. |
| `discharge_patient(request_uuid)` | Same migration | RPC for bed bookings (completed). |
| `cancel_bed_reservation(request_uuid)` | Same migration | RPC for bed bookings (cancelled). |

### Assignment Logic (SQL)

```sql
-- From auto_assign_driver():
SELECT
  a.id as ambulance_id,
  a.profile_id as driver_id,
  p.full_name as driver_name,
  p.phone as driver_phone,
  a.type as ambulance_type,
  a.vehicle_number
FROM ambulances a
JOIN profiles p ON a.profile_id = p.id
WHERE a.status = 'available'
  AND a.hospital_id = NEW.hospital_id   -- ← Same hospital only
  AND p.provider_type = 'ambulance'
ORDER BY a.created_at ASC               -- ← FIFO, first available
LIMIT 1
```

**Key facts:**
- **Same-hospital dispatch only** — ambulances belong to hospitals
- **FIFO ordering** — oldest available ambulance assigned first
- **No distance calculation** — ambulances are docked, distance is irrelevant
- **No driver acceptance** — auto-assigned, driver gets no choice
- **No ETA calculation** — `estimated_arrival` exists on schema but is not populated

---

## 3. Status Lifecycle

### Emergency Request Status Flow

```
                    ┌─────────────────────┐
                    │   pending_approval   │ ← Cash only
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │ (approved)     │                 │ (declined)
              ▼                │                 ▼
        ┌───────────┐         │          ┌──────────────────┐
        │in_progress │ ←──────┘          │ payment_declined │
        └─────┬─────┘   (card payment)   └──────────────────┘
              │
              ▼
        ┌───────────┐
        │  accepted  │ ← Org admin or driver acknowledges
        └─────┬─────┘
              │
              ▼
        ┌───────────┐
        │  arrived   │ ← Ambulance at patient location
        └─────┬─────┘
              │
              ▼
        ┌───────────┐
        │ completed  │ ← Trip finished
        └───────────┘

        ┌───────────┐
        │ cancelled  │ ← Can happen from any active state
        └───────────┘
```

### Status-to-Status Sync Table

| Emergency Status | Visit Status | Payment Status | Ambulance Status | Bed Count |
|:---|:---|:---|:---|:---|
| `pending_approval` | `pending` | `pending` | — | — |
| `payment_declined` | `cancelled` | `declined` | — | — |
| `in_progress` | `upcoming` | `completed` | `on_trip` | −1 (bed only) |
| `accepted` | `upcoming` | `completed` | `on_trip` | — |
| `arrived` | `in-progress` | `completed` | `on_trip` | — |
| `completed` | `completed` | `completed` | `available` | +1 (bed only) |
| `cancelled` | `cancelled` | varies | `available` | +1 (bed only) |

---

## 4. Notification Flow (Automated via Triggers)

### Trigger: `notify_emergency_events` (INSERT + UPDATE)

| Event | Recipient | Title | Priority |
|:---|:---|:---|:---|
| New request created | Org admins for hospital | 🚨 New {ServiceType} Request | high |
| Payment approved (`payment_status` → completed) | Patient | ✅ Payment Approved | high |
| Request accepted/assigned | Patient | 🚑 Help is On The Way | high |
| Request completed | Patient | 🏁 Service Completed | normal |

---

## 5. RLS Policies (Verified)

### Emergency Requests

| Policy | Operation | Who |
|:---|:---|:---|
| Users see own requests | SELECT | `auth.uid() = user_id` |
| Org admins see their emergencies | SELECT | `profiles.role IN ('org_admin','admin')` AND hospital belongs to their org |
| Org admins update their emergencies | UPDATE | Same check |
| Admins see all | SELECT | Implied via `p_is_admin()` in other policies |

### Payments

| Policy | Operation | Who |
|:---|:---|:---|
| Users see own payments | SELECT | `auth.uid() = user_id` |
| Org admins see their payments | SELECT | `profiles.organization_id matches payment.organization_id` |
| Admins see all payments | ALL | `profiles.role = 'admin'` |

### Wallet Ledger

| Policy | Operation | Who |
|:---|:---|:---|
| Org admins see their ledger | SELECT | Org match via hospitals join |
| Admins see all ledger | ALL | `profiles.role = 'admin'` |

### Wallets

| Policy | Operation | Who |
|:---|:---|:---|
| Admins see main wallet | ALL | `p_is_admin()` |
| Admins see all org wallets | SELECT | `p_is_admin()` |
| Org admins see own wallet | SELECT | Org match |

---

## 6. Known Issues

### Issue #1: Notification Message Uses Geography as Text
**File**: `20260217103000_enhanced_notification_system.sql`, line ~29
**Problem**: `COALESCE(NEW.patient_location, 'Unknown Location')` — `patient_location` is `GEOGRAPHY`, will render as WKT.
**Fix**: Use `hospital_name` instead, or extract coords as `ST_AsText()`.
**Severity**: 🟡 Medium — Notifications will have ugly text.

### Issue #2: Auto-Assign Fires Before Cash Approval
**File**: `20260126200000_enhanced_driver_automation.sql`
**Problem**: `auto_assign_driver` trigger fires `AFTER INSERT`, meaning for cash payments (status=`pending_approval`), an ambulance gets locked to a request that hasn't been approved yet.
**Impact**: Ambulance unavailable while waiting for admin approval. If declined, ambulance had been blocked.
**Fix**: Add guard clause: `IF NEW.status IN ('in_progress', 'accepted') THEN ... END IF;`
**Severity**: 🟡 Medium — Blocks ambulance availability unnecessarily.

### Issue #3: Console Missing Migrations
**Problem**: `ivisit-console` is missing 6 migrations that exist in `ivisit-app`:
- `20260217092000_ledger_pending_support.sql`
- `20260217092100_fix_payment_id_linkage.sql`
- `20260217092500_org_admin_visibility.sql`
- `20260217093000_stabilization_and_notifications.sql`
- `20260217103000_enhanced_notification_system.sql`
- `20260217150000_ledger_organization_fk.sql`
**Impact**: Console's local DB may not match production.
**Fix**: Sync these 6 files to `ivisit-console/supabase/migrations/`.

### Issue #4: No ETA Calculation
**Current**: `estimated_arrival` column exists but is never populated.
**Future**: For docked ambulances, ETA = distance from hospital to patient location. Can be calculated client-side using Mapbox/Google Directions API.
**Severity**: 🟢 Low — Not blocking core flow.

### Issue #5: Driver Has No Accept/Reject Flow
**Current**: Driver auto-assigned with no ability to accept or reject.
**Future**: May want `assigned` → driver accepts → `accepted` flow.
**Severity**: 🟢 Low — Acceptable for MVP since ambulances are hospital-managed.

---

## 7. Edge Cases (Handled)

| Case | How It's Handled |
|:---|:---|
| Duplicate ambulance request | `create_emergency_v3` blocks if active ambulance request exists for user |
| Org wallet insufficient for cash fee | `create_emergency_v3` returns `ORG_INSUFFICIENT_FUNDS` error |
| Hospital has no linked org | `create_emergency_v3` returns error |
| No available ambulance at hospital | `auto_assign_driver` silently fails (no ambulance assigned, needs manual dispatch from console) |
| Payment approved twice | `approve_cash_payment` checks `status != 'pending'` and rejects |
| Ledger double-credit | `process_payment_with_ledger` uses `ledger_credited` metadata flag |
| Completed trip → ambulance freed | `update_ambulance_status` trigger sets ambulance back to 'available' |
| Cancelled trip → ambulance freed | Same trigger |
| Bed booking completed → bed freed | `update_bed_availability` trigger increments `available_beds` |

---

## 8. Data Points Available Post-Payment

### For Patient (App)
- Request ID (display_id like `AMB-877919`)
- Hospital name
- Service type
- Total cost
- Payment status
- Responder name, phone, vehicle type, plate (when assigned)
- Real-time status updates via Supabase subscription

### For Org Admin (Console)
- All requests for their hospitals
- Patient snapshot (name, medical profile)
- Payment details and method
- Wallet balance & ledger
- Ability to approve/decline cash payments
- Ability to mark dispatched/arrived/completed

### For Driver (App — Future)
- Currently no dedicated driver view
- Driver is a `profiles.provider_type = 'ambulance'` user
- They see their assignment via the ambulance record

---

**End of Audit. This document supersedes:**
- `POST_PAYMENT_EMERGENCY_FLOW_PLAN.md` (archived — contained speculative code)
- `POST_PAYMENT_FLOW_ANALYSIS.md` (archived — contained speculative code)
