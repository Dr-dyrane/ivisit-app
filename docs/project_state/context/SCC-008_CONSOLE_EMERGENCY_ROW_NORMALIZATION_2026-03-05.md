# SCC-008 Console Emergency Row Normalization (2026-03-05)

## Objective
Normalize console emergency request rows at ingress and migrate key UI/action surfaces to canonical fields so status/payment/ETA/bed rendering is consistent and refresh-safe.

## Scope
- Console emergency row normalization:
  - `ivisit-console/frontend/src/utils/emergencyRequestMapper.js`
- Console emergency fetch + enrichment:
  - `ivisit-console/frontend/src/components/pages/EmergencyRequestsPage.jsx`
- Console emergency UI surfaces:
  - `ivisit-console/frontend/src/components/views/EmergencyRequestTableView.jsx`
  - `ivisit-console/frontend/src/components/mobile/MobileEmergency.jsx`
  - `ivisit-console/frontend/src/components/modals/EmergencyDetailsModal.jsx`
  - `ivisit-console/frontend/src/components/modals/HospitalModal.jsx`
- Console emergency action/dispatch helpers:
  - `ivisit-console/frontend/src/utils/emergencyActions.js`
  - `ivisit-console/frontend/src/services/emergencyResponseService.js`

## Implemented Changes
1. Mapper boundary for emergency row contracts
- Added `normalizeEmergencyRequestRow` with canonical status normalization and compatibility aliases for legacy fields.
- Added `buildLatestPaymentMap` so payment method/status can be merged from `payments` using `emergency_request_id`.
- Added `isCashPaymentMethod` helper used by page/table/mobile flows.

2. Fetch enrichment in emergency requests page
- `EmergencyRequestsPage` now fetches latest related payment rows for the current request page and merges canonical payment method/status into each emergency row before state update.
- Completion flow now checks `payment_method` through the shared cash helper rather than direct legacy `payment_method_id`.

3. UI rendering migration to canonical fields
- Table view now renders payment badge from `payment_method`.
- Mobile approval logic now checks cash state from `payment_method`.
- Details modal now renders ETA from canonical `eta_display` (with compatibility fallback) and bed from `bed_category` (with fallback).
- Hospital modal reservation display now prefers `bed_category` and falls back to `bed_type`.

4. Dispatch/action compatibility hardening
- `emergencyActions` now prefers canonical `payment_method` before alias fallback.
- `emergencyResponseService` bed dispatch path now accepts canonical `bed_category` with `bed_type` fallback.

## Why This Slice
- SCC-007 aligned type contracts and schema helpers, but high-traffic emergency UI still read legacy aliases directly.
- Centralizing compatibility in one mapper reduces repeat field drift and avoids scattered fallback logic across UI components.

## Residual Follow-On
1. If needed, move payment enrichment into a shared server-side view/RPC to remove client-side payment lookups.
2. Remove mapper alias fallbacks once all upstream writers stop emitting legacy fields.
