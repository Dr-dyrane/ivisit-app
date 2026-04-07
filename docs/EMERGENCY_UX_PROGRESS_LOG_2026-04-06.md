# Emergency UX Progress Log — 2026-04-06

> Status: Active checkpoint log  
> Scope: `ivisit-app`  
> Purpose: preserve the recent emergency-flow, map, and sponsor/demo hardening wins so the team does not lose the thread.

## Why this file exists

We solved a large amount of emergency UX and runtime hardening work in one stretch:

- web map rendering and route quality
- choose-location → choose-hospital transition smoothness
- mobile web safe-area / CTA reliability
- responsive hospital review layouts across size classes
- iPad restructuring to a true Apple-style split view
- sponsor/demo fallback coverage so new users are not blocked by missing verified providers nearby
- responder-readiness verification for guest/no-auth intake

This file is the short-term memory for that work.

---

## What we achieved

### 1) Web map reliability is now production-credible

#### Web map problems addressed

- the request-help map could fail to render on web
- Google Directions REST calls were blocked by CORS
- the route line could fall back to a straight polyline instead of following roads
- map remounts and state overlap made the transition feel jumpy

#### Web map changes made

- web routing now prefers browser-side Google Maps `DirectionsService`
- fallback behavior was hardened so preview routes do not get stuck in the wrong state
- the web map wrapper was stabilized for async loader readiness and reduced remount noise
- route preview framing and fit behavior were improved so the map feels deliberate instead of lucky

#### Web map files involved

- `hooks/emergency/useMapRoute.js`
- `components/map/MapComponents.web.js`
- `components/emergency/intake/EmergencyHospitalRoutePreview.jsx`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`

---

### 2) The choose-location → choose-hospital handoff is much smoother

#### Transition problems addressed

- web was visibly rougher than iOS / Android
- the review map could feel like it loaded twice
- the bridge between the location-confirm screen and hospital review lacked calm continuity

#### Transition changes made

- forced remount behavior was removed
- hospital preview rendering was delayed until the location bridge was ready
- route preloading and repeated fit passes were added
- the location map now survives briefly during the handoff, then lifts/fades as the hospital review takes over

#### Transition product effect

- the user feels like they are continuing one flow, not moving between disconnected screens

#### Transition files involved

- `components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx`
- `components/emergency/intake/views/chooseLocation/EmergencyChooseLocationStageBase.jsx`

---

### 3) Mobile web safe-area and CTA clipping issues were fixed

#### Safe-area problems addressed

- iOS web browser chrome could clip the CTA
- shorter web canvases could trap the call-to-action below the visible area

#### Safe-area changes made

- the choose-location surface now keeps the snapped full-height behavior where possible
- smaller web heights can scroll safely
- CTA auto-scroll was added when the layout becomes scrollable
- floating dock styling was tuned to fit the app language better

#### Safe-area files involved

- `components/emergency/intake/views/chooseLocation/emergencyChooseLocationTheme.js`
- `components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx`

---

### 4) Responsive hospital review layouts are now intentionally designed by size class

#### Responsive-layout problems addressed

- the hospital review posture could not just be a stretched phone screen
- web and tablet sizes needed their own composition logic

#### Responsive-layout changes made

- `web-sm-wide`, `web-md`, `android-fold`, and `android-tablet` now use a stacked map-first review shell
- larger web/desktop and tablet-capable surfaces use split-view layouts where appropriate
- the hospital choice surface now chooses between bottom-sheet and dialog presentations by variant

#### Responsive-layout files involved

- `components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx`
- `components/emergency/intake/EmergencyHospitalChoiceSheet.jsx`
- `components/emergency/intake/emergencyIosMobileIntake.styles.js`

---

### 5) iPad now behaves like iPad, not like a stretched iPhone

#### iPad design problems addressed

- the design was too border-heavy and too phone-like on iPad
- the right panel did not take advantage of tablet space

#### iPad design changes made

- `ios-pad` was restructured into a true split-view
- the map became the primary left-side canvas
- the right-side panel was widened, simplified, and made calmer
- hierarchy, imagery, spacing, and metadata were rebalanced to feel more Apple-like

#### iPad design rule locked

- iPad is not a bigger iPhone; it needs a different structural posture

---

### 6) We clarified the next architectural intake phase

#### Intake architecture conclusion

- the missing piece after `proposed_hospital` is not another browsing screen
- it is a **coverage / auth / payment commit checkpoint** before live dispatch

#### Intake architecture interpretation

- the flow should move from `proposed_hospital` into a final commit-ready checkpoint
- only then should the live request enter `responder_matched`

This is especially important for:

- new users
- free users
- sponsor review credibility
- keeping emergency intent fast without losing system truth

---

### 7) Demo fallback coverage is now much stronger for new and returning users

#### Demo coverage problems addressed

- demo-generated hospitals were not reliably acting like full fallback providers
- older demo rows were still `not_certified`
- some areas had coverage data that looked present but was not ready for a clean cycle

#### Demo coverage changes made

- `bootstrap-demo-ecosystem` now seeds demo hospitals as:
  - `verified = true`
  - `verification_status = verified`
  - `status = available`
- demo readiness now checks more than hospital count:
  - staffing
  - pricing
  - dispatch readiness
  - clean-cycle readiness
- legacy demo rows were reseeded/backfilled
- duplicate demo hospital scopes were deduplicated

#### Demo coverage files involved

- `supabase/functions/bootstrap-demo-ecosystem/index.ts`
- `services/demoEcosystemService.js`
- `services/hospitalsService.js`
- `services/realtimeAvailabilityService.js`
- `supabase/scripts/dedupe_demo_hospitals.js`

---

### 8) We verified responder readiness at `2235 Corinto Court`

#### Corinto test goal

- confirm that a guest / no-auth emergency intake can reach a responder-ready state without being blocked by missing nearby verified hospitals

#### Corinto test result

- location tested: **`2235 Corinto Court`**
- demo bootstrap returned:
  - `ok: true`
  - `clean_cycle_ready: true`
  - `dispatch_ready: true`
- the Corinto scope resolved cleanly to **3 verified + available demo hospitals**
- `get_available_ambulances()` returned **1 available ambulance** for the first hospital

#### Corinto meaning

- for pre-auth emergency intake, the product is now capable of showing a credible responder-ready state instead of collapsing when live verified coverage is sparse

---

### 9) The dispatch-clearance bridge is now explicitly documented as the handoff between new and legacy flow

#### Bridge doctrine now locked

- the new intake flow owns the calm, stepwise front half: `request_started` → `confirm_location` → `finding_nearby_help` → `proposed_hospital`
- the current bridge surface is the existing `EmergencyRequestModal`, but it is now treated as the intentional `dispatch_clearance` checkpoint
- legacy responder/tracking code is still reused after this handoff, which keeps the live map and telemetry truth without forcing a full rewrite first

#### Rules alignment captured

- one process at a time
- one decision at a time
- progressive disclosure
- state preservation in context
- reload persistence so urgent progress survives interruption

#### Auth/product implication

- Google auth at the bridge should confirm identity quickly without kicking the user into full profile completion before dispatch is released
- optional details should be completed later while waiting, during matching, or during the ride

---

### 10) The `Choose resource` phase now has a full 13-variant rollout plan

Current baseline is the locked **iOS mobile** version.

The next 12 screens are now explicitly planned as:

- iOS iPad
- Android mobile
- Android fold
- Android tablet
- Chromebook
- Web mobile
- Web sm-wide
- Web md
- Web lg
- Web xl
- Web 2xl–3xl
- Web ultra-wide

This keeps the emergency flow aligned with the welcome-screen responsive discipline instead of stretching one phone UI everywhere.

---

## Verification evidence we used

These were the important verification commands and outcomes:

### Demo / runtime repair

- `node supabase/scripts/cleanup_demo_orphans.js --apply`
- `node supabase/tests/scripts/apply_alignment_backfill.js --apply`

Observed evidence:

- missing org wallet inserted: `1 -> 1`
- missing visit inserted: `1 -> 1`
- invalid dispatch-phase ambulance requests cancelled: `1`

### Runtime relationship confidence

- `npm run hardening:runtime-crud-batch`
- result: **`success: true`**

### Emergency runtime confidence

- `npm run hardening:emergency-runtime-confidence`
- result: **`passed=32 failed=0 total=32`**
- assertion output: **`PASS: runtime confidence checks passed.`**

### Corinto responder-readiness spot check

- live targeted check for `2235 Corinto Court`
- result confirmed:
  - `clean_cycle_ready: true`
  - `dispatch_ready: true`
  - `availableAmbulancesForFirstHospital: 1`

---

## What this improves for users

### New users

- they are less likely to be blocked by coverage gaps
- the emergency path feels clearer and more trustworthy
- the no-auth/low-friction journey now has a stronger responder-ready fallback story

### Returning users

- transitions feel calmer and more polished
- review surfaces feel more intentional across device classes
- tracking and matched states are closer to real trip truth, not placeholders

### Sponsor / credibility impact

- the product now demonstrates a much stronger first emergency action story
- web, iPad, and demo coverage are no longer the obvious weak points they were before

---

## Current product truth

At this checkpoint:

- the product is **much stronger for both new users and existing users**
- the emergency UX is far more seamless across web and native-like surfaces
- fallback coverage can now support a credible `responder_matched` path in sparse areas
- the next major product step is to formalize the **final commit checkpoint** before the live dispatch enters the full request lifecycle

---

## Recommended next move

1. Keep using this log as the short-term memory for emergency work.
2. Fold any future responder-matched / commit-phase changes into this same documentation chain.
3. When the final checkpoint is built, add a dedicated section documenting:
   - pre-auth preview behavior
   - commit behavior
   - post-commit live request behavior

This ensures the team can move fast without forgetting what has already been made true.
