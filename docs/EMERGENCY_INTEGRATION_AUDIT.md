# Emergency Integration Audit

> Status: Active
> Scope: `ivisit-app` + Supabase + `ivisit-console`
> Purpose: define what the current emergency system actually supports and what the new emergency UX can safely become

## Purpose

This document exists to stop emergency-screen planning from drifting away from the live backend and console contract.

It answers:

- what the current end-to-end emergency flow really is
- where auth is enforced today
- when a request becomes real in the database
- when the console can see and act on a request
- what the new proposed UX is allowed to do without backend changes

Related references:

- [EMERGENCY_SCREEN_DOSSIER.md](./EMERGENCY_SCREEN_DOSSIER.md)
- [WELCOME_SCREEN_DOSSIER.md](./WELCOME_SCREEN_DOSSIER.md)
- [SPONSOR_SPRINT.md](./SPONSOR_SPRINT.md)
- [MASTER_BLUEPRINT.md](./MASTER_BLUEPRINT.md)
- [rules.json](./rules.json)

## Semantic Lock

The agreed product language remains:

- user-facing CTA: `Request Help`
- system meaning: `Request Ambulance`

That means:

- the welcome screen stays human
- the emergency system stays specific
- the urgent path is not a vague "support" flow

## Current Live Flow

The currently integrated emergency path is still auth-first.

Actual runtime shape:

1. user opens app
2. welcome screen loads
3. user taps `Request Help`
4. app routes to signup
5. user authenticates
6. user enters authenticated app stack
7. user reaches emergency request flow
8. request is created in Supabase
9. console sees the request
10. console dispatches / updates / completes
11. patient app receives live updates

This means the live product does **not** yet satisfy the agreed `intent first, auth only when required` rule.

## Current App Boundary

### Auth Gate

The root app layout still protects the authenticated stack.

Current behavior:

- unauthenticated users are redirected into `/(auth)`
- emergency routes under `/(user)` are not publicly reachable

Implication:

- the real emergency product is still behind login

### Welcome Handoff

Current welcome behavior still routes urgent intent into signup first.

Implication:

- intent is being captured
- but the user is still interrupted by auth before entering the true emergency flow

## Current Emergency Surface Split

The app currently splits emergency across two different product surfaces.

### 1. Broad Emergency Shell

[`EmergencyScreen.jsx`](../screens/EmergencyScreen.jsx)

Role today:

- map-first context
- hospital discovery
- quick emergency actions
- bottom-sheet tracking
- broader emergency home shell

Verdict:

- useful later in the flow
- too broad to be the first live-action urgent surface

### 2. Direct Ambulance Request Flow

[`RequestAmbulanceScreen.jsx`](../screens/RequestAmbulanceScreen.jsx)

Role today:

- focused ambulance request experience
- already closer to the desired urgent path
- narrower, more controllable implementation target

Verdict:

- best foundation for the new emergency build

### 3. Existing Supporting Emergency Modules

Already reusable:

- [`EmergencyRequestModal.jsx`](../components/emergency/EmergencyRequestModal.jsx)
- [`useRequestFlow.js`](../hooks/emergency/useRequestFlow.js)
- [`EmergencyMapContainer.jsx`](../components/emergency/EmergencyMapContainer.jsx)
- [`TripSummaryCard.jsx`](../components/emergency/bottomSheet/TripSummaryCard.jsx)
- [`EmergencyContext.jsx`](../contexts/EmergencyContext.jsx)
- [`GlobalLocationContext.jsx`](../contexts/GlobalLocationContext.jsx)

Verdict:

- backend and tracking do not need reinvention
- flow simplification and state sequencing are the real work

## Supabase Contract Audit

The database is the hard truth for feasibility.

### Request Creation

The real emergency request is created by:

- `create_emergency_v4(UUID, JSONB, JSONB)`

Important constraint:

- execute permission is granted to `authenticated` and `service_role`
- execute permission is revoked from `PUBLIC` and `anon`

Implication:

- a true DB-backed emergency request cannot currently be created anonymously from the patient app

### Patient Updates

Patient-side mutation runs through:

- `patient_update_emergency_request(UUID, JSONB)`

Important constraint:

- request ownership is enforced
- updates are only valid for the authenticated owner of the request

Implication:

- once the real request exists, the patient flow assumes a signed-in owner

### Request Visibility

`emergency_requests` is protected by row-level security.

Important rules:

- patient can read only their own request
- patient can insert only their own request
- org staff can read hospital-scoped emergencies

Implication:

- the console only sees real requests after they exist in the protected tables
- a local anonymous draft is invisible to console

### Console Control Plane

The console acts through role-gated RPCs, including:

- `console_create_emergency_request`
- `console_dispatch_emergency`
- `console_complete_emergency`
- `console_cancel_emergency`
- `console_update_responder_location`
- `approve_cash_payment`

Important constraint:

- these are authenticated operator paths, not public patient-entry paths

Implication:

- console participation begins after there is a real request to act on

### Payment and Lifecycle Coupling

`create_emergency_v4` also creates:

- an `emergency_requests` row
- a linked `visits` row
- a linked `payments` row when needed

Lifecycle coupling:

- cash can enter `pending_approval`
- card can enter `in_progress`
- accepted/arrived/completed states sync downstream into visits and resource state

Implication:

- request creation is not a trivial write
- it is a full operational commit into emergency, visit, payment, and automation lifecycle

## Automation Audit

Once a real emergency request exists, automations already support the later flow.

Existing automations include:

- emergency-to-visit synchronization
- ambulance auto-assignment
- doctor auto-assignment
- resource availability syncing
- ambulance failover
- doctor failover
- realtime publication parity

Implication:

- the backend already knows how to operate after request commit
- the missing piece is the correct first patient-facing emergency sequence before and around that commit

## App Service Audit

### Request Creation Service

[`emergencyRequestsService.js`](../services/emergencyRequestsService.js)

Current behavior:

- authenticated path uses `create_emergency_v4`
- update path uses `patient_update_emergency_request`
- unauthenticated path falls back to local storage behavior

Implication:

- a pre-auth emergency intake can exist locally today
- but it is not yet a true integrated emergency until auth-backed request creation occurs

### Request Flow Hook

[`useRequestFlow.js`](../hooks/emergency/useRequestFlow.js)

Current behavior already handles:

- live location collection
- hospital selection fallback
- cost calculation
- request creation
- request completion handoff

Implication:

- the app already has most of the operational logic required
- the UX problem is sequence and surface design, not absence of core logic

### Live Tracking Context

[`EmergencyContext.jsx`](../contexts/EmergencyContext.jsx)

Current role:

- realtime emergency subscriptions
- ambulance and responder state
- trip truth
- route and ETA support

Implication:

- matched/tracking states should reuse existing context truth instead of inventing a parallel state model

## Console Audit

### Console Entry Point

[`EmergencyRequestsPage.jsx`](../../ivisit-console/frontend/src/components/pages/EmergencyRequestsPage.jsx)

Current role:

- lists emergency requests from the real database
- joins payment state
- subscribes to realtime emergency and payment changes
- derives action affordances from request status

Implication:

- the console is downstream of the DB commit
- it does not participate in pre-auth intake

### Console Action Logic

[`emergencyActions.js`](../../ivisit-console/frontend/src/utils/emergencyActions.js)

Current role:

- determines whether a request is dispatchable
- determines whether completion is allowed
- determines whether cash payment action is required

Implication:

- console behavior is already driven by canonical lifecycle states
- the new app UX should preserve those state expectations rather than inventing new server meanings

### Console Emergency Services

[`emergencyService.js`](../../ivisit-console/frontend/src/services/emergencyService.js)
[`emergencyResponseService.js`](../../ivisit-console/frontend/src/services/emergencyResponseService.js)

Current role:

- dispatch
- complete
- cancel
- update responder location
- cash approval / decline

Implication:

- console already owns the operational response side
- the patient-side redesign should focus on the pre-dispatch and early dispatch experience

## Feasibility Verdict

### Feasible Now

Without changing backend auth rules, the new urgent flow can become:

1. welcome
2. user taps `Request Help`
3. app opens focused emergency intake immediately
4. app shows `request_started`
5. app confirms location
6. app captures any minimum remaining details
7. if real request creation now requires identity, auth is called here
8. after auth, the same emergency flow resumes
9. app commits the real request with `create_emergency_v4`
10. backend automations and console take over the live operations path
11. app continues into matched / tracking states

This is the correct meaning of:

- intent first
- auth only when required

### Not Feasible Now

Without backend changes, the following are **not** currently true:

- anonymous patient can create a real emergency request visible to console
- anonymous patient can own a fully tracked emergency lifecycle row in Supabase
- console can dispatch a request that only exists as local app state

### Feasible Only With Backend Expansion

If true pre-auth emergency creation is required later, one of these must be added:

- a service-role edge function / secure server proxy for public emergency intake
- a separate anonymous draft table with later identity claim / merge

That is a backend product decision, not just a UI decision.

## Recommended New Flow

This is the best flow that fits the existing system.

### Proposed Urgent Path

1. landing page handoff
2. app welcome
3. user taps `Request Help`
4. focused emergency intake opens immediately
5. state: `request_started`
6. state: `confirm_location`
7. auth checkpoint only if required to commit
8. real request created in Supabase
9. state: `finding_nearby_help`
10. console receives request
11. dispatch / assignment happens
12. state: `responder_matched`
13. state: `tracking_arrival`

### Why This Is Correct

- protects the user from a dead stop before urgency is acknowledged
- respects current DB and console constraints
- preserves existing operational backend work
- lets the app feel immediate without lying about what is already committed

## Recommended Build Target

Build the new first live-action emergency flow on:

- [`RequestAmbulanceScreen.jsx`](../screens/RequestAmbulanceScreen.jsx)

Not on:

- [`EmergencyScreen.jsx`](../screens/EmergencyScreen.jsx)

Reason:

- `RequestAmbulanceScreen` is already the narrow urgent surface
- `EmergencyScreen` is the broader discovery / map / tracking shell
- the narrow surface is the correct place to stage the new intake-first sequence

## Implementation Consequence

The next build should not start with visual polish alone.

It should start by explicitly separating:

- `pre_commit_emergency_intake`
- `auth_checkpoint_if_required`
- `post_commit_live_emergency`

That split is the core architecture of the new experience.

## Recommended Next Sequence

1. document state machine and auth checkpoint contract
2. refactor `RequestAmbulanceScreen` into the new state-based intake surface
3. preserve intent across auth handoff
4. only commit the real request once auth is satisfied
5. reuse existing realtime / trip truth for matched and tracking states
6. reconcile `EmergencyScreen` later as the broader live shell

## Success Criteria

This integration plan passes only if:

1. the user gets reassurance immediately after `Request Help`
2. auth no longer feels like a restart of the emergency flow
3. the real DB commit still happens at a secure boundary
4. console sees only real committed emergencies
5. the patient app transitions from intake to live tracking without conceptual break
6. no part of the UX claims that help is already dispatched before the system has actually committed and routed the request
