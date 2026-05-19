# Context-Enriched Architecture Audit — 2026-04-08

> Scope: `ivisit-app` + `ivisit-console` + `ivisit` + `iVisit-docs` + Supabase migrations/RPCs
> Mode: read-only audit for grounding and implementation safety
> Goal: enrich system context so future emergency/dashboard work is not blindsided by hidden backend or cross-repo constraints

---

## Executive Read

The emergency stack is **not missing its core backend**.
It already has a substantial end-to-end system for:

- hospital discovery
- ambulance dispatch
- bed reservation support
- payment approval / decline
- doctor assignment
- visit sync after emergency completion

The current product risk is mainly in **orchestration, deterministic loading, and route handoff** — not missing infrastructure.

---

## Use Cases Indexed

| Use case | Current entry | Main components | Current reality | Main risk |
|---|---|---|---|---|
| First-time panicked user | `screens/WelcomeScreen.jsx` | `WelcomeScreenOrchestrator`, `RequestAmbulanceScreen.jsx` | `Continue` still routes to `/(auth)/request-help` | not yet true map-first activation |
| Returning signed-in user | `AuthContext.jsx` + `EmergencyContext.jsx` | session restore, active trip / booking state | viable recovery path exists | stale trip sync if state resumes late |
| Sparse-coverage user | `useHospitals.js` + `coverageModeService.js` + `demoEcosystemService.js` | hybrid/demo fallback | bootstrap exists | fetch/bootstrap race can cause instability |
| Book ambulance | `RequestAmbulanceScreen.jsx` + `EmergencyRequestModal.jsx` | triage → dispatch confirmation → payment/tracking | core flow exists | still fragmented by intake glue |
| Reserve bed | `BookBedRequestScreen.jsx` + `EmergencyContext.jsx` | bed request + booking state | backend support exists | user-facing path is less clearly unified |
| Operator dispatch / complete | `ivisit-console/frontend/src/components/pages/EmergencyRequestsPage.jsx` | `emergencyService.js`, `emergencyResponseService.js` | console can see and act on emergencies | cross-surface sync clarity still needs polish |

---

## Frontend Architecture Map

### Primary route and screen ownership

- **Welcome / activation:** `screens/WelcomeScreen.jsx`
- **Auth-side urgent handoff:** `app/(auth)/request-help` → `screens/RequestAmbulanceScreen.jsx`
- **Authenticated emergency hub:** `screens/EmergencyScreen.jsx`
- **Bed flow surface:** `screens/BookBedRequestScreen.jsx`
- **Map shell:** `components/map/FullScreenEmergencyMap.jsx`
- **Bottom-sheet orchestration anchor:** `components/emergency/BottomSheetController.jsx`
- **Dispatch/payment state machine:** `components/emergency/EmergencyRequestModal.jsx`

### State ownership

- **`AuthContext.jsx`** — token/user/session restoration
- **`EmergencyContext.jsx`** — active ambulance trip, active bed booking, hospital data, coverage mode, realtime subscriptions
- **`GlobalLocationContext.jsx`** — coordinates and location readiness
- **`GlobalMapContext.jsx`** — shared map instance ownership

### Current flow reality

Verified in `screens/WelcomeScreen.jsx`:

```js
if (intent === "emergency") {
  setIsOpeningEmergency(true);
  router.push("/(auth)/request-help");
}
```

This means the locked welcome surface is visually map-first in spirit, but the runtime handoff is **still intake/auth-first**.

---

## Hospital / Coverage Runtime Map

### Core files

- `hooks/emergency/useHospitals.js`
- `services/hospitalsService.js`
- `services/coverageModeService.js`
- `services/demoEcosystemService.js`
- `services/mapboxService.js`

### Verified behavior

- hospital discovery lives in `useHospitals.js`
- demo/bootstrap can be triggered during the hospital fetch path
- coverage can resolve as `LIVE_ONLY`, `HYBRID`, or `DEMO_ONLY`
- Mapbox reverse geocoding support already exists in `services/mapboxService.js`
- place-name normalization is **not yet promoted into the global location truth layer**

### Ground-truth risk

The current system is vulnerable to **overlapping fetch/bootstrap cycles** when location or coverage state changes quickly. This is the main architecture risk for the map-first dashboard work.

---

## Backend Map — Verified Database Surface

### Table inventory fetched from migrations

A fresh terminal extraction from checked-in Supabase migrations showed the same table families in both:

- `ivisit-app/supabase/migrations/*.sql`
- `ivisit-console/frontend/supabase/migrations/*.sql`

### Core emergency/identity/org tables

#### Identity & patient
- `profiles`
- `preferences`
- `medical_profiles`
- `emergency_contacts`
- `user_roles`
- `user_sessions`
- `id_mappings`
- `subscribers`

#### Organizations & providers
- `organizations`
- `hospitals`
- `hospital_import_logs`
- `doctors`
- `doctor_schedules`
- `emergency_doctor_assignments`
- `ambulances`

#### Emergency runtime
- `emergency_requests`
- `emergency_status_transitions`
- `visits`
- `service_pricing`
- `room_pricing`

#### Finance / payment / coverage
- `payments`
- `payment_methods`
- `organization_wallets`
- `patient_wallets`
- `ivisit_main_wallet`
- `wallet_ledger`
- `insurance_policies`
- `insurance_billing`

#### Ops / content / analytics
- `notifications`
- `support_tickets`
- `support_faqs`
- `documents`
- `health_news`
- `user_activity`
- `admin_audit_log`
- `search_history`
- `search_selections`
- `search_events`
- `trending_topics`

### Important schema facts

Verified in `20260219000300_logistics.sql`:

- `emergency_requests` stores:
  - `user_id`, `hospital_id`, `ambulance_id`
  - `status`, `payment_status`, `service_type`
  - pickup / destination / patient / responder location fields
  - responder snapshot fields
  - doctor assignment linkage
  - total cost and lifecycle timestamps

- `ambulances` stores:
  - dispatchable status lifecycle
  - current call
  - ETA
  - vehicle and org linkage

- `visits` persists downstream history after emergency completion

---

## Backend RPC / Function Inventory

Verified across `20260219010000_core_rpcs.sql`, `20260219000800_emergency_logic.sql`, and automation migrations.

### Core patient / console emergency RPCs
- `create_emergency_v4`
- `console_create_emergency_request`
- `console_update_emergency_request`
- `console_dispatch_emergency`
- `console_complete_emergency`
- `console_cancel_emergency`
- `patient_update_emergency_request`

### Dispatch / availability / pricing helpers
- `nearby_hospitals`
- `nearby_ambulances`
- `get_available_ambulances`
- `get_available_doctors`
- `assign_ambulance_to_emergency`
- `auto_assign_ambulance`
- `assign_doctor_to_emergency`
- `calculate_emergency_cost_v2`
- `cancel_bed_reservation`

### Cash / wallet flow
- `approve_cash_payment`
- `decline_cash_payment`
- `process_cash_payment`
- `process_wallet_payment`
- `check_cash_eligibility`
- `retry_payment_with_different_method`

### Automations
- `sync_emergency_to_visit`
- `auto_assign_doctor`
- `handle_ambulance_unavailability_failover`
- `handle_doctor_unavailability_failover`
- `notify_emergency_events`

**Conclusion:** the backend is materially more capable than the current UI exposes.

---

## Cross-Repo Alignment Check

### `ivisit-app`
Owns the patient-facing runtime, location, map, intake, and emergency context.

### `ivisit-console`
Owns operator visibility and actions over `emergency_requests`, including dispatch and completion flows.

### `ivisit`
Contains adjacent product/web artifacts and docs, but the current emergency runtime center of gravity is now `ivisit-app`.

### `iVisit-docs`
Contains company/data-room documents; relevant for reference, but not the emergency runtime source of truth.

### Verified alignment
The **schema and RPC inventory is mirrored** between `ivisit-app` and `ivisit-console` migration trees, which is a strong sign that patient and console systems are meant to run on one shared emergency backend contract.

---

## Main Blindspots / Risks

1. **Welcome-to-map contradiction**
   - Visual doctrine says calm native activation.
   - Runtime still routes to `/(auth)/request-help`.

2. **Hospital bootstrap determinism**
   - Fetch + fallback + coverage mode can overlap.
   - This is the main likely source of hospital flicker or inconsistent rendering.

3. **Cross-platform place naming**
   - Coordinates are globalized; the normalized human-readable place label is not yet a single shared truth.

4. **Bed-flow parity**
   - Backend support exists, but the app’s user-facing bed journey is not as unified or obvious as ambulance.

5. **Realtime trust and session recovery**
   - Realtime subscriptions exist, but cold-start and recovery behavior still deserve careful verification under background/restore cases.

---

## Grounding Notes for Future Work

To avoid losing track, keep these facts locked:

- The system already has a **real emergency backend contract**.
- `EmergencyContext.jsx` is the global truth anchor for trip/booking state.
- `BottomSheetController.jsx` is the right place to converge the Apple Maps-like shell.
- `useHospitals.js` is the most important hotspot for deterministic behavior.
- `mapboxService.js` already gives a path for normalized location naming.
- `console_dispatch_emergency` and related RPCs already support the operator plane.
- The next big win is orchestration stability, not inventing new backend entities.

---

## Best Immediate Documentation Follow-Through

1. keep this file as the **current architecture grounding note**
2. link it from `docs/FLOW.MD`
3. use it as the baseline before touching:
   - `useHospitals.js`
   - `GlobalLocationContext.jsx`
   - `BottomSheetController.jsx`
   - `HospitalMarkers.jsx`
   - welcome → emergency handoff routing

---

## Evidence Files Used In This Run

- `screens/WelcomeScreen.jsx`
- `screens/RequestAmbulanceScreen.jsx`
- `screens/BookBedRequestScreen.jsx`
- `contexts/EmergencyContext.jsx`
- `contexts/GlobalLocationContext.jsx`
- `hooks/emergency/useHospitals.js`
- `services/demoEcosystemService.js`
- `services/coverageModeService.js`
- `services/mapboxService.js`
- `components/emergency/BottomSheetController.jsx`
- `components/map/HospitalMarkers.jsx`
- `supabase/migrations/20260219000200_org_structure.sql`
- `supabase/migrations/20260219000300_logistics.sql`
- `supabase/migrations/20260219000800_emergency_logic.sql`
- `supabase/migrations/20260219010000_core_rpcs.sql`
- `ivisit-console/frontend/src/components/pages/EmergencyRequestsPage.jsx`
- `ivisit-console/frontend/src/services/emergencyService.js`
- `ivisit-console/frontend/src/services/emergencyResponseService.js`
- `ivisit-console/frontend/supabase/docs/SCHEMA_SNAPSHOT.md`

---

## Bottom Line

The architecture is **richer than it first appears**.
The main missing piece is a **stable, map-first orchestration layer** that makes the existing backend feel coherent, immediate, and native across web, iOS, and Android.
