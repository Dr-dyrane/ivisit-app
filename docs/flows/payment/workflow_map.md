---
status: living
owner: product
last_updated: 2026-07-15
---

# Payment Workflow Map

This map covers both emergency in-flow payments and wallet/payment-management flows.

## Payment Lanes

1. Embedded emergency payment lane (inside request modal).
2. Standalone payment and wallet lane (`PaymentScreen`).

## Lane A: Embedded Emergency Payment

### Entry Points

- `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
- `components/emergency/EmergencyRequestModal.jsx`
- `hooks/emergency/useRequestFlow.js`

### Runtime Path

1. User selects payment method in emergency modal.
2. If `cash`, client checks org eligibility:
   - `paymentService.checkCashEligibility`
   - RPC `check_patient_cash_eligibility` recomputes canonical pricing and the
     platform fee, evaluates the organization wallet server-side, and returns
     only a boolean. The patient never receives balance or fee details.
3. Request creation call:
   - `useRequestFlow.handleRequestInitiated` -> `emergencyRequestsService.create`
   - RPC `create_emergency_v4` creates `emergency_requests` + `payments` (+ `visits`)
4. If saved card:
   - request is created in a dispatch-gated state (`pending_approval` internally, `payment_status = pending`)
   - `create-payment-intent` reuses the already-computed emergency fee instead of recalculating fee from the gross patient total
   - client confirms the saved Stripe card
   - Stripe webhook calls `complete_card_payment`
   - only then does dispatch release and the sheet move to the active ambulance lane
5. If cash:
   - Request enters `pending_approval`
   - `notificationDispatcher.dispatchCashApprovalToOrgAdmins`
   - RPC `notify_cash_approval_org_admins`
   - Modal waits on realtime approval channels
6. Org admin decision:
   - Approve: RPC `approve_cash_payment` -> request moves forward
   - Decline: RPC `decline_cash_payment` -> request becomes `payment_declined`

### Demo Cash Approval Boundary

The patient demo flow preserves the same visible confirmation and tracking
handoff but does not settle money. `demo-approve-cash-payment` is restricted to
demo hospitals and invokes service-role-only `approve_demo_cash_payment`, which
marks the demo payment/request ready for dispatch with `settlement = simulated`.
It must never call `approve_cash_payment`, write `wallet_ledger`, or alter an
organization/platform wallet. Real fee behavior remains covered by the explicit
manifest-owned finance-contract test lane.

### Current Emergency Pricing Contract

The server owns the patient price. `resolve_emergency_pricing` is shared by
`calculate_emergency_cost_v2` and `create_emergency_v4`; the map may use raw
pricing rows for service capability and labels, never for the payment amount.

For ambulance requests, the resolver applies this non-blocking order:

1. Hospital-configured exact BLS/ALS/CCT tier.
2. Global exact tier baseline.
3. Hospital generic ambulance rate, hospital base price, global generic ambulance rate, then the server default.

If an organization has not asserted an exact service price, the selected
service still proceeds. The server fallback is the definitive user price for
that request, with `pricing_source`, `pricing_is_fallback`, and resolved tier
stored in payment metadata and returned to the client.

`create_emergency_v4` persists that same canonical total to both
`emergency_requests.total_cost` and `payments.amount`. Card, wallet, and cash
must reconcile to that result; they must never create a client-side substitute.

### Fee And Card Lane

Current backend/finance truth treats `ivisit_fee_amount` as settlement metadata
inside the canonical payment amount: organization settlement is reduced by the
fee and iVisit receives that fee. The patient-facing total is therefore the
server canonical total, not a client-added surcharge.

- `services/pricingService.augmentEmergencyCostForCheckout(...)` preserves the
  server total and only adapts its display breakdown.
- `/map` obtains a server quote for the chosen ambulance tier before the payment
  surface and uses the final server total returned by creation.
- `create-payment-intent` must charge the existing canonical `payments.amount`.
- Dispatch is not released on card selection alone; it releases only after
  Stripe confirmation and webhook finalization via `complete_card_payment`.

Historical April documents described a temporary fee-inclusive UI model. They
are historical only; changing the long-term fee business policy requires a
coherent backend, finance, card, cash, wallet, and disclosure change rather
than another client-side surcharge.

### Current Billing Currency Truth

- backend pricing and payment truth is still USD-first today
- client UI must not guess local billing currency from location or device country
- immediate display rule is: render backend truth through the shared symbol-aware formatter such as `$150.00`
- the future per-country quote lane is tracked in [BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md](./BILLING_CURRENCY_QUOTE_LANE_PLAN_V1.md)

### Current Quote-Backed Runtime Adoption

The first live owners already rendering server quote snapshots are:

- `hooks/payment/usePaymentScreenModel.js`
- `components/payment/PaymentCheckoutVariant.jsx`
- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `components/map/views/commitPayment/MapCommitPaymentStageBase.jsx`
- `hooks/visits/useBookVisitScreenModel.js`
- `hooks/visits/usePaymentHistoryEntryQuery.js`

Guardrail at this stage:

- canonical amounts still drive payment eligibility and settlement
- quote snapshots drive visible totals, breakdowns, and history labels when available

## Lane B: Standalone Payment and Wallet

### Entry Points

- `app/(user)/(stacks)/payment.js`
- `screens/PaymentScreen.jsx`
- `services/paymentService.js`

### Runtime Path

1. `PaymentScreen` loads cost, wallet balance, payment history.
2. Method management:
   - `manage-payment-methods` edge function
   - `payment_methods` table reflection
3. Card checkout:
   - `create-payment-intent` edge function
4. Wallet checkout:
   - RPC `process_wallet_payment`
5. Cash admin/manual lane:
   - RPC `process_cash_payment_v2` (console/manual recording)
6. Top-up and payout operations:
   - `create-payment-intent` (top-up)
   - `create-payout` (org payout)

## Supabase Contracts

### Core Tables

- `payments`
- `payment_methods`
- `patient_wallets`
- `organization_wallets`
- `ivisit_main_wallet`
- `wallet_ledger`
- `organizations`
- `hospitals`
- `insurance_policies`
- `emergency_requests`

### RPCs

- `calculate_emergency_cost_v2`
- `process_wallet_payment`
- `process_cash_payment_v2`
- `approve_cash_payment`
- `decline_cash_payment`
- `notify_cash_approval_org_admins`
- `check_cash_eligibility` (Console finance projection for authorized admins)
- `check_patient_cash_eligibility` (patient-safe canonical-price preflight;
  boolean only)

### Edge Functions

- `manage-payment-methods`
- `create-payment-intent`
- `create-payout`
- `stripe-webhook`

## Trigger and Automation Dependencies

- `handle_new_organization` trigger auto-creates `organization_wallets` row.
- `create_emergency_v4` sets payment/request initial states atomically.
- `approve_cash_payment` mutates `payments`, `emergency_requests`, `visits`, and `wallet_ledger`.
- `decline_cash_payment` marks payment declined/failed and cancels request lifecycle.
- Stripe webhook (`supabase/functions/webhooks/stripe-webhook`) normalizes emergency payment sync to `payment_status = 'completed'` on successful card intents.

## Realtime and Confirmation Channels

- Cash approval waiting UI listens to:
  - `approval_<request>` (`emergency_requests`)
  - `approval_payment_<payment>` (`payments`)
  - Recovery-aware truth-sync on reconnect/recovery (no interval polling path)

## Permission Surface

- Patient actions are limited to their own request/payment context.
- Org admin approval path is isolated to approval RPCs.
- Critical payment/emergency/visit policies are scoped to `authenticated` role (no anon write path).
- Console-side actions should use console RPCs, not direct table writes.
- Financial writes are centralized in RPCs/edge functions for auditability.

## Failure and Degraded Behavior

- Missing org mapping for hospital blocks cash path with explicit UI error.
- Eligibility check prevents cash requests if org collateral is insufficient.
- Realtime channel interruptions trigger stale-event gating and canonical state refresh to keep request/payment state deterministic.
- Missing FX quote truth must fall back to explicit source currency display, not fake local conversion.

## Deterministic Validation Commands

- `npm run hardening:emergency`
- `npm run hardening:console-matrix`
- `npm run hardening:cash-matrix`

## Related Docs

- [payment.md](./payment.md)
- [../emergency/workflow_map.md](../emergency/workflow_map.md)
- [../../../supabase/docs/API_REFERENCE.md](../../../supabase/docs/API_REFERENCE.md)
- [../../../supabase/docs/REFERENCE.md](../../../supabase/docs/REFERENCE.md)
