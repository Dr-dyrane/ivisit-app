# 🌊 iVisit Fluid Flow Manifesto (v2.0)

This document maps the atomic, fluid data transitions within the iVisit ecosystem. By eliminating redundant mapping tables and using **Prefix-Driven Resolution**, our data flows from Patient to Provider without friction.

---

## 1. The ID Architecture (No-Mapping)
We use a **Unified Display ID** system where the prefix dictates the truth.
- `USR-` : `public.profiles` (Identity)
- `ORG-` : `public.organizations` (Structure)
- `HSP-` : `public.hospitals` (Care Point)
- `REQ-` : `public.emergency_requests` (Logistics)
- `VIST-`: `public.visits` (Lifecycle)
- `AMB-` : `public.ambulances` (Asset)
- `DOC-` : `public.doctors` (Human Capital)
- `PAY-` : `public.payments` (Finance)

**Fluid Note**: Since every `display_id` is unique and indexed within its table, we resolve UUIDs via a virtual resolver rather than a static table.

---

## 2. The Emergency Fluid Path
Trace a request from "Dispatch" to "Recovery".

### Phase A: Initiation
1. **Patient Action**: `emergencyRequestsService.create()` calls `create_emergency_v4`.
2. **Atomic Trigger**: `stamp_entity_display_id` fires.
    - Sets `REQ-XXXXXX` on the record.
    - No external table writes.
3. **Fluid Sync**:
    - `public.visits` entry is automatically created with `status = 'pending'`.
    - `public.payments` entry created with `status = 'pending'` (if cash) or `completed` (if card).

### Phase B: Financial Guard (Cash Flow)
1. **Scenario**: Patient chooses Cash.
2. **State Leak Prevention**: Emergency Request status is held at `pending_approval`.
3. **Approval Flow**: 
    - `org_admin` calls `approve_cash_payment`.
    - **Trigger**: Org Wallet balance is adjusted.
    - **Transition**: Request moves to `in_progress`. Visit moves to `active`.

### Phase C: Logistics Coupling
1. **Asset Assignment**: `auto_assign_driver` (Logistics Trigger).
2. **Status Reflection**:
    - `ambulances.status` -> `on_duty`.
    - `emergency_requests.ambulance_id` -> `UUID`.
    - **Realtime Sync**: Update dispatched to Patient via Supabase Channels.

---

## 3. Financial Fluidity (Stripe)
1. **Stripe Webhook**: `payment_intent.succeeded`.
2. **Logic**:
    - Resolve `PAY-XXXXXX` via metadata.
    - Update `public.payments` -> `completed`.
    - Update `public.emergency_requests` -> `in_progress`.
3. **Fee Distribution**:
    - Trigger `process_payment_distribution` fires.
    - Credits Platform Wallet.
    - Credits Organization Wallet.
    - Logs `wallet_ledger` entries.

---

## 4. Why This is "Fluid"
- **Zero Redundancy**: No `id_mappings` table to corrupt or bloat.
- **Atomic Integrity**: RPCs handle multi-table writes (Request + Visit + Payment) in a single transaction.
- **Traceability**: Every record carries its own `display_id`, making logs and UI development effortless.

---
*Dictated by Antigravity — RESTORED 2026-02-18*
