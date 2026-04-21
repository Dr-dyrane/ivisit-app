# Map Flow Final Polish Audit (2026-04-20)

> Status: Active audit
> Scope: public welcome root -> `/map` explore -> decision -> commit -> payment -> tracking

## Delta Log (2026-04-21)

Recent implementation changes now locked:

- `COMMIT_TRIAGE` is no longer a required pre-payment gate.
- Main commit lane is now faster:
  - `... -> commit_details -> commit_payment -> tracking`
- `COMMIT_TRIAGE` remains available as an in-tracking `My information` update path.
- Tracking sheet/header behavior now includes:
  - global header triage action consume-once fix (prevents reopen loop after close)
  - `Return Home` CTA aligned to the same close behavior as header map icon
  - status alignment to actionable state (`Arrived` at confirm-arrival moment, `Complete` after arrival confirmation path)
  - route card visual progress treatment (connector fill + endpoint emphasis)
- ETA/timer resilience pass started:
  - timestamp parsing now supports both numeric and ISO `startedAt` values in tracking computations
  - header minute/distance clamp behavior improved around arrived/completed states

## Purpose

This file locks the current truth after the recent `/map` emergency-flow rebuild and records what still needs final polish before the flow is treated as stable across iPhone, Android, and web surfaces.

It is intentionally more current than older implementation notes that still describe legacy bed bridges, a future `COMMIT_TRIAGE` sheet, or tracking as not yet built.

## Canonical Route Truth

- public welcome route is `/`
- public map route is `/map`
- `/welcome` is not the canonical public route and should not be treated as the web entry path
- header and helper surfaces that want to go "home" should target `/`

## Canonical Sheet Truth

Current implemented `/map` sheet phases:

- `explore_intent`
- `search`
- `hospital_list`
- `hospital_detail`
- `service_detail`
- `ambulance_decision`
- `bed_decision`
- `commit_details`
- `commit_triage`
- `commit_payment`
- `tracking`

Current implemented commit paths:

- ambulance:
  - `explore_intent -> ambulance_decision -> commit_details -> commit_payment -> tracking`
- bed:
  - `explore_intent -> hospital_detail/service_detail -> bed_decision -> commit_details -> commit_payment -> tracking`
- ambulance + bed:
  - `ambulance_decision -> bed_decision -> commit_details -> commit_payment -> tracking`

Important corrections to older docs:

- `COMMIT_TRIAGE` now exists as a native map sheet phase but is no longer required between identity/contact and payment
- bed and combined flows no longer hand off to the legacy bed-booking route in the current map-native payment path
- `TRACKING` now exists as a first native sheet phase and is no longer only planned

## Reliability Hardening (ETA + Ambulance Motion)

Current issue class:

- `/map` tracking has had intermittent ETA drift and straight-line responder motion under some states.
- `/emergency` path appears more stable because it stays longer on explicit responder/legacy trip truth while `/map` still mixes fallback camera/route heuristics.

Locked hardening direction:

1. single tracking timeline source
   - derive `remainingSeconds`, `progress`, `arrival`, and route-card fill from one normalized timer model
   - normalize `startedAt` once (number or ISO) and reuse across all selectors
2. single responder coordinate source
   - prefer live responder coordinates when present
   - fallback to route interpolation only when live coordinates are absent
   - never treat hospital fallback coordinate as live responder telemetry
3. route adherence
   - keep marker motion constrained to decoded polyline points
   - heading should follow path tangent/lookahead, not destination bearing
4. persistence
   - persist `startedAt`, `etaSeconds`, and last-known progress in emergency context recovery
   - on app resume, rebuild motion from persisted timeline rather than restarting animation at route origin
5. observability
   - add lightweight debug telemetry logs for: timeline source, coordinate source, status transitions, and fallback mode activation

## Locked UX Doctrine

The current flow should keep the following rules locked:

- the map remains the spatial truth layer
- the sheet owns state and action
- one primary action should dominate each phase
- deeper detail should expand inside the same sheet before the app changes shell
- auth stays late
- payment stays late
- tracking is the first state where the app-owned active header becomes appropriate
- copy should be minimal, direct, and decision-led
- do not explain what the UI already shows

Apple-aligned references already collected internally:

- `docs/research/APPLE_MAPS_IPHONE_UI_REFERENCE.md`
- `docs/flows/emergency/EMERGENCY_SHEET_AND_MAP_UI_SPEC_V1.md`
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`

Most important Apple translations to keep:

- detent-first interaction over route churn
- restrained motion for repeated actions
- glass/material only for functional chrome, not heavy content framing
- continuous rounded geometry instead of sharp nested cards
- semantic contrast and sparse accent usage

## Legacy Strengths Worth Preserving

Legacy emergency/request surfaces still carry some strong product behavior that the new map flow should keep:

- pending cash approval is truthful and realtime-backed
- console approval and decline mutate the real request and payment records
- retry after `payment_declined` is preserved at the operator layer
- trip and bed "active" summaries are backed by real request and visit truth
- triage is non-blocking and should remain additive, not a gate that delays help

Legacy behaviors to trim, not preserve:

- explanatory copy blocks
- too many nested cards for one state
- duplicated status framing in hero, header, and body
- modal-sized orchestration for states that should now remain inside the shared map sheet

## Real Contract: App -> DB -> Console -> DB -> User

### 1. Request creation

The patient app creates emergency requests through:

- `hooks/emergency/useRequestFlow.js`
- `services/emergencyRequestsService.js`
- RPC `create_emergency_v4`

This creates:

- `emergency_requests`
- `payments`
- `visits`

### 2. Pricing and payment setup

Current patient-facing pricing display is:

- subtotal from `calculate_emergency_cost_v2`
- fee enrichment in client checkout helpers
- gross total shown in payment summary and CTA

Current card lane:

- request is created in a dispatch-gated state
- `create-payment-intent` reuses the stored emergency fee
- Stripe confirmation + webhook finalize the payment truth
- dispatch/tracking should only advance after that confirmation path

Current cash lane:

- request enters `pending_approval`
- org admins are notified
- console listens to both request and payment updates
- org admin approves via `approve_cash_payment` or declines via `decline_cash_payment`

### 3. Console truth

Current console emergency flow is driven by:

- `src/components/pages/EmergencyRequestsPage.jsx`
- `src/components/modals/EmergencyDetailsModal.jsx`
- `src/services/emergencyService.js`

Console watches:

- `emergency_requests`
- `payments`

Console already understands:

- `pending_approval`
- `payment_declined`
- dispatch/action state
- payment retry path

### 4. Return to patient tracking

Once request/payment state allows activation:

- the app transitions into the native `tracking` sheet phase
- ambulance trips start from hospital coordinate truth
- bed bookings surface as active reservation truth
- pending approval also routes through `tracking` so the user remains inside the same spatial shell

## Current Gaps

### Product / UX gaps

- `COMMIT_TRIAGE` now exists, but it still needs a deeper device QA pass for spacing and copy polish
- tracking currently reuses strong legacy summary cards, but not yet a fully native map-tracking presentation
- pending approval and tracking copy is still slightly too explanatory in places
- payment and tracking status states need one cleaner shared visual language for half and expanded detents
- success, pending, decline, and retry should feel like one family from payment into tracking instead of separate designs

### Technical / architecture gaps

- docs still drift from code in the main implementation note
- web dev sessions can show stale unresolved-module HMR errors after new map files are added; a Metro restart clears this even when `build:web` succeeds
- Google Maps web path still uses deprecated `google.maps.Marker`
- Google Maps web path still uses deprecated `DirectionsService`
- web bundle still reports React Native Web deprecation warnings for `shadow*`, `textShadow*`, `pointerEvents`, and some image/style props
- `expo-av` is still deprecated and should move to `expo-audio` / `expo-video`

## Keep / Add / Trim

### Keep

- persistent map plus evolving sheet
- second-tap confirm behavior on selected transport
- late auth and late payment
- map-native bed and combined payment flow
- hero payment summary with hospital + service + pickup context
- realtime console-backed approval truth
- native tracking handoff after payment or approval truth exists

### Add

- follow through on the native triage lane:
  - keep it skippable
  - keep it one-question-at-a-time
  - keep its copy and surfaces lighter than payment
- dedicated native tracking chrome over time:
  - large active instruction/status header when route is live
  - compact supporting rows below
  - less reliance on older summary-card styling
- deprecation cleanup for web map providers
- one canonical cross-platform QA checklist per phase

### Trim

- duplicate explanatory copy in payment and tracking
- content-layer glass and heavy nested surfaces
- repeated status words between header, hero, and body
- doc references that still describe legacy booking handoff or unbuilt phases as current truth

## Copy Doctrine To Keep

The flow should continue using short, user-facing labels:

- commit details:
  - `Confirm email`
  - `Enter code`
  - `Add phone number`
- payment:
  - `Payment`
  - `Pay with`
  - `Details`
- tracking:
  - prefer short state labels such as `Live tracking`, `Awaiting approval`, `Bed ready`, `Help has arrived`
  - put `arrival / ETA / distance` in the persistent active header, not in a duplicated sheet hero card
  - use a compact tracking sheet top slot for local controls: detent toggle on the left, `return to map` on the right
  - keep one primary action only when arrival / completion / check-in is actually needed
  - keep cancel visually isolated from non-destructive utilities
  - keep cancel out of half snap unless there is no better place for it
  - if check-in is already completed, demote it to `Update check-in` instead of keeping it as the main CTA
  - keep the active header persistent after minimize so the route can always be reopened

Avoid:

- long reassurance paragraphs
- repeated "choose" or "confirm" instructions when the UI already shows the decision
- technical language such as "demo", "request object", "dispatch gate", or "wallet debit"

## Responsive Audit Notes

The intended surface ladder remains correct:

- iPhone / Android phone: bottom sheet
- web mobile: bottom sheet
- iPad / Android tablet / fold / desktop web: larger contained sheet or side/sidebar presentation depending on phase

Current viewport-ratio doctrine is correctly established, but it still needs a final sweep on any remaining child surfaces that silently use fixed dimensions.

## What Was Verified In This Audit

Confirmed locally:

- `npm run build:web` passes
- root `/` renders the public welcome surface on web
- `/map` renders the public map shell on web
- `/welcome` is not a valid direct web route today
- current dev server may surface stale HMR unresolved-module errors for recently added map files even while the export build succeeds

Confirmed by code audit:

- request creation still flows through `create_emergency_v4`
- cash approval still flows through `approve_cash_payment` / `decline_cash_payment`
- console subscribes to `emergency_requests` and `payments`
- map tracking handoff is now wired in code
- tracking camera now prefers a wider active fit so patient, hospital, and responder remain visible together
- tracking timeline normalization is now centralized in `useTripProgress`
- tracking animation now prefers canonical trip route (`activeAmbulanceTrip.route`) when present
- animation start point now respects elapsed progress instead of restarting at route origin
- dev observability now logs runtime source mode for ambulance marker authority
- `/map` touch lock root cause identified:
  - `MapPhaseTransitionView` was full-screen and touch-active, blocking map gestures outside the visible sheet
  - fixed with `pointerEvents="box-none"`
  - `MapExploreLoadingOverlay` now uses the actual `pointerEvents` prop so hidden/fading overlay frames release map touches

Not verified in this audit from runtime:

- full iOS device pass
- full Android device pass
- full tablet/fold pass
- complete authenticated payment-to-tracking interaction on every form factor

## Manual QA Matrix For Next Pass

The next human pass should verify, in order:

1. iPhone mobile:
   - welcome -> map -> hospital -> service decision -> commit details -> payment -> tracking
2. Android mobile:
   - same flow, especially detent drag, keyboard, and press feedback
3. Web mobile:
   - bottom-sheet presentation, phone-country picker, auth return, payment hero density
4. iPad / Android tablet / fold:
   - side-sheet vs contained modal sizing, spacing, and hero hierarchy
5. Web `sm-wide`, `md`, `lg`, `xl`, MacBook Chrome:
   - stage insets, side-sheet logic, tracking composition, and map/control balance

## Immediate Next Documentation Rule

When the next polish round lands:

- update this audit first
- then update any older implementation notes that still disagree with the code
- do not let older docs remain the source of truth once a phase has already shipped in `/map`
