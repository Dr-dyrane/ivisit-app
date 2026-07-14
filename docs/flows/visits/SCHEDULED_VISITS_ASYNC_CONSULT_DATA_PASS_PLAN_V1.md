---
status: active
owner: data-platform
last_updated: 2026-07-13
---

# Scheduled Visits and Async Consult Data Pass Plan (v1)

## Purpose

Close the shared data contract for scheduled in-person visits and asynchronous
telemedicine before App or Console API adapters and UI are changed.

This pass is additive. It preserves the curated emergency and demo systems,
keeps `visits` as the canonical encounter/history table, and reuses the existing
communication room tables. It does not introduce a parallel appointments table,
a parallel telemedicine session table, or a second chat engine.

## Problem Statement and Narrowed Doctrine

The current patient experience advertises scheduled care and telehealth, but the
data path is still mostly presentation truth: fixed time choices, mock clinician
selection, direct visit writes, a placeholder meeting link, and no populated
schedule source. Meanwhile, emergency care, visit history, payments, ratings,
provider discovery, and the deterministic demo ecosystem already carry carefully
curated behavior that must not be rebuilt or destabilized.

The agreed problem is therefore:

> Make scheduled in-person care and asynchronous telemedicine real end to end by
> extending existing backend truth, while preserving emergency and demo behavior.

The agreed narrowed doctrine is:

- Reuse `visits`; do not add an appointments table.
- Reuse `doctor_schedules`; make it the optional scheduling signal for both
  scheduled care and better emergency doctor preference.
- Reuse the existing communication room, participant, and message tables; do not
  add telemedicine session or chat tables.
- Represent telemedicine as secure asynchronous text, photo, short video, and
  AI-assisted drafts; do not introduce live video infrastructure.
- Assign scheduled-care doctors automatically from real availability, workload,
  specialty, facility scope, and a stable tie-break, similar in spirit to existing
  emergency resource matching.
- Never require a doctor or a schedule for emergency care. Use those signals when
  available and preserve the current fallback when they are absent.
- Keep demo and live lanes on the same contract. Extend the existing deterministic
  demo bootstrap instead of building a parallel simulator.
- Preserve historical snapshots when linked doctors or facilities change.
- Build and prove the data/RPC/RLS/Storage contract first; adopt it in APIs and UI
  only after this backend pass is coherent.
- Keep the release non-blocking and incremental: backend, then App adoption, then
  Console adoption, then EAS/web deployment after verification.

## Authority and Scope

Authority order for this pass:

1. Maintained App-owned Supabase pillars and linked database truth.
2. Existing emergency, visits, payment, rating, and demo receivers.
3. Current App visit and Book Visit behavior.
4. Console consumers of the synchronized shared contract.

In scope:

- provider timezone truth
- doctor schedule integrity and role-scoped schedule commands
- patient-safe availability projection
- atomic scheduled-visit booking and deterministic doctor assignment
- scheduled-visit lifecycle commands
- asynchronous consult rooms, messages, read state, and private media
- participant-scoped AI draft assistance
- schedule-aware emergency doctor preference with an unconditional fallback
- deterministic demo schedules and appointment-ready demo clinicians
- generated types, cross-repo synchronization, static guards, and backend tests

Out of scope for this pass:

- App or Console service adapters
- Book Visit UI, consult UI, or Console scheduler UI
- live video, WebRTC, or meeting-link generation
- a new APK, AAB, or EAS update
- production database or Edge Function deployment before verification approval
- destructive repair, reset, or cleanup of non-test data

## Verified Audit Findings

### Maintained source evidence

- `supabase/migrations/20260219000200_org_structure.sql` owns `hospitals`,
  `doctors`, and `doctor_schedules`.
- `supabase/migrations/20260219000300_logistics.sql` owns `visits` and the
  existing emergency communication room, participant, and message tables.
- `supabase/migrations/20260219000700_security.sql` currently exposes raw doctor
  schedules publicly and grants schedule mutation by organization scope without
  an explicit organization-admin role check.
- `supabase/migrations/20260219010000_core_rpcs.sql` owns the emergency chat
  commands and their execute grants.
- `services/visitsService.js` still permits direct patient visit writes.
- `hooks/visits/useBookVisitScreenModel.js` currently chooses mock doctor names,
  fixed display slots, and a placeholder telehealth destination before writing a
  visit through the shared visits facade.
- `supabase/functions/triage-copilot/index.ts` is emergency-oriented and is not a
  suitable clinical consult assistant contract.
- The private `documents` Storage bucket already exists, but its maintained
  policies only define onboarding evidence paths.

### Linked-project read-only evidence

Observed on 2026-07-13 for linked project `dlwtcmhdzoklveihuhjf`:

| Surface | Observation |
| --- | ---: |
| Hospitals | 1,598 |
| Active booking-eligible facilities | 1,495 |
| Active demo facilities | 114 |
| Doctors | 340 |
| Doctor schedules | 0 |
| Visits | 178 |
| Emergency-linked visits | 172 |
| Appointment-like visits | 1 |
| Telehealth visits | 0 |
| Visits with meeting links | 0 |
| Communication rooms | 11 |
| Rooms linked to both a request and visit | 11 |
| Appointment-only rooms | 0 |
| Room participants | 14 |
| Room messages | 2 |

The counts are point-in-time evidence, not schema invariants. No live rows were
mutated during the audit.

## Decisions Locked by the Audit

### Canonical visit record

`visits` continues to represent both emergency-derived history and scheduled
care. Scheduled care is distinguished by explicit nullable scheduling fields and
`request_id IS NULL`. Emergency-derived visit creation remains backend-owned and
must continue to work when no doctor or schedule exists.

Rejected alternatives:

- new `appointments` table
- overloading emergency requests as appointment records
- storing only display date/time strings without canonical timestamps

### Canonical consult record

The existing room tables are generalized with a channel discriminator. Emergency
rooms retain their current request and optional visit links. An async consult room
is linked to one scheduled visit and has no emergency request.

Rejected alternatives:

- new `telemedicine_sessions` table
- new chat room, participant, or message tables
- public clinical media URLs
- automatic AI messages in live clinical rooms

### Telemedicine posture

Telemedicine v1 is asynchronous text, photo, and short-video exchange with
participant-scoped AI draft help. It is not a live video call. AI output is a
draft returned to the requesting participant; it does not insert, diagnose,
prescribe, dispatch, or mutate a visit.

## Data Contract

### Hospitals

Add `hospitals.timezone TEXT NOT NULL DEFAULT 'UTC'` as the IANA timezone source
for schedule interpretation. New or updated provider records must supply a valid
IANA timezone when known. `UTC` is a safe compatibility default, not a claim that
an existing facility is physically in UTC.

### Doctor schedules

Keep the existing table and columns. Add:

- `end_time > start_time` constraint
- one exact shift per doctor/date/start/end
- 15-minute boundary alignment for schedule command writes
- rejection of nonexistent facility-local boundaries during DST transitions
- indexes for doctor/date availability and facility schedule lookup
- same-day shift contract for v1; overnight coverage is represented by two rows

Raw schedule reads are removed from anonymous/public access. Patients receive
only bookable slots through a projection RPC. Assigned clinicians may read their
own rota. Platform admins and proved organization admins may use schedule command
RPCs for doctors in their facility scope. Direct authenticated mutations are
revoked.

### Visits

Add nullable fields:

| Field | Contract |
| --- | --- |
| `doctor_id UUID` | Canonical doctor link; `ON DELETE SET NULL` preserves history |
| `care_mode TEXT` | `in_person` or `telemedicine_async` for scheduled care |
| `scheduled_start_at TIMESTAMPTZ` | Canonical instant |
| `scheduled_end_at TIMESTAMPTZ` | Canonical instant, later than start |
| `scheduled_timezone TEXT` | Booking-time timezone snapshot |
| `booking_idempotency_key UUID` | Caller retry identity |

For an active scheduled visit, all scheduling fields, `hospital_id`, and
`doctor_id` are required and `request_id` must be null. Closed scheduled history
may lose the live doctor or facility foreign key through `ON DELETE SET NULL`;
its booking-time names, media, address, specialty, and timezone snapshots remain.
Legacy and emergency rows may leave the new scheduling fields null.
`(user_id, booking_idempotency_key)` is unique when the key is present.

Active scheduled visits for the same doctor must not overlap. The booking and
reschedule commands enforce this inside the transaction after locking the chosen
doctor/slot; a UI-side availability result is never sufficient proof.
The same commands serialize per patient and reject overlapping active scheduled
visits even when callers use different idempotency keys or facilities.

### Communication rooms

Add `channel_type TEXT NOT NULL DEFAULT 'emergency'` with values:

- `emergency`
- `telemedicine_async`

Change `emergency_request_id` to nullable. Enforce:

- emergency rooms require `emergency_request_id`
- async consult rooms require `visit_id` and forbid `emergency_request_id`
- one async consult room per visit
- async-owned visits cannot be deleted while their room exists; legacy emergency
  room links retain `ON DELETE SET NULL`

Existing emergency rooms may keep both request and visit links. A global XOR
constraint would break valid existing rows and is explicitly rejected.

### Messages and read state

Extend message kinds with `image` and `video`. Add explicit attachment metadata:

- private Storage path
- MIME type
- byte size
- declared video duration in milliseconds
- reserved `ai_assisted` boolean, written only by a future trusted backend path

Text remains required as message body or attachment caption/accessibility text.
Image messages accept JPEG, PNG, or WebP up to 10 MiB. Video messages accept MP4,
WebM, or QuickTime up to 25 MiB and a declared duration no longer than 30 seconds.
SQL can validate declared metadata and Storage linkage; actual media duration
inspection is an Edge/service responsibility and must not be overstated.
The participant message RPC always writes `ai_assisted = false`; callers cannot
assert AI provenance. The draft-only Edge response may identify its own output as
AI-assisted, but that response flag is not persisted as clinical-message evidence.

Read receipts must reference a message in the same room. The participant foreign
key changes from message ID alone to `(room_id, last_read_message_id)`.

## RPC and Authorization Contract

### Availability

`get_book_visit_availability(...)` returns patient-safe slots only. It filters by
booking-eligible facility, care mode, specialty, future window, available doctor,
schedule coverage, clinician overlap, and the authenticated patient's own active
visit overlap. It does not expose raw rota rows or another patient's booking.

### Booking

`book_scheduled_visit(...)`:

1. authenticates the patient
2. validates and locks facility eligibility plus booking-time timezone truth
3. serializes the patient window, then locks and rechecks eligible candidates
4. chooses the next scheduled doctor by current scheduled workload, then stable
   doctor ID tie-break
5. inserts one canonical visit with snapshot fields
6. creates the async room and patient/doctor participants when needed
7. serializes on patient plus idempotency key and returns the same visit for a
   concurrent or later retry

No doctor or no valid slot returns an honest unavailable result. It does not
invent a clinician or meeting URL.

### Schedule commands

- `get_console_doctor_schedules(...)`
- `upsert_doctor_schedule(...)`
- `delete_doctor_schedule(...)`

All commands prove platform-admin or same-organization org-admin authority in
the `SECURITY DEFINER` body. A visible Console control is not authority.

### Visit lifecycle

`transition_scheduled_visit(...)` owns cancel, reschedule, no-show, start, and
complete transitions. It rejects emergency-linked visits and illegal transitions.

Role intent:

| Action | Patient | Assigned clinician | Scoped org admin | Platform admin |
| --- | --- | --- | --- | --- |
| Cancel upcoming | Yes, within policy window | No | Yes | Yes |
| Reschedule upcoming | Yes, within policy window | No | Yes | Yes |
| Start | No | Yes | Yes | Yes |
| Complete | No | Yes | Yes | Yes |
| Mark no-show | No | Yes | Yes | Yes |

The first implementation may use a conservative fixed cancellation/reschedule
window until organization-specific policy exists. It must be enforced on the
server and returned honestly to the client.

### Async consult commands

- `ensure_async_consult_room(p_visit_id)`
- `send_async_consult_message(...)`
- `mark_async_consult_room_read(...)`

Room content is visible only to the patient, assigned doctor, and explicit active
participants. Same-organization admins, dispatchers, support staff, and platform
admins do not receive clinical-message access merely because of their role.
Service-role access remains limited to controlled backend operations and tests.

## Private Media Contract

Reuse the private `documents` bucket under:

`telemedicine/{room_id}/{uploader_id}/{object_uuid}.{extension}`

Rules:

- no public bucket and no public URL
- force the shared private bucket to `public = false` on replay and cap uploads at
  25 MiB; message validation retains the tighter image limit
- upload only into the authenticated participant's folder
- read only when the actor is an active room participant and the object is linked
  by a message in that room
- no client object update or delete
- delayed service-owned orphan cleanup must recheck that an object remains
  unlinked before removing both the Storage object and its metadata
- message insertion verifies path ownership, room identity, object existence,
  MIME, size, and message kind

## Emergency Matching Compatibility

Emergency doctor matching may prefer a doctor whose schedule covers the current
time, then an on-call doctor, then the existing availability/capacity ordering.

Hard invariant: missing schedules, stale schedules, or no doctor must never block
emergency request creation, ambulance dispatch, bed handling, or visit-history
creation. Doctor assignment remains optional and is rendered only when present.

Ambulance-only organizations remain valid.

## Demo Contract

The existing `bootstrap-demo-ecosystem` function remains the one demo engine.
Extend it deterministically:

- ensure one appointment-ready demo clinician per active demo facility
- seed a bounded rolling future schedule with stable keys
- reruns update or reuse rows rather than append duplicates
- remove only schedule dates before the facility-local current day
- defer future-schedule and Auth retirement for a pruned demo clinician while an
  upcoming or in-progress scheduled visit still depends on that clinician
- retire unbooked pruned clinicians while preserving visit history through
  `doctor_id ON DELETE SET NULL`
- expose readiness facts for schedule, Book Visit, and async telemedicine

The current emergency demo clinician and emergency dispatch behavior are not
restructured. Demo consult simulation, when added to the API lane, must be
explicitly labelled and isolated from live consults.

## AI Assistance Contract

Add a separate JWT-verified `consult-assist` Edge Function. It must:

- require an authenticated active async-room participant
- accept bounded conversation context and optional image context references
- return a draft to the caller
- include clear non-diagnostic scope
- perform no message, visit, prescription, payment, or dispatch mutation
- never reuse the unverified emergency `triage-copilot` receiver

## Semantic Audit Closure (2026-07-13)

The backend implementation review closed these findings before API adoption:

- existing `documents` buckets are forced private and capped at 25 MiB
- patient-window advisory locking prevents overlapping bookings across different
  idempotency keys and reschedules
- booking and rescheduling hold facility truth while selecting and snapshotting
  timezone, eligibility, and clinician coverage
- legacy emergency room links retain `ON DELETE SET NULL`; a targeted trigger
  blocks deletion only for visits owned by an async consult room
- schedule and lifecycle authorization booleans deny safely when profile data is
  missing instead of relying on SQL `NULL` truthiness
- demo schedule cleanup preserves the current local day and defers retirement
  while active scheduled care still depends on the clinician

Accepted boundary: the draft-only AI receiver performs no writes. Participant
message sends therefore persist `ai_assisted = false`; trusted persisted AI
provenance requires a future backend attestation/write path and must not be
simulated with a caller-provided flag.

Current pass state: the canonical backend sources are implemented and the
pre-deploy static, compatibility, build, and zero-residue gates are green. The
pass is not production-validated: live contract drift, role, concurrency,
Storage, and per-table runtime coverage remain rollout gates after an explicitly
approved database and Edge deployment.

## Implementation Order

1. Update canonical organization and logistics pillars with additive schema,
   constraints, and indexes.
2. Update security helpers, RLS, Storage policies, table grants, and room-scope
   separation.
3. Add availability, booking, schedule, lifecycle, consult, and read RPCs plus
   explicit execute ACLs in the core RPC pillar.
4. Add schedule preference to emergency doctor matching while preserving the
   current fallback path.
5. Extend deterministic demo staff and future schedule provisioning.
6. Add the isolated `consult-assist` Edge Function and deployment config.
7. Regenerate App database types and run the maintained Console sync script.
8. Extend static guards and role, concurrency, Storage, demo, and compatibility
   matrices.
9. Review exact deployment SQL generated from maintained pillar blocks.
10. Deploy only after explicit approval, then run live catalog, role, concurrency,
    cleanup, and cross-repo drift guards.

## Verification Gates

Schema and compatibility:

- legacy/emergency visit rows remain valid
- existing emergency rooms with both request and visit links remain valid
- all existing emergency chat commands retain their signatures and behavior
- payment, tip, rating, notification, and history receivers still resolve visits
- generated App and Console types agree with the pillars

Concurrency and idempotency:

- simultaneous booking attempts for the final slot create at most one visit
- retry with the same patient/key returns one visit
- different keys cannot create overlapping active visits for one patient
- reschedule releases the old slot only when the new slot commits
- overlapping active visits for one doctor are rejected

Authorization:

- anonymous raw schedule access is denied
- patients cannot mutate schedules or another patient's visit
- unassigned providers and organization admins cannot read consult content
- assigned doctor and patient can read/send in their room
- clinician reassignment serializes visit, room, and participant updates before a
  sender is re-authorized
- cross-room read receipts and attachment paths are rejected
- RPC execute privileges exclude `PUBLIC` and `anon`

Demo and emergency:

- two demo bootstrap runs produce the same bounded schedule set
- schedule-less and doctor-less emergency requests still succeed
- schedule coverage improves doctor preference when available
- ambulance-only organizations remain functional

Storage and AI:

- private media is inaccessible across rooms
- unsupported MIME, size, duration metadata, and path shapes are rejected
- AI draft request does not create a database message
- participant message calls cannot self-declare trusted AI provenance
- cleanup preview and enforced cleanup guard both finish at zero test residue

## Rollout Boundary

Completion of this data pass means the backend contract is implementation-ready,
not that the patient or Console experience is shipped. The next pass adopts the
RPCs in App services and UI, then Console scheduling and visit projections. After
end-to-end verification, release remains an EAS update plus normal Git-based web
deployment; no APK or AAB is planned for this feature.
