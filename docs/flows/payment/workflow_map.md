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
   - Reads `organizations.ivisit_fee_percentage` + `organization_wallets.balance`
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

### Current Emergency Pricing Contract

Current audited truth:

- `calculate_emergency_cost_v2` is the base pricing source, but today it returns service subtotal only:
  - base price
  - distance surcharge
  - no explicit service/platform fee row yet
- legacy emergency payment UI then computes the patient-facing fee client-side from `organizations.ivisit_fee_percentage`
- `/map` `COMMIT_PAYMENT` must follow that same fee-inclusive display rule until the RPC is hardened

Locked interim money model for emergency checkout:

- `subtotal`
  - service subtotal from pricing RPC before service/platform fee
- `feeAmount`
  - fee derived from organization `ivisit_fee_percentage`
  - current legacy-compatible rule applies fee to `base_cost`
- `grossTotal`
  - `subtotal + feeAmount`
  - this is the number the patient should see in the summary, breakdown, and primary CTA
- `breakdown`
  - must include the fee row when `feeAmount > 0`

Current implementation note:

- shared fee-enrichment now lives in `services/pricingService.augmentEmergencyCostForCheckout(...)`
- both `EmergencyRequestModal.jsx` and `/map` `MapCommitPaymentStageBase.jsx` use that helper so the visible total stays aligned

### Locked Card Lane

Current live truth for the map card lane:

- `create_emergency_v4` still starts from the request snapshot subtotal contract so cash approval behavior remains stable
- `create-payment-intent` then becomes the card-lane source of truth:
  - it reuses the stored emergency fee amount
  - it charges the patient-facing gross total
  - it sets Stripe `application_fee_amount` from the stored fee, not from a second percentage pass on the gross total
  - it syncs the emergency payment row and request `total_cost` to that gross total before confirmation
- dispatch is not released on card selection alone
- dispatch is released only after Stripe confirmation + webhook finalization via `complete_card_payment`

Remaining cleanup, still separate from this lock:

- the request-creation subtotal/gross contract should eventually be unified so the first insert and the Stripe lane no longer need the follow-up total sync
- wallet checkout inside `/map` commit payment is still intentionally not treated as a truthful live lane here

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
- `check_cash_eligibility` (exists in API, client uses direct query fallback)

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

## Deterministic Validation Commands

- `npm run hardening:emergency`
- `npm run hardening:console-matrix`
- `npm run hardening:cash-matrix`

## Related Docs

- [payment.md](./payment.md)
- [../emergency/workflow_map.md](../emergency/workflow_map.md)
- [../../../supabase/docs/API_REFERENCE.md](../../../supabase/docs/API_REFERENCE.md)
- [../../../supabase/docs/REFERENCE.md](../../../supabase/docs/REFERENCE.md)
