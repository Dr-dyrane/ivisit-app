# Emergency Screen Dossier

> Status: Active
> Scope: `ivisit-app`
> Surface: first live-action screen after `Request Help`

## Purpose

This dossier is the working brief for the first emergency action surface.

It exists to answer:

- what `Request Help` means in product terms
- which current runtime path already exists
- what the emergency screen should become
- what constraints we have to respect
- what the build sequence is

Related references:

- [SPONSOR_SPRINT.md](../../SPONSOR_SPRINT.md)
- [MASTER_BLUEPRINT.md](../../MASTER_BLUEPRINT.md)
- [WELCOME_SCREEN_DOSSIER.md](./WELCOME_SCREEN_DOSSIER.md)
- [EMERGENCY_INTEGRATION_AUDIT.md](./EMERGENCY_INTEGRATION_AUDIT.md)
- [flows/emergency/MASTER_REFERENCE_FLOW_V1.md](../../flows/emergency/MASTER_REFERENCE_FLOW_V1.md)
- [EMERGENCY_UX_PROGRESS_LOG_2026-04-06.md](../historical/EMERGENCY_UX_PROGRESS_LOG_2026-04-06.md)
- [rules.json](../../rules.json)

## Semantic Lock

`Request Help` remains the user-facing wording.

Product meaning:

- `Request Help` = `Request Ambulance`
- `Request Ambulance` = the more specific articulation of what help means in the urgent path

Rules:

- the welcome CTA stays human and broad: `Request Help`
- the system model underneath stays precise: `ambulance`
- the emergency flow must not become vague about what is being requested

## Screen Role

This is the first live-action screen after the user chooses urgent help.

It is not:

- the broad emergency tab shell
- a map browsing screen
- a dashboard
- a long form
- a hospital marketplace

It is:

- confirmation that help has started
- minimum necessary collection
- visible system progress toward ambulance response

## Emotional Goal

The user should feel:

- I already started
- the app understood my intent
- help is being arranged now
- I only need to do one thing at a time

The user must not feel:

- I still need to set everything up
- I opened the wrong part of the product
- I need to browse hospitals first
- the system is idle

Typography rule:

- emergency state titles may be strong
- support lines, helper text, and map/meta labels should stay lighter so ETA, address, and the current state remain dominant
- if helper text feels loud, the state has lost calmness
- urgent decision sheets should not carry explanatory helper copy unless that copy directly changes the choice the user needs to make

## Locked State Model

The emergency surface is now locked to a map-first, state-driven model:

- `map = constant reality layer`
- `sheet = state + action`
- `header = true active-session chrome only after dispatch has started`

Primary states:

1. `idle_map`
2. `confirm_location`
3. `finding_nearby_help`
4. `proposed_hospital`
5. `dispatch_clearance`
6. `commit_ready`
7. `responder_matched`
8. `tracking_arrival`

Operational truth lock:

- `dispatch_clearance` and `commit_ready` exist so the user sees hospital, ETA, identity, and payment clearly before live dispatch is released
- pre-dispatch states should not surface the active header yet
- there is only **one irreversible commit moment** in the patient flow
- `responder_matched` is only feasible after a hospital has accepted the request and released a responder
- `tracking_arrival` is only feasible after a responder has actually been assigned and route truth exists
- identity / auth should happen only when required to commit, not before intent

Edge states:

- `location_failed`
- `connection_unstable`
- `no_responder_yet`

## Current Runtime Audit

The current app does not yet have one clean emergency-first surface.

The runtime path is split across three layers:

1. [WelcomeScreen.jsx](../../../screens/WelcomeScreen.jsx)
   Current behavior still routes `Request Help` into `/(auth)/signup` with an `intent` param.
   This does not yet satisfy the agreed rule that auth should happen after intent, not before intent.

2. [RequestAmbulanceScreen.jsx](../../../screens/RequestAmbulanceScreen.jsx)
   This is the closest existing implementation to the desired first live-action emergency surface.
   It already wraps a focused emergency flow and is mounted under the emergency request stack route.

3. [EmergencyScreen.jsx](../../../screens/EmergencyScreen.jsx)
   This is still the broader map-first emergency shell under the home tab.
   It contains hospital discovery, quick actions, the live map, and bottom-sheet tracking.
   It is valuable, but it is too broad to serve as the first post-CTA emergency state.

## Existing Feasibility

The emergency build is feasible without rebuilding from zero.

What already exists:

- request creation and trip start logic in [useRequestFlow.js](../../../hooks/emergency/useRequestFlow.js)
- direct ambulance request stack route in [request-ambulance.js](../../../app/(user)/(stacks)/emergency/request-ambulance.js)
- request flow UI shell in [RequestAmbulanceScreen.jsx](../../../screens/RequestAmbulanceScreen.jsx)
- iPhone-first emergency intake base in [EmergencyIOSMobileIntakeView.jsx](../../../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)
- iPhone-first emergency intake styles in [emergencyIosMobileIntake.styles.js](../../../components/emergency/intake/emergencyIosMobileIntake.styles.js)
- welcome-style size-class routing in [EmergencyIntakeOrchestrator.jsx](../../../components/emergency/intake/EmergencyIntakeOrchestrator.jsx)
- ambulance request modal flow in [EmergencyRequestModal.jsx](../../../components/emergency/EmergencyRequestModal.jsx)
- live responder summary in [TripSummaryCard.jsx](../../../components/emergency/bottomSheet/TripSummaryCard.jsx)
- live route and responder map support in [EmergencyMapContainer.jsx](../../../components/emergency/EmergencyMapContainer.jsx)
- active trip and telemetry truth in [EmergencyContext.jsx](../../../contexts/EmergencyContext.jsx)
- shared global location loading in [GlobalLocationContext.jsx](../../../contexts/GlobalLocationContext.jsx)

Feasibility verdict:

- high reuse potential
- no need to invent the backend contract
- no need to invent tracking from scratch
- significant UI/flow simplification is still required

Current implementation checkpoint:

- the new intake shell now routes through a welcome-style orchestrator, so phone, tablet, and desktop can diverge in posture without duplicating emergency flow logic
- it covers `request_started`, `confirm_location`, and the first `finding_nearby_help` handoff state
- the urgent path now inserts a `proposed_hospital` review state before the legacy request modal
- it sits in front of the existing request modal instead of replacing the full flow at once
- current behavior after location confirmation still hands into the legacy ambulance request modal
- that modal is now being treated as the **temporary `dispatch_clearance` bridge**, not as an unrelated legacy detour
- the intake body now mirrors the welcome-screen grammar: hero first, address as the headline, city/state as the support line, CTA cluster at the bottom
- `Change location` now opens a real bottom search sheet instead of acting like decorative copy
- `Choose another` now opens a hospital choice sheet so the user can reject the first recommendation without losing the locked location
- `proposed_hospital` now uses a map-backed review posture with a route preview from the locked location to the proposed hospital, while the sheet remains the decision focus
- the smart header now carries the current intake state instead of repeating that status in the body
- the location sheet now searches live suggestions while the user types instead of waiting for a manual search submit
- the chosen intake location now carries into request creation and auto-dispatch instead of being dropped at handoff
- the chosen or recommended hospital now carries into the legacy ambulance modal, so the old hospital-specific request flow starts from the reviewed proposal instead of a blind first pick
- this is intentional: the new state-first intake is being staged before the later request/payment/tracking states are refactored
- support typography has been lightened in the iPhone intake and hospital-choice surfaces to align with Apple-style hierarchy and keep subtitle/meta text from competing with the main state
- the iPhone emergency intake phase now persists locally, so refresh restores the current phase draft instead of resetting the user back to the start of the urgent flow
- emergency-auth users who continue with Google from the bridge are now allowed to finish dispatch first; full profile completion is intentionally deferred instead of interrupting the urgent flow
- the bridge must keep **one process at a time**, **one decision at a time**, and **progressive disclosure** as hard rules: identity, callback, and payment release now; everything else later while waiting or riding
- the iPhone committed-response state now reuses real trip truth instead of a placeholder matched card
- once a live trip exists, the iPhone flow pivots into a map-backed bottom-sheet shell that uses the existing trip route, responder position, telemetry health, and ETA/progress logic
- the committed-response sheet stays ETA-first, while the map continues to provide route proof and ambulance motion in the background
- the `confirm_location` state now carries a minimal read-only location map so the user sees spatial proof before the hospital review
- the `confirm_location -> proposed_hospital` handoff now uses a short bridge where the location map survives briefly, then fades/lifts away as the hospital route review arrives
- the proposed-hospital route now appears fully formed when the review map mounts; the transition carries the motion instead of making the user wait for the line to catch up
- the proposed-hospital preview now uses skeleton-style map loading only; no activity indicator is allowed in this lane
- review-map framing is now orientation-aware, so mostly horizontal routes are lifted into the visible top half of the map instead of collapsing toward the review sheet
- the chosen intake location now also drives hospital coverage refresh and demo ecosystem backfill, so sparse live hospital data does not break the sponsor-review experience after location confirmation
- demo coverage has now been hardened and reseeded so fallback hospitals behave like true responder-ready providers (`verified`, `available`, ambulance-linked, and clean-cycle checked)
- a live guest-path validation at `2235 Corinto Court` now proves the system can reach a credible responder-ready state with `clean_cycle_ready: true`, `dispatch_ready: true`, and a real available ambulance in scope before auth is required
- the `Where are you?` page-shell now follows the welcome-screen page contract more closely: the route is full-canvas, the stage no longer double-owns bottom safe-area spacing, and stage height is calculated after page padding instead of before it
- the `Choose location` sheet now treats keyboard behavior as platform-specific: iOS uses a tighter, flush-to-keyboard bottom sheet path while Android keeps the keyboard-aware modal treatment

Responsive composition rule:

- follow the welcome-screen implementation pattern when emergency layout posture changes meaningfully by size class
- use an orchestrator to select the view family
- keep state, trip truth, route truth, and location/hospital flow shared underneath
- do not stretch one phone render tree across tablet and desktop after the layout grammar has diverged

Build sequencing rule:

- follow the welcome-screen hardening pattern, not a sprint-wide batch build
- lock one emergency phase on iPhone first
- once that phase is solid, adapt that same phase across the size-class family
- only then move to the next emergency phase
- do not partially build later phases while earlier phases still leak overflow, broken keyboard behavior, placeholder loaders, or boxed-layout artifacts

Per-phase implementation sequence:

1. iOS mobile
2. iOS iPad
3. Android mobile / fold / tablet / chromebook
4. Web mobile / sm-wide / md / lg / xl / 2xl-3xl / ultra-wide
5. sponsor-review cleanup pass across the whole phase

## Choose Resource Phase — 12 Remaining Screens

Current locked baseline:

- `Choose resource` on **iOS mobile** is the source posture for this phase
- it establishes the calm card stack, the green payment FAB, and the rule that the user is only choosing the responder level and confirming payment responsibility

The next 12 screens to build for this same phase are:

| # | Variant | Build posture for `Choose resource` |
| --- | --- | --- |
| 1 | `iOS iPad` | Keep the map visible longer, center the decision sheet, and allow a roomier two-card comparison without turning the screen into a dashboard. |
| 2 | `Android mobile` | Mirror the iPhone flow in a tighter single-column stack with Android-safe keyboard, header, and FAB spacing. |
| 3 | `Android fold` | Closed state behaves like phone; open state uses a split posture with route proof on one side and the decision sheet on the other. |
| 4 | `Android tablet` | Use a broader centered review sheet with more breathing room, but preserve one decision at a time and a single primary CTA. |
| 5 | `Chromebook` | Treat it as touch-first landscape: persistent route context, stronger keyboard focus states, and compact horizontal scan paths. |
| 6 | `Web mobile` | Preserve the native mobile sheet feel inside the PWA so the web experience still feels urgent and handheld. |
| 7 | `Web sm-wide` | Slightly widen the review surface and let service cards breathe, without introducing a second focal action. |
| 8 | `Web md` | Move to a true web composition with more stable map framing and a centered decision column. |
| 9 | `Web lg` | Support a balanced map-plus-sheet layout where the map proves location and route while the sheet owns the choice. |
| 10 | `Web xl` | Increase horizontal polish, calm spacing, and comparison clarity for multi-service hospitals while keeping the green pay CTA dominant. |
| 11 | `Web 2xl–3xl` | Prevent the phase from feeling sparse by constraining the decision surface and using the extra canvas only for trust-building route context. |
| 12 | `Web ultra-wide` | Keep the decision lane intentionally narrow and cinematic; the extra width supports reassurance, not more complexity. |

Shared lock across all 12:

- same state contract
- same copy discipline
- same progressive disclosure
- same green money-only FAB treatment
- no marketplace feel, no dashboard feel, no extra explanatory clutter

Canvas rule:

- follow the welcome-screen posture: the screen should use the full canvas first, not a boxed centered container
- use centered stages, sheets, and panels inside the canvas when the phase needs focus
- do not let old `maxWidth` or margin habits turn a live emergency screen into a contained card unless that container is the intentional focal surface
- urgent entry routes such as `/(auth)/map` must inherit the same full-canvas shell discipline as welcome instead of passing through the default boxed auth surface wrapper
- urgent entry routes must also preserve explicit back navigation state. If the route can be opened directly, pass `HeaderBackButton` a custom `onPress` and implement fallback routing so the user always has a reliable back path.
- when a phase is page-based like `Where are you?`, the stage must not reapply bottom safe-area ownership that the page shell already owns
- stage height math must follow the welcome rule: subtract top and bottom page padding before assigning stage min-height, otherwise the screen will overflow and feel scrollable when it should snap to the viewport

Keyboard behavior rule:

- keyboard treatment is platform-specific doctrine, not a generic shared modal behavior
- iOS location sheets should sit tightly on the keyboard instead of hovering above it with extra offsets
- Android may use the keyboard-aware modal helper where needed, but that behavior must not leak into iOS mobile variants

Web-specific implementation rule:

- web is not a stretched native target
- when a phase reaches web, build and review it as a web surface with its own interaction and rendering realities
- extend map styling, loading treatment, and responsive spacing for web explicitly instead of assuming iOS or Android decisions will transfer untouched
- every phase must be built and verified on web in the same deliberate way as native

## Core Constraint

The current codebase exposes ambulance flow too late and too broadly.

Current friction sources:

1. Welcome still hands off to auth first.
2. `EmergencyScreen` leads with map discovery and hospital context.
3. `EmergencyRequestModal` still exposes resource/payment structure early.
4. Hospital selection is too visible too early for the urgent path.
5. The first reassurance state is not yet the primary product surface.

This means the next build should not start by redesigning the map tab.

It should start by promoting and refactoring the direct ambulance request flow.

## Recommended Product Flow

Desired urgent path:

1. landing page handoff
2. app welcome
3. user taps `Request Help`
4. system preserves intent: `ambulance`
5. auth only if required
6. first live-action emergency surface opens
7. system moves through:
   - `request_started`
   - `confirm_location`
   - `finding_nearby_help`
   - `proposed_hospital`
   - `dispatch_clearance` *(identity, callback, incident summary, access notes, payment responsibility, hospital submission)*
   - `responder_matched`
   - `tracking_arrival`

Quick-auth placement rule:

- auth should not block the initial urgent intent or the first location-confirmation step
- quick auth belongs at `dispatch_clearance`, right before the request is formally submitted to the hospital for release
- if the user is already signed in, this step becomes a fast identity-confirmation sheet with prefilled name/phone
- if the user is a guest, this step should use **email OTP first** in the map flow, with phone collected only if still missing after verification

Legacy mitigation rule to preserve:

- the old flow already captured the right risk-reduction signals through triage and payment approval
- keep the minimum real-world questions: who is requesting, how can dispatch call back, what happened, how severe is it, how do responders get in, and who is taking payment responsibility
- keep the existing `pending_approval` / cash-approval gate as the operational bridge before true responder release

### Dispatch Clearance Data Contract

Compulsory before hospital submission:

1. **Identity + callback**
   - patient email / owned identity
   - reachable phone number
   - quick auth or verification if the user is still a guest
2. **Pickup certainty**
   - confirmed location
   - at least one access note when needed (gate, stair, landmark, apartment, entrance)
3. **Incident summary**
   - chief complaint / what happened
   - red-flag triage checks: breathing, consciousness, severe bleeding, or equivalent severity signal
4. **Payment responsibility**
   - card, cash, sponsor, or other real method
   - clear responsibility acknowledgment, without expanding into insurance collection on this screen
5. **Dispatch consent**
   - clear user action that submits the request to the hospital for release review

Skippable or deferrable until waiting / matched / in-visit:

- sponsor paperwork or extended billing detail
- full medical history and medication review
- extended AI triage follow-up
- caregiver support detail
- facility preference nuance
- nice-to-have profile completion like username, avatar, or broader onboarding

System correction note:

- the current runtime still creates the request too early in `useRequestFlow.js` with `status: EmergencyRequestStatus.IN_PROGRESS`
- the backend then syncs a `visit` immediately after request creation
- for the real product model, that should tighten into: `dispatch_clearance -> pending_approval -> accepted/released -> responder_matched -> tracking_arrival`
- in short: no true trip / visit start before the compulsory clearance contract is satisfied

### Map Posture Rule By Phase

- `confirm_location`: yes, use the subtle proof map
- `proposed_hospital`: yes, use the route review map
- `dispatch_clearance`: **no full live map as the main surface**; use a clean form/review sheet with a compact location summary row instead
- `responder_matched` and `tracking_arrival`: yes, return to the stronger legacy-style map + bottom-sheet composition because the product has now entered the live route stage

The broader map shell may still exist, but it should support tracking and context after the request is live. It should not be the first emotional response to the CTA.

## Bridge Contract — New Intake Into Legacy Runtime

This bridge is the current product-safe handshake between the new urgent flow and the older responder/tracking runtime.

### Ownership by phase

1. **New intake owns the front half**
   - `request_started`
   - `confirm_location`
   - `finding_nearby_help`
   - `proposed_hospital`

2. **`dispatch_clearance` is the bridge layer**
   - currently rendered inside [`EmergencyRequestModal.jsx`](../../../components/emergency/EmergencyRequestModal.jsx)
   - must feel like one compact release checkpoint, not a generic payment modal
   - email OTP belongs here if the user is still a guest

3. **Legacy code is still reused after clearance**
   - `pending_approval`
   - `responder_matched`
   - `tracking_arrival`
   - live map, telemetry, and trip summary remain valuable once real dispatch truth exists

### Rules.json alignment lock

The bridge must continue to obey the UI rules already locked across the product:

- **one process at a time**: each state should ask for one class of action only
- **one decision at a time**: the user should never be choosing hospital, auth, triage depth, and billing detail all at once
- **progressive disclosure**: show only what is needed to release dispatch now; defer everything else to waiting, matched, or in-ride
- **state preservation**: keep the emergency phase, selected hospital, location proof, and approval state stable in context instead of recomputing from scratch on every transition
- **reload persistence**: if the app reloads, resume the truthful urgent state instead of dropping the user back to the start

### Persistence doctrine for this bridge

- location confirmation should remain locked through the hospital review and bridge submission
- the proposed hospital should survive handoff into the bridge without a blind re-pick
- emergency auth triggered from this bridge may defer profile completion until the urgent task is safely past dispatch release
- triage follow-up and optional profile enrichment should persist as secondary flows, never as blockers to the release decision

## UX Plan Lock

### 1. Screen purpose

This screen exists to do three jobs only:

1. confirm that the request has started
2. collect only what is still necessary
3. show that the system is actively finding help

### 2. State 1 — Request started

Title:

- `Requesting help…`

Support line:

- `Stay on this screen while we connect you.`

Rules:

- instant reassurance
- visible progress cue
- no dead waiting

### 3. State 2 — Confirming location

Title:

- `Confirm your location`

Support line:

- `This helps responders reach you faster.`

Rules:

- auto-detect first
- ask only when confidence is low
- keep one dominant action

### 4. State 3 — Finding nearby help

Preferred copy direction:

- `Finding nearby responders…`
- `Checking the closest available help…`
- `Connecting to emergency care nearby…`

Rules:

- no generic loading
- no empty state
- progress must feel truthful

### 5. State 4 — Responder matched

Title:

- `Help is on the way`

Support line:

- `Responder assigned nearby.`

Rules:

- ETA dominates
- map supports the state, not the other way around

### 4.5. Proposed hospital review

This state exists between search and commitment.

Rules:

- the system proposes the best nearby hospital first
- the user can accept the proposal quickly
- the user can reject the proposal and choose another hospital
- this state must not pretend dispatch is already final
- matched language is reserved for the real accepted response state

Locked UX model:

- this is the emotional turn from "we are searching" to "someone is coming"
- ETA is the dominant value on the screen
- responder or unit identity supports trust but does not outrank ETA
- the route preview supports orientation without becoming the primary task
- horizontal routes must still sit high in the visible map area; geometric centering is not acceptable once the sheet occludes the lower map
- one quiet secondary action is allowed: `Share more details`

Locked hierarchy:

1. current state: `Help is on the way`
2. reassurance line: `Responder matched nearby.`
3. dominant ETA
4. route preview / live context
5. responder or unit detail
6. one quiet secondary action

What must not appear:

- payment-first UI
- feature cards
- hospital browsing
- dashboard metrics
- multiple equal CTAs
- heavy explanatory copy

Implementation truth to reuse:

- [EmergencyContext.jsx](../../../contexts/EmergencyContext.jsx)
- [TripSummaryCard.jsx](../../../components/emergency/bottomSheet/TripSummaryCard.jsx)
- [EmergencyMapContainer.jsx](../../../components/emergency/EmergencyMapContainer.jsx)

State success criteria:

- the user understands a responder has been matched immediately
- ETA is readable without scanning the screen
- the map reinforces trust without becoming the main task
- the state feels like a continuation of `finding_nearby_help`, not a restart

### 6. State 5 — Tracking arrival

Title:

- `Tracking arrival`

Status examples:

- `Responder is 4 min away`
- `Approaching your location`
- `Almost there`

Rules:

- feel alive
- reduce uncertainty
- avoid action clutter

## Information Hierarchy

Every emergency state should follow this order:

1. current state
2. reassurance line
3. primary action or ETA
4. live context
5. quiet secondary controls

## Copy Rules

Use:

- `Help`
- `Location`
- `Responder`
- `Arrival`

Avoid:

- dispatch
- protocol
- incident
- service request
- queue
- workflow

## Build Recommendation

Primary implementation target:

- [RequestAmbulanceScreen.jsx](../../../screens/RequestAmbulanceScreen.jsx)

Supporting modules to refactor instead of rebuilding:

- [EmergencyRequestModal.jsx](../../../components/emergency/EmergencyRequestModal.jsx)
- [useRequestFlow.js](../../../hooks/emergency/useRequestFlow.js)
- [TripSummaryCard.jsx](../../../components/emergency/bottomSheet/TripSummaryCard.jsx)
- [EmergencyMapContainer.jsx](../../../components/emergency/EmergencyMapContainer.jsx)

Secondary surface to align later:

- [EmergencyScreen.jsx](../../../screens/EmergencyScreen.jsx)

Why:

- `RequestAmbulanceScreen` is already the narrow emergency request surface
- `EmergencyScreen` is still the broad home/discovery/tracking shell
- refactoring the narrow surface first is lower friction and closer to the agreed UX

## Build Order

1. lock semantic model: `Request Help` -> `ambulance`
2. harden `request_started`
3. harden `confirm_location`
4. harden `finding_nearby_help`
5. reuse existing matched / tracking truth from trip state
6. align edge cases
7. only then reconcile the broader map shell

Current progress:

- step 2 started
- step 3 started
- step 4 locked in product doctrine before implementation
- step 4 started on iPhone mobile with real trip truth and ETA-first hierarchy
- first implementation target is iPhone mobile only

## Success Criteria

This screen passes only if:

1. the user knows the request started immediately
2. the next action is always obvious
3. no state feels empty
4. `Request Help` clearly resolves to ambulance response
5. the flow feels continuous from welcome to live response
6. auth, if needed, does not erase the user’s expressed intent

## Immediate Next Implementation Decision

Do not start by styling [EmergencyScreen.jsx](../../../screens/EmergencyScreen.jsx) as if it were the first live-action surface.

Start by making [RequestAmbulanceScreen.jsx](../../../screens/RequestAmbulanceScreen.jsx) the intentional emergency-state foundation, then let [EmergencyScreen.jsx](../../../screens/EmergencyScreen.jsx) inherit the live tracking role more cleanly.

Current next build target:

- implement `responder_matched` on iPhone mobile first
- drive it from real trip and request truth, not static mock data
- make ETA the center of gravity
- keep the same header grammar and calm iVisit voice established by intake

Current implementation note:

- iPhone mobile now returns from the legacy request modal into a held `responder_matched` review state
- the matched state is driven by the existing request completion and active trip truth
- ETA is now the dominant visual value, with responder and origin details as supporting context

## Route Preview And Polyline Resolution

This section records the specific route-preview and polyline issue that affected the iPhone emergency flow for a long time.

### Symptom

The route polyline for the proposed hospital review did not appear reliably when the state changed.

Observed behavior:

- the route data was calculated
- the review state opened
- the map loaded
- but the polyline often did not render until another unrelated UI change happened
- a theme toggle was enough to make the polyline appear, which proved the data existed but the render timing was wrong
- one attempted fix caused iOS to crash immediately after `Continue`

### Real Cause

The problem was not route math.

The problem was ownership and timing.

The first broken version tied route calculation too closely to the route preview map component.

That created two bad behaviors:

1. The map and the route were being introduced at the same moment.
   The review state mounted the map, asked the route hook to calculate, and tried to fit/render everything during the same transition.

2. A hidden preloaded native `MapView` was used as a workaround.
   That made the route feel more ready on paper, but on iOS it introduced a crash risk because a native map was being kept alive before the state actually needed to display it.

So the real root cause was:

- route data preload and map rendering were coupled
- the map was doing too much at mount time
- the state transition depended on the preview component being both data source and display surface

### Correct Solution

The fix was to split route truth from map display.

Locked implementation rule:

- route calculation belongs in the intake controller
- the route preview map is display-only
- the map mounts only when the review posture is actually shown
- the route data can be prepared before that

In practice, the solution is:

1. The intake controller preloads the route data as soon as we have:
   - locked user location
   - proposed hospital

2. `finding_nearby_help` waits for one of these conditions before advancing:
   - minimum intentional loading time is satisfied and the route is ready
   - or the route wait timeout is hit

3. The map-backed `proposed_hospital` posture mounts only when the review state is ready to display.

4. The route preview receives:
   - route coordinates
   - route info
   - loading state
   as props instead of owning route calculation itself.

5. The centered intake shell fades out while the map-backed review fades in.

That separation solved both problems:

- the polyline no longer depends on a second unrelated re-render such as theme change
- the native crash path from hidden map preloading is removed

### Hospital Reselection Crash Resolution

There was a second crash path after the first route-preview fix.

#### Crash Symptom

The flow was stable when the user accepted the first proposed hospital.

It still crashed when the user:

1. opened `Choose another`
2. picked hospital B
3. reopened the sheet
4. picked hospital A again

Expo Go logs showed the JS path completing cleanly:

- hospital card press
- selection received
- sheet close
- selection committed

Then iOS crashed after commit, which meant the failure was happening during the live review-map update rather than during the sheet interaction itself.

#### Crash Root Cause

The visible review state was still mutating too aggressively during hospital swaps.

Two problems remained:

1. A previously viewed hospital still triggered a fresh route lifecycle too often.
2. The visible `selectedHospital` and the mounted native map were being updated in the same interaction window.

That meant the review shell could ask the native map to:

- change destination
- receive a new polyline
- refit
- rerender markers

while the sheet close and state transition were still settling.

#### Locked Fix

The stable solution is now:

1. Route results are cached by an origin/destination key.
   If the user returns to a previously viewed hospital, we reuse the route payload immediately instead of forcing a new route request path.

2. Hospital changes are handled as a pending selection.
   The newly chosen hospital is stored as the pending route target first.

3. The visible review state does not switch hospitals immediately.
   The currently rendered hospital stays on screen until the replacement route is ready, or a guarded timeout is hit.

4. Only then is the visible `selectedHospital` committed.

This removes the in-place native map mutation that was destabilizing iOS during hospital reselection.

#### Debugging Lesson

The added emergency debug trace proved the JS flow was healthy.

That is important because it changed the debugging approach:

- first confirm whether sheet interaction and selection logic are correct
- only then treat the failure as a map/render ownership problem

The useful checkpoints for this issue were:

- `hospital_choice_card_pressed`
- `hospital_choice_selection_received`
- `hospital_choice_selection_committed`
- `hospital_choice_route_ready`
- `hospital_choice_route_timeout_commit`

#### Locked Rule From This Fix

When a user changes a destination that drives a native route preview:

- cache route payloads by stable route key
- treat the next destination as pending until route data is ready
- do not mutate the visible map-backed review state in the same interaction window as the sheet dismissal
- if a timeout fallback is needed, make it explicit and guarded

### UX Rule Locked From This Fix

When a state introduces map context:

- preload data, not the native map surface
- mount the map when the state becomes visually real
- never make a route preview component responsible for both route truth and route display
- if a transition depends on route context, wait intentionally for route readiness instead of hoping a later re-render fixes it
- if route data is already ready before the screen mounts, show the full polyline immediately and let the screen transition provide the motion
- route framing must account for sheet occlusion; horizontally dominant routes need a stronger upward bias than vertical ones
- do not use activity indicators for emergency map-loading states; use skeleton or scrim-based loading treatment instead

### Transition Rule

The intake lane must feel like one continuous state progression.

Locked rule:

- `confirm_location` may introduce a small location map before the hospital review
- `proposed_hospital` should not hard-cut away from that map instantly
- use a short transition bridge so the user feels the same geographic context evolving from "you are here" to "this is where help is"
- route review should animate as confirmation, not as decoration

### Demo Payment Rule

Sponsor/demo hospitals must feel complete without pretending they are live-certified payment endpoints.

Locked rule:

- generated `NOT CERTIFIED` demo hospitals may run a full emergency request flow
- payment for those hospitals is simulated
- simulated payment must not wait for org-admin confirmation
- the UI should say this honestly and quietly instead of exposing broken live-payment assumptions
- generated demo hospitals should still use real request, trip, and hospital records so the rest of the flow remains truthful

### Marker Decision

The hospital destination should not look like a generic pin.

Locked rule:

- reuse the existing hospital marker asset language from the map system
- destination markers in emergency review should read like medical destinations immediately

### Files That Carry The Fix

- [EmergencyIOSMobileIntakeView.jsx](../../../components/emergency/intake/views/EmergencyIOSMobileIntakeView.jsx)
- [EmergencyHospitalRoutePreview.jsx](../../../components/emergency/intake/EmergencyHospitalRoutePreview.jsx)
- [emergencyIosMobileIntake.styles.js](../../../components/emergency/intake/emergencyIosMobileIntake.styles.js)
- [useMapRoute.js](../../../hooks/emergency/useMapRoute.js)
- [EmergencyHospitalChoiceSheet.jsx](../../../components/emergency/intake/EmergencyHospitalChoiceSheet.jsx)
- [emergencyDebug.js](../../../utils/emergencyDebug.js)
