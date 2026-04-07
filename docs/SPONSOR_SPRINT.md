# Sponsor Sprint

> Status: Active
> Scope: `ivisit-app`
> Type: Working dossier for live-facing product hardening

## Purpose

This dossier isolates the current sponsor-facing sprint.

It exists to make one thing explicit:

- what the team is fixing now
- why it matters
- what is in scope
- what is not in scope
- what must be true before moving on

This file is a checkpoint document, not a full doctrine file.

Primary doctrine still lives in:

- [rules.json](./rules.json)
- [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- [WELCOME_SCREEN_DOSSIER.md](./WELCOME_SCREEN_DOSSIER.md)
- [EMERGENCY_SCREEN_DOSSIER.md](./EMERGENCY_SCREEN_DOSSIER.md)
- [EMERGENCY_UX_PROGRESS_LOG_2026-04-06.md](./EMERGENCY_UX_PROGRESS_LOG_2026-04-06.md)

## Current Goal

Carry the product from first paint into the first live emergency action surface so it is production-credible across:

- iOS
- Android
- web PWA at `app.ivisit.ng`

Current screens in focus:

- welcome / first-paint entry state is now the locked foundation
- emergency / first live-action ambulance surface is the next active build

The current job is not "finish the whole app."

The current job is:

- keep welcome stable
- build the first live-action emergency surface intentionally
- make the handoff from welcome into ambulance request feel seamless
- make the first emergency states strong enough to stand up to sponsor review

Immediate next milestone:

- turn the first successful match into a real iVisit state
- make ETA the primary visual anchor
- let route and responder details support trust without turning the screen into a dashboard

## Sprint Principle

The first screen must not feel like:

- a mockup
- a hero landing page
- a menu
- a dashboard
- a stretched phone card on web

It must feel like:

- immediate entry
- one clear primary action
- calm system confidence
- the same product across native and web

## Locked Entry Model

Current first-paint structure:

- Brand: `iVisit`
- State title: `Get help now`
- Support line: `Connecting you to care nearby.`
- Readiness chip: `Available near you`
- Primary action: `Request Help`
- Secondary action: `Find a hospital bed`
- Quiet fallback: `Sign in`

Rules:

- no marketing-style feature pitch inside the app
- no slide CTA
- no duplicated onboarding hero
- no competing equal-weight actions beyond the two core intents
- no telemedicine or revisits in entry context

## Current Progress

The welcome screen foundation is now in place:

- modular surface routing through [WelcomeScreenOrchestrator.jsx](../components/welcome/WelcomeScreenOrchestrator.jsx)
- shared copy in [welcomeContent.js](../components/welcome/welcomeContent.js)
- shared welcome tokens in [welcomeTheme.js](../constants/welcomeTheme.js)
- standardized breakpoint tokens in [breakpoints.js](../constants/breakpoints.js)
- dedicated Apple, Android, and web surface families
- shared web-surface chrome through [useWelcomeWebSurfaceChrome.js](../components/welcome/hooks/useWelcomeWebSurfaceChrome.js)
- shared wide-web styling through [buildWideWebWelcomeTheme.js](../components/welcome/buildWideWebWelcomeTheme.js)

The next active phase is:

- emergency flow audit
- emergency state model lock
- refactor of the direct ambulance request path
- documentation aligned with the real runtime constraints

Current emergency intake checkpoint:

- emergency intake now follows the welcome-screen implementation pattern: an orchestrator chooses phone, tablet, or desktop composition while flow logic stays shared
- phone intake is now address-first instead of copy-first
- `Change location` opens a real bottom search sheet
- intake-selected location now carries into request creation
- intake-selected location now also triggers hospital coverage refresh and demo ecosystem backfill when nearby hospital data is too incomplete for a full sponsor-facing experience
- `finding_nearby_help` is now the reviewed active state before legacy handoff
- `responder_matched` is the next locked build target and must reuse real trip truth
- iPhone mobile now holds on the real `responder_matched` state for UI review after request completion
- the proposed-hospital route preview no longer depends on a lucky re-render to show the polyline
- route data now preloads in the intake controller while the native map mounts only when the review posture is actually shown
- hospital reselection in `Choose another` now uses cached route payloads plus a pending-selection swap, so returning to a previous hospital no longer forces the visible review map to mutate in the same interaction window
- emergency debug checkpoints now exist for hospital-sheet interaction so Expo Go traces can separate healthy JS flow from native map failures
- the proposed-hospital map now shows the full route immediately when route data is already ready, instead of making the polyline arrive after the review state mounts
- review-map framing now compensates for horizontal routes and bottom-sheet occlusion so pins do not collapse toward the sheet edge
- spinner-based map loading has been removed from this lane; sponsor review now sees skeleton-only loading treatment
- the iPhone committed-response checkpoint now uses the real emergency map contract instead of a placeholder matched card
- matched and tracking states now reuse the existing trip-progress hook, live responder coordinates, telemetry health, and route map animation inside the iPhone review shell
- demo fallback coverage has now been reseeded/backfilled and verified so sparse-coverage users can still enter a sponsor-credible responder-ready path without being stopped by missing verified hospitals
- Corinto (`2235 Corinto Court`) has been used as a live proof point: the guest/no-auth intake now returns `clean_cycle_ready: true`, `dispatch_ready: true`, and an available ambulance for responder matching

## Why This Sprint Matters

Sponsors do not just evaluate features.

They evaluate:

- product maturity
- system coherence
- trust
- interaction quality
- whether the UI behaves like a real product under pressure

If the first screen feels unresolved, the whole product feels less mature.

## Current Scope

In scope now:

- emergency / first live-action ambulance surface
- the handoff from welcome into the ambulance path
- request-started, location-confirm, finding-help, matched, and tracking states
- emergency copy discipline and state hierarchy
- reuse and simplification of the existing request / trip / tracking modules

Not in scope right now:

- redesigning the whole visual system
- provider console
- telemedicine or revisits
- broad navigation cleanup unrelated to emergency flow
- marketing redesign beyond emergency-flow parity

## Device Classes

This sprint must explicitly work across:

- small phone
- medium phone
- tablet portrait
- tablet landscape
- desktop
- large monitor
- reduced-height viewport
- fold-like narrow/short scenarios

Rule:

- no single scaled layout
- responsive behavior must be intentional per class
- once a surface needs distinct posture by size class, use welcome-style orchestration instead of just inflating the phone implementation

## Current Technical Focus

The emergency build is being grounded through:

- runtime audit of [RequestAmbulanceScreen.jsx](../screens/RequestAmbulanceScreen.jsx)
- runtime audit of [EmergencyRequestModal.jsx](../components/emergency/EmergencyRequestModal.jsx)
- runtime audit of [EmergencyScreen.jsx](../screens/EmergencyScreen.jsx)
- shared emergency state copy in [emergencyFlowContent.js](../components/emergency/emergencyFlowContent.js)
- explicit constraints documented in [EMERGENCY_SCREEN_DOSSIER.md](./EMERGENCY_SCREEN_DOSSIER.md)

Pipeline rule:

- build the narrow emergency request surface first, not the broad map shell

## Acceptance Criteria

Before this sprint can be considered complete, the emergency surface must satisfy all of the following:

1. The user knows the ambulance request started immediately.
2. The next action is always obvious.
3. Request Help clearly resolves to ambulance response.
4. Location confirmation is minimal and calm.
5. Finding-help states do not feel empty.
6. Matched and tracking states reuse real trip truth.
7. The handoff from welcome feels continuous.
8. Auth, if required, does not erase intent.

## Working Method

This sprint follows a strict sequence:

1. Audit the real runtime flow.
2. Lock the emergency state model.
3. Refactor the direct ambulance request surface.
4. Reuse matched and tracking truth from existing trip modules.
5. Validate on device classes.
6. Only then reconcile the broader emergency tab shell.

No rushing.

No multi-screen drift.

One screen at a time.

## Current Risks

Known risks during this sprint:

- current runtime still routes welcome into auth before emergency intent is fulfilled
- `EmergencyScreen` can be mistaken for the first live-action surface even though it is broader than needed
- payment and hospital-selection assumptions can leak too early into urgent flow
- existing request and tracking logic is strong, but the current UI layering is split across multiple surfaces

## Demo Coverage Rule

When nearby live hospitals are too sparse and the product backfills complete demo hospitals:

- those hospitals may support a full request flow
- they must remain visibly `NOT CERTIFIED`
- payment is simulated for sponsor/demo coverage
- simulated payment must not introduce org-admin approval waits

## Sponsor Review Framing

When reviewed during this sprint, the correct framing is:

- this is the first true emergency-action hardening checkpoint
- the team is intentionally reusing existing trip logic instead of rebuilding fiction
- the goal is seamless ambulance request, not decorative redesign
- web, iOS, and Android are being treated as one patient product surface

## Exit Condition

This sprint ends only when the emergency screen is stable enough that downstream tracking and trip surfaces can inherit from it instead of compensating for it.

That means:

- request semantics are locked
- state order is locked
- the first live-action emergency screen feels continuous from welcome
- real trip truth is visible without dashboard clutter
- the screen reflects the product's real voice under urgency

Only after that should work move forward to:

- post-match tracking refinements
- broader emergency tab reconciliation
- deeper auth-after-intent integration
