# Scheduled Visits and Async Consult UI Adoption Plan (v1)

Status: backend, App, and Console implementation verified; production release pending

Audit date: 2026-07-13

Companion authority:
`docs/flows/visits/SCHEDULED_VISITS_ASYNC_CONSULT_DATA_PASS_PLAN_V1.md`

Audited baselines:

- App: `C:\Users\Dyrane\Documents\GitHub\ivisit-app`, branch
  `codex/scheduled-visits-data-contract`, commit
  `d86bd3b45cae6b6453651ddf200145f287a9781b`
- Console: `C:\Users\Dyrane\Documents\GitHub\ivisit-console`, branch `main`,
  commit `db2315a8af47bc8208e71079e97af0c89e938f2e`

All paths below are exact and repo-relative to one of those two roots. A path
starting with `frontend/` belongs to Console. Every other path belongs to App
unless the table says otherwise.

## 1. Purpose and definition of done

This plan adopts the scheduled-visit and asynchronous-consult data contract in
the existing App and Console experiences. It does not redesign the backend or
create a parallel care product.

The adoption is complete only when all of the following are true:

- App Book Visit gets patient-safe availability from the canonical RPC and books
  through the canonical booking RPC with a durable idempotency key.
- The patient chooses a facility, specialty, care mode, and slot. The server
  chooses the doctor. No App surface fabricates or preselects a clinician.
- App visit history and details distinguish scheduled visits from emergency
  visits using canonical fields, not the presence of any lifecycle value.
- Scheduled cancel and reschedule use `transition_scheduled_visit`. Existing
  emergency lifecycle receivers remain unchanged.
- Async consult reuses `emergency_chat_rooms`, `emergency_chat_participants`,
  `emergency_chat_messages`, and the current chat query/realtime mechanics.
- Async consult supports text, private images, and private videos no longer than
  30 seconds. It does not expose public media URLs.
- AI assistance produces a caller-visible, editable draft. It never sends,
  persists, diagnoses, prescribes, dispatches, books, or changes a visit.
- Console schedule administration reads and writes `doctor_schedules` only
  through the proved schedule RPCs. It no longer simulates shifts by changing a
  doctor status or reading ambulance crew arrays.
- Console visit rows, mobile sheets, desktop detail rails, modals, filters, and
  actions understand scheduled care without exposing consult content.
- Every visible action has pending, success, denied, conflict, and retry behavior
  tied to the real receiver.
- Demo and live users traverse the same service, hook, state, and UI code. Demo
  determinism comes from bootstrap data, not client mock branches.
- Backend live gates pass before UI write flags are enabled. App release is an
  EAS update and web release is the normal Git/Vercel path; no APK or AAB is part
  of this pass.

Evidence terms used in this document:

- **Verified** means the behavior or path was read in the audited baseline.
- **Planned** means this document assigns an implementation owner and contract.
- **Gate** means implementation or rollout must stop if the assertion fails.
- **Deferred** means useful work outside v1 that must not be smuggled into a
  phase as an incidental refactor.

## 2. Locked doctrine

1. `visits` is the only appointment and visit record.
2. `doctor_schedules` is the only clinician schedule record.
3. `emergency_chat_*` is the only communication engine.
4. Scheduled doctor assignment is automatic and transactional.
5. Schedules improve emergency doctor preference when present. Missing, stale,
   or empty schedules never block emergency fallback.
6. `telemedicine_async` means text, photo, short video, and optional AI-assisted
   drafting. It does not mean a live meeting URL.
7. Demo and live use one contract. The client does not generate fake doctors,
   slots, schedules, visits, rooms, or messages.
8. Visible Console CRUD is not authority. RPC or RLS proof decides whether an
   action is enabled.
9. Console operators do not receive clinical consult content merely because they
   are admins, org admins, dispatchers, or support staff.
10. Internal UUIDs are mutation identity. Display IDs are labels and lookup aids.
11. `hospitals.timezone = 'UTC'` is a compatibility value, not proof that a
    facility confirmed its local timezone. UI readiness comes from
    `timezone_confirmed_at`; authorized confirmation uses
    `confirm_hospital_timezone`.
12. Async consult text and async consult media have independent rollout gates.
    Media remains disabled until a trusted backend orphan-cleanup owner is live
    and tested.

## 3. Explicit non-goals

- No `appointments` table.
- No `telemedicine_sessions` table.
- No second chat schema, second realtime engine, or second read-receipt model.
- No WebRTC, live video, meeting-room URL, waiting room, recording, or call
  signaling.
- No doctor picker in patient booking.
- No manual doctor assignment from App or Console in v1.
- No prescription, diagnosis, clinical-note, payment, or insurance workflow in
  async consult.
- No Console reading, searching, exporting, moderating, or previewing consult
  messages or attachments.
- No ambulance crew scheduling in the doctor schedule UI.
- No organization-specific cancellation policy editor. The server's current
  fixed policy is rendered honestly.
- No raw patient access to `doctor_schedules`.
- No offline mutation queue for booking, lifecycle, message, media, or schedule
  commands.
- No replacement of emergency request, dispatch, payment, rating, tip, or visit
  history receivers.
- No whole-repo state-management, navigation, design-system, or chat refactor.
- No migration, Edge Function, bootstrap, generated-type, index, or parent-plan
  change as part of this UI adoption document.

## 4. Canonical backend evidence inventory

| Owner | Exact path | Verified contract used by UI |
| --- | --- | --- |
| Facility and organization schema | `supabase/migrations/20260219000200_org_structure.sql` | `hospitals`, facility identity, booking eligibility, and facility timezone |
| Visit schema | `supabase/migrations/20260219000300_logistics.sql` | `visits`, scheduled fields, snapshots, and legacy/emergency compatibility |
| RLS and grants | `supabase/migrations/20260219000700_security.sql` | patient, assigned clinician, schedule-admin, room-participant, Storage, and direct-write boundaries |
| RPCs and constraints | `supabase/migrations/20260219010000_core_rpcs.sql` | availability, booking, lifecycle, schedules, async room, send, read receipt, concurrency, and idempotency |
| Consult Edge entry | `supabase/functions/consult-assist/index.ts` | JWT-verified draft-only request and response |
| Consult request contract | `supabase/functions/consult-assist/contracts.ts` | prompt, message, attachment-context, and response bounds |
| Consult access | `supabase/functions/consult-assist/access.ts` | active room-participant proof |
| Consult model adapter | `supabase/functions/consult-assist/anthropic.ts` | bounded provider invocation; not a persistence receiver |
| Demo owner | `supabase/functions/bootstrap-demo-ecosystem/handler.ts` | deterministic clinicians, future shifts, and readiness facts on the live contract |
| API reference | `supabase/docs/API_REFERENCE.md` | maintained caller-facing RPC and Edge signatures |
| Generated App DB type | `supabase/database.ts` | generated backend shape; never hand-edit |
| App domain DB type | `types/database.ts` | App compile-time contract |
| Console DB type | `../ivisit-console/frontend/src/types/database.ts` | Console compile-time contract |
| Static contract guard | `supabase/tests/scripts/assert_scheduled_visits_contract.js` | source, type, signature, privilege, and compatibility guard |
| Live contract guard | `supabase/tests/scripts/assert_scheduled_visits_contract_live.js` | confirmed-project preflight/postdeploy inspection |
| Deployment harness | `supabase/tests/scripts/run_scheduled_visits_contract_deployment.js` | guarded additive deployment and live verification owner |
| Emergency chat role matrix | `supabase/tests/scripts/run_emergency_chat_rls_matrix.js` | existing emergency communication compatibility |
| Demo matrix | `supabase/tests/scripts/run_bootstrap_demo_ecosystem_matrix.js` | deterministic bootstrap and residue behavior |

UI code must call these receivers with the generated names and fields. It must
not infer live deployment from source presence. Live availability is a rollout
gate.

### 4.1 Independently verified rollout findings

These findings were supplied from a separate live/read-only rollout audit and
are hard inputs to this plan:

1. `hospitals.timezone` still defaults to compatibility `UTC`, but the deployed
   contract now exposes `timezone_confirmed_at`,
   `timezone_confirmation_source`, and `timezone_confirmed_by`. The authorized
   `confirm_hospital_timezone` RPC persists the signal, and schedule,
   availability, booking, and reschedule receivers enforce it. The UI must read
   that signal and must never infer confirmation from the timezone string.
2. The live doctor audit currently found zero usable `status`/`is_on_call`
   signals. Schedule-aware emergency ordering therefore has zero present
   behavior impact in that dataset. This is not permission to remove or tighten
   fallback: no-schedule, no-on-call, and no-doctor emergency fixtures remain
   mandatory release regressions.
3. Consult media upload happens before message RPC persistence, while participant
   clients cannot delete uploaded objects. Text consult may launch separately.
   Photo/video controls remain behind
   `EXPO_PUBLIC_ENABLE_ASYNC_CONSULT_MEDIA_V1=false` until a trusted backend
   orphan-cleanup owner exists, rechecks linkage, is tested live, and finishes
   with zero residue.
4. The deployed `documents` bucket is private and capped at 25 MiB. Insurance
   and consult media share this bucket. App pre-upload validation must keep every
   insurance upload at or below 25 MiB, consult images at or below the tighter
   10 MiB limit, and consult video at or below 25 MiB. Consult media remains
   independently gated by the orphan-cleanup requirement in finding 3.

Finding 1 was closed as an additive backend prerequisite before UI writes. It is
not permission for the UI pass to invent a local confirmation flag.

## 5. Current App inventory and adoption findings

### 5.1 Routes, shells, and navigation

| Area | Exact current paths | Verified behavior | Adoption disposition |
| --- | --- | --- | --- |
| Book Visit route | `app/(user)/(stacks)/book-visit.js`; `screens/BookVisitScreen.jsx` | Thin route and screen bridge | Keep stable |
| Book Visit composition | `components/visits/bookVisit/BookVisitScreenOrchestrator.jsx`; `BookVisitStageBase.jsx`; `BookVisitWideLayout.jsx`; `BookVisitStepPanel.jsx`; `BookVisitContextPane.jsx`; `BookVisitActionIsland.jsx`; `bookVisit.content.js`; `bookVisit.theme.js`; `bookVisitSidebarLayout.js` | Compact and wide composition already exists | Reuse; replace data and step semantics, not the shell |
| Book Visit leaves | `components/visits/book-visit/ServiceSelection.jsx`; `SpecialtySelection.jsx`; `SpecialtySearchModal.jsx`; `ProviderSelection.jsx`; `ProviderDetailsModal.jsx`; `DateTimeSelection.jsx`; `BookingSummary.jsx` | Facility and fabricated provider selection, fixed slots, pre-booking provider promise | Keep paths during v1 to limit churn; change user-facing provider step to facility selection and remove doctor choice |
| Legacy visit routes | `app/(user)/(tabs)/visits.js`; `app/(user)/(stacks)/visits.js`; `app/(user)/(stacks)/visit/[id].js`; `screens/VisitsScreen.jsx`; `screens/VisitDetailsScreen.jsx` | Bridges to the persistent map flow | Preserve compatibility; do not build a second history screen |
| Canonical history | `components/map/history/MapHistoryModal.jsx`; `MapHistoryGroup.jsx`; `MapHistoryRow.jsx`; `hooks/map/history/useMapHistoryFlow.js` | Map sheet owns visit history, selection, cancel, and meeting-link actions | Adopt scheduled projection and RPC actions here |
| Canonical detail | `components/map/views/visitDetail/MapVisitDetailOrchestrator.jsx`; `MapVisitDetailStageBase.jsx`; `MapVisitDetailStageParts.jsx`; `components/map/surfaces/visitDetail/useMapVisitDetailModel.js`; `MapVisitDetailBody.jsx`; `MapVisitDetailHero.jsx`; `MapVisitDetailSkeleton.jsx`; `visitDetail.builders.js`; `visitDetail.helpers.js` | Reused compact/wide visit-detail surface | Add scheduled fields and consult/lifecycle actions; remove live-video semantics |
| Deep links | `utils/navigationHelpers.js`; `hooks/map/useMapRouteHandlers.js` | Canonical detail target is `/(user)?mapSheet=visit_detail&visitKey={id}`; history is `mapSheet=recent_visits` | Preserve and make cold hydration fetch by visit UUID |

### 5.2 Book Visit state and data

| Layer | Exact current paths | Verified behavior | Adoption disposition |
| --- | --- | --- | --- |
| Screen model | `hooks/visits/useBookVisitScreenModel.js` | Chooses random doctor names, fixed dates/slots, direct `addVisit`, placeholder meeting link, and telehealth shortcuts | Replace orchestration with canonical facility, availability, booking, and retry state |
| Query/lifecycle | `hooks/visits/bookVisit.queryKeys.js`; `useBookVisitBootstrap.js`; `useBookVisitLifecycle.js`; `useBookVisitQuoteQuery.js`; `useBookVisit.js` | Existing layers include an alternate/mock hook and quote behavior | Keep one screen-model owner; quarantine or remove unused mock hook after importer proof |
| Persisted draft | `stores/bookVisitStore.js` | Persists Book Visit selections | Extend with booking intent fingerprint and UUID idempotency key |
| Flow machine | `machines/bookVisitMachine.js` | Owns stage transitions | Change stages to service -> specialty -> facility -> slot -> review -> result |
| Modal/search state | `atoms/bookVisitAtoms.js` | Owns search and provider modal state | Retain for facility search/details; remove doctor-selection state |
| Hospital read | `services/hospitalsService.js`; `hooks/emergency/useHospitalsQuery.ts` | Existing hospital discovery and mapping; `_mapHospital` maps specialties but not booking eligibility | Add a booking-specific, server-filtered, paged facility read; do not reuse an uncapped all-hospital list as complete truth |
| Existing hospital source in Book Visit | `hooks/visits/useBookVisitScreenModel.js` | Reads `allHospitals` from Emergency context and filters locally | Remove cross-domain dependency from booking |

### 5.3 Visits, history, and identity

| Layer | Exact current paths | Verified behavior | Adoption disposition |
| --- | --- | --- | --- |
| Compatibility context | `contexts/VisitsContext.jsx` | Thin facade over visits hooks | Preserve public shape while adopting new service methods |
| Query and state | `hooks/visits/useVisitsFacade.js`; `useVisitsQuery.js`; `useVisitsMutations.js`; `useVisitsRealtime.js`; `visits.queryKeys.js`; `stores/visitsStore.js`; `stores/visitsSelectors.js`; `atoms/visitsAtoms.js` | User-scoped list and realtime; generic direct mutations remain available | Keep reads/realtime; scheduled commands must bypass generic direct mutation methods |
| Visit service | `services/visitsService.js` | Maps legacy fields and supports direct create/update/cancel/complete; does not map the full scheduled contract | Add scheduled projection fields; do not route scheduled writes through `mapToDb` |
| History projection | `hooks/visits/useVisitHistorySelectors.js` | Treats any `lifecycleState` as emergency, uses legacy date/time, and exposes `meetingLink` as video | Fix source classification, canonical time, care mode, and actions |
| Patient/provider identity | Existing visit service hydration plus history/detail models | Scheduled and emergency identities can be conflated when provider data enriches a visit | Preserve patient from `user_id`/patient relation and doctor from `doctor_id`; never replace one with the other |

The scheduled predicate must be centralized and used everywhere:

```text
request_id is null
AND care_mode in ('in_person', 'telemedicine_async')
AND scheduled_start_at is not null
```

`lifecycle_state` alone is not a source discriminator because scheduled visits
also have lifecycle state.

### 5.4 Existing communication and media

| Layer | Exact current paths | Verified behavior | Adoption disposition |
| --- | --- | --- | --- |
| Chat service | `services/emergencyChatService.js` | Room/message queries, bounded message page, emergency RPC sends, read receipts, and realtime mapping | Extract channel-neutral reads/mappers/realtime; retain emergency compatibility exports |
| Chat hooks | `hooks/emergencyChat/emergencyChat.queryKeys.js`; `useEmergencyChatRoom.js`; `useEmergencyChatRoomLifecycle.js`; `useEmergencyChatMessages.js`; `useEmergencyChatMutations.js`; `useEmergencyChatRealtime.js` | Query cache, lifecycle, optimistic idempotent send, room realtime, and cleanup | Reuse mechanics through shared communication hooks; do not copy them into a second engine |
| Chat state | `machines/emergencyChatRoomMachine.js`; `atoms/emergencyChatAtoms.js` | Room lifecycle and view state are emergency-named | Keep emergency machine; create only thin consult state where semantics differ |
| Chat UI | `components/map/communication/EmergencyContactDispatchModal.jsx`; `EmergencyContactDispatchComposer.jsx`; `EmergencyContactDispatchMessageList.jsx`; `EmergencyContactDispatchQuickActions.jsx`; content/theme/styles/helpers in the same folder | Strong loading, archived read-only, message-list, composer, and realtime patterns; request-specific quick actions and copy | Extract shared leaves where useful; async consult gets a thin channel-specific surface without emergency quick actions |
| Existing picker pattern | `hooks/insurance/useInsuranceScreenModel.js` | Camera/library permissions and image selection | Reuse permission pattern only |
| Existing private upload pattern | `services/insuranceService.js` | Private document upload and signed URL, but image-only and URL-oriented | Do not reuse its domain API; consult requires path-first upload and message-linked signed reads |

Verified communication gaps:

- Current room mapping omits `channel_type`.
- Current message mapping omits attachment metadata and `ai_assisted`.
- Current room lookup is request-oriented, not visit-oriented.
- Current composer allows emergency text/quick actions only.
- No current short-video consult path exists.
- No current client connectivity package provides a proved offline mutation
  queue. V1 must not invent one.

## 6. Current Console inventory and adoption findings

### 6.1 Routes, role gates, and page chrome

| Area | Exact current paths | Verified behavior | Adoption disposition |
| --- | --- | --- | --- |
| Route registry | `frontend/src/app/AppRoutes.jsx`; `frontend/src/app/appRouteMetadata.js`; `frontend/src/config/navigation.js` | `/visits` is provider-minimum; `/doctors` is org-admin minimum; driver-like providers are excluded from Visits nav | Preserve route contracts |
| Mobile navigation/actions | `frontend/src/config/mobileNavigation.js`; `frontend/src/config/mobileRouteActions.js`; `frontend/src/contexts/PageActionsContext.jsx` | Route-aware mobile dock and FAB/action ownership | Preserve one primary action; schedule management is secondary to Add staff, not a competing global FAB |
| Role capabilities | `frontend/src/contexts/auth/useAuthCapabilities.js` | Client capability projection | Use for presentation only; RPC authorization remains final |
| Focus/context | `frontend/src/contexts/FocusedRecordContext.jsx`; `frontend/src/components/navigation/ContextPanel.jsx`; `frontend/src/components/context/DoctorsPanel.jsx`; `frontend/src/components/context/VisitsPanel.jsx` | Page-owned focused record and context action patterns | Add schedule and scheduled-visit context actions with fail-closed role state |

### 6.2 Current schedule implementation

| Layer | Exact current paths | Verified behavior | Required correction |
| --- | --- | --- | --- |
| Facade | `frontend/src/services/staffSchedulingService.js` | Re-exports split modules | Keep facade to limit importer churn |
| Reads | `frontend/src/services/staff-scheduling/reads.js` | Fabricates same-day shifts from doctors and ambulance crew; fixed 09:00-17:00 doctor rows | Replace with `get_console_doctor_schedules` |
| Commands | `frontend/src/services/staff-scheduling/commands.js` | Changes `doctors.status`; delete sets `off_duty`; ambulance write is not implemented | Replace with `upsert_doctor_schedule` and `delete_doctor_schedule` |
| Client conflicts | `frontend/src/services/staff-scheduling/conflicts.js` | Client-side conflict inference | Keep only as immediate guidance; server conflict is authoritative |
| Realtime/stats/roster | `frontend/src/services/staff-scheduling/realtime.js`; `stats.js`; `rosterReads.js` | Subscribes to doctors/ambulances and derives shift counts from statuses | Subscribe to scoped `doctor_schedules`; derive stats from returned schedule rows; retain scoped doctor roster for form choices |
| Modal shell | `frontend/src/components/modals/StaffSchedulingModal.jsx`; `staff-scheduling/StaffSchedulingModalView.jsx`; `StaffSchedulingCard.jsx` | Existing responsive modal composition | Reuse |
| Modal controller | `frontend/src/components/modals/staff-scheduling/useStaffSchedulingModalController.js` | Calls false schedule service and reports success after doctor status change | Replace with React Query RPC reads/mutations and receiver errors |
| Schedule UI | `frontend/src/components/modals/staff-scheduling/StaffScheduleOverview.jsx`; `StaffScheduleForm.jsx`; `schedulePresentation.js` | Includes unsupported notes/status and ambulance display concepts | Form becomes doctor, date, start, end, shift type, availability only |
| Dormant alternate scheduler | `frontend/src/components/scheduling/StaffScheduler.jsx` and its sibling folder | Separate older implementation | Do not mount, copy, or revive |
| Staff page | `frontend/src/components/pages/DoctorsPage.jsx`; `doctors/useDoctorsPageController.js`; `useDoctorsPageChrome.js`; `useDoctorsRouteBridge.js`; `DoctorsPageView.jsx`; `StaffDesktopWorkspace.jsx`; `staffPageModel.js`; `frontend/src/components/mobile/MobileDoctors.jsx`; `mobile/doctors/MobileDoctorsView.jsx`; `useMobileDoctorsController.js` | Canonical Staff page, responsive list/detail, Add staff primary action, admin/org-admin management | Mount schedule management as a scoped secondary context action and focused-doctor action |

### 6.3 Current Visits implementation

| Layer | Exact current paths | Verified behavior | Required correction |
| --- | --- | --- | --- |
| Page and data owner | `frontend/src/components/pages/VisitsPage.jsx`; `visits/useVisitsDataSource.js`; `useVisitsRouteBridge.js`; `visitPageModel.js` | Route-owned loading, filters, KPIs, focus, query-param detail, broad visits realtime, and read-only mutation posture | Keep owner; add scheduled query/action lanes and scoped invalidation |
| Desktop | `frontend/src/components/pages/visits/VisitsDesktopWorkspace.jsx` | Table, max-three KPI story, selection, sheet, and focused detail rail | Add care mode/canonical time and role-aware scheduled actions |
| Mobile | `frontend/src/components/mobile/MobileVisits.jsx`; `mobile/visits/MobileVisitRows.jsx`; `mobileVisitsModel.js` | Search, filters, skeleton, selection, grouped rows, detail sheet | Add scheduled fields/actions without shrinking desktop UI into mobile |
| Detail modal | `frontend/src/components/modals/VisitModal.jsx`; `VisitModalSections.jsx` | Generic form centered on legacy `date`; create/edit are page-disabled; identity enrichment exists | Make scheduled view canonical; keep generic create/edit disabled; use a dedicated action sheet for commands |
| Context panel | `frontend/src/components/context/VisitsPanel.jsx` | Stats, recent rows, and fail-closed create action | Replace generic create affordance with focused, role-aware scheduled actions only when proved |
| Row/detail projection | `frontend/src/utils/visitRowProjection.js`; `visitContextUtils.js`; `visitStatus.js` | Uses legacy `date`/`scheduled_at`, patient and emergency enrichment, canonical status labels | Add scheduled fields, source discriminator, timezone formatting, and doctor/patient separation |
| Service facade | `frontend/src/services/visitsService.js` | Stable import surface | Add scheduled read/command exports without enabling generic writes |
| Page query | `frontend/src/services/visits/pageQueries.js`; `pageProjection.js`; `pageEnrichment.js`; `normalization.js`; `constants.js` | Resolves at most 5,000 rows, enriches client-side, then filters/sorts/pages; refuses to claim completeness beyond the cap | Add a server-paged scheduled lane and retain the explicit cap failure for the legacy mixed lane |
| Generic commands | `frontend/src/services/visits/commands.js` | Intentionally fail-closed | Keep fail-closed; scheduled lifecycle gets a separate RPC command module |

Verified Console gaps:

- `VisitModal` and row projection prefer legacy `date`, not
  `scheduled_start_at` plus `scheduled_timezone`.
- Search cannot honestly promise enriched patient-name coverage; current server
  search covers base visit fields such as ID, type, status, notes, facility, and
  doctor name.
- Current visit realtime is route-owned but broad. It should be filtered by
  hospital for org admins and by assigned doctor identity for providers where
  the realtime filter contract supports it.
- Bulk selection is present, but bulk visit mutation has no receiver and remains
  disabled.
- Console must not query or subscribe to async consult messages.

## 7. Target projections and UI state

### 7.1 Scheduled visit projection

Both clients must normalize a scheduled row once at the service boundary:

```text
id
displayId
sourceKind = scheduled_visit
patientId and patient snapshot
doctorId and doctor snapshot
hospitalId and facility snapshot
careMode = in_person | telemedicine_async
scheduledStartAt
scheduledEndAt
scheduledTimezone
status
lifecycleState
communicationRoomId (App participant use only)
requestId = null
```

Rules:

- Use `scheduled_start_at` as the canonical instant.
- Display in the `scheduled_timezone` facility snapshot and show the timezone
  abbreviation or IANA label when ambiguity matters.
- Device-local time may be secondary copy, never a silent replacement.
- Fall back to legacy `date` only for rows that fail the scheduled predicate.
- Patient identity comes from `user_id` and its patient relation/snapshot.
- Doctor identity comes from `doctor_id` and its clinician relation/snapshot.
- A missing live doctor foreign key on closed history does not erase the stored
  booking-time doctor name.
- Console may derive `hasAsyncConsult` from care mode/room projection but may not
  load room content.

### 7.2 Action matrix

| Action | Patient App | Assigned doctor Console | Scoped org admin Console | Platform admin Console | Other provider/driver | Receiver |
| --- | --- | --- | --- | --- | --- | --- |
| View own/assigned scheduled visit | Own only | Assigned only | Organization scope | All authorized scope | No unless RLS proves assignment | `visits` RLS read |
| Book | Yes | No | No | No | No | `book_scheduled_visit` |
| Cancel upcoming | Yes within server policy | No | Yes | Yes | No | `transition_scheduled_visit` |
| Reschedule upcoming | Yes within server policy | No | Yes | Yes | No | `transition_scheduled_visit` |
| Start | No | Yes | Yes | Yes | No | `transition_scheduled_visit` |
| Complete | No | Yes | Yes | Yes | No | `transition_scheduled_visit` |
| No-show | No | Yes | Yes | Yes | No | `transition_scheduled_visit` |
| Read/send consult | Own active room | Assigned active room only | No | No | No | room RLS plus async consult RPCs |
| Read own rota | No raw rota | Yes, own only if surfaced | No through clinician lane | No through clinician lane | No | direct schedule SELECT under RLS |
| Administer schedules | No | No | Scoped doctor/facility | Authorized global scope | No | schedule RPCs |

The UI may conservatively hide an action based on role, status, and time. It must
still handle server denial because client prediction is not authority.

### 7.3 Required async states

Every route, sheet, modal, panel, and command must model these states explicitly:

- initial structural loading
- background refresh without removing usable content
- empty because no records exist
- empty because filters have no matches
- unavailable because the role is denied
- degraded because related identity/facility data failed
- conflict because a slot or shift changed
- pending mutation with the initiating control disabled
- success confirmed by receiver response
- retryable network/server failure with input retained
- terminal/archive read-only state
- known-offline stale read with mutations unavailable

Blank screens, fake zeroes, automatic success, and silent fallback to mock data
are prohibited.

## 8. End-to-end proof chains

Paths marked `[planned]` do not exist at the audited baseline. Their names are
the planned ownership contract; any implementation deviation must be appended to
the ledger in section 17.

### PC-A1: Patient availability

```text
hospitals + doctor_schedules + visits
-> get_book_visit_availability(
     p_hospital_id,
     p_specialty,
     p_care_mode,
     p_from_at,
     p_to_at
   )
-> services/scheduledVisitsService.js [planned]
-> hooks/visits/useBookVisitAvailabilityQuery.js [planned]
-> hooks/visits/useBookVisitScreenModel.js
-> components/visits/book-visit/DateTimeSelection.jsx
-> patient selects scheduled_start_at only
-> booking review receives facility/specialty/care_mode/slot
-> no write consequence until PC-A2
```

The RPC result fields are `hospital_id`, `doctor_id`, `doctor_name`,
`doctor_image`, `specialty`, `care_mode`, `scheduled_start_at`,
`scheduled_end_at`, and `scheduled_timezone`. The UI groups results by slot. It
does not expose a doctor chooser or imply that the previewed doctor is locked
before booking. A facility without the canonical timezone-confirmation signal
must produce no bookable UI slots. The client must not reinterpret compatibility
UTC or calculate local shifts itself.

### PC-A2: Patient booking

```text
persisted Book Visit intent
-> book_scheduled_visit(
     p_hospital_id,
     p_specialty,
     p_care_mode,
     p_scheduled_start_at,
     p_idempotency_key,
     p_notes
   )
-> services/scheduledVisitsService.js [planned]
-> hooks/visits/useScheduledVisitMutations.js [planned]
-> hooks/visits/useBookVisitScreenModel.js
-> components/visits/book-visit/BookingSummary.jsx
-> returned visit + communication_room_id + idempotent
-> invalidate user visit queries
-> navigateToVisitDetails(returned visit UUID)
-> App history/detail renders server-assigned doctor and canonical time
```

The booking intent key is generated once for a semantic payload and persisted in
`stores/bookVisitStore.js`. Retries with the same payload reuse it. Changing
facility, specialty, care mode, or slot rotates it. Success or an explicit full
reset clears it. The UI never optimistically inserts a visit.

### PC-A3: App history and cold detail

```text
visits RLS row for authenticated patient
-> services/visitsService.js scheduled field mapper
-> hooks/visits/useVisitsQuery.js or useVisitByIdQuery.js [planned]
-> hooks/visits/useVisitHistorySelectors.js
-> MapHistoryModal / MapHistoryRow
-> navigationHelpers visit deep link
-> useMapRouteHandlers cold hydration
-> MapVisitDetailOrchestrator / useMapVisitDetailModel
-> scheduled details and legal actions
```

Consequence: a scheduled visit is visible after booking, refresh, app restart,
and cold deep link. Provider enrichment cannot replace the patient identity.

### PC-A4: Patient cancel or reschedule

```text
focused scheduled visit
-> transition_scheduled_visit(
     p_visit_id,
     p_action = cancel | reschedule,
     p_scheduled_start_at,
     p_reason
   )
-> services/scheduledVisitsService.js [planned]
-> hooks/visits/useScheduledVisitMutations.js [planned]
-> useMapHistoryFlow / useMapVisitDetailModel
-> confirmation or reschedule slot sheet
-> RPC response
-> invalidate visit + availability + room queries
-> updated history/detail; room participants follow server reassignment/archive
```

Emergency rows continue through their existing receivers. A row with
`request_id` must never enter this chain.

### PC-A5: Async consult room, text, and read receipt

```text
active telemedicine_async visit
-> ensure_async_consult_room(p_visit_id)
-> services/asyncConsultService.js [planned]
-> hooks/asyncConsult/useAsyncConsultRoom.js [planned]
-> AsyncConsultModal [planned]
-> direct room-scoped message read under RLS through communicationService [planned]
-> send_async_consult_message(
     p_room_id,
     p_body,
     p_kind = text,
     p_client_message_id,
     p_metadata
   )
-> room-scoped realtime invalidation
-> mark_async_consult_room_read(p_room_id, p_message_id)
-> participant sees one idempotent message and updated read state
```

The shared message list/query/realtime core also serves emergency wrappers.
Emergency RPC names and quick actions do not change.

### PC-A6: Private image or short video

```text
active participant + local media
-> local kind/MIME/size/duration validation
-> private documents bucket upload at
   telemedicine/{room_id}/{actor_id}/{object_uuid}.{extension}
-> services/privateConsultMediaService.js [planned] returns storage path only
-> send_async_consult_message with caption + exact attachment metadata
-> server verifies object, path, room, owner, kind, MIME, size, duration
-> message row exists
-> participant-only signed read URL generated on demand
-> AsyncConsultMessageList renders image/video with caption
```

If upload succeeds and message insertion fails, the UI retains the same
`client_message_id` and storage path for retry. It does not delete or update the
object. Service-owned orphan cleanup remains the only cleanup authority. This
chain may be implemented and tested while disabled, but photo/video controls do
not launch until the cleanup owner passes its live linkage recheck and zero-
residue gate. PC-A5 text is independently releasable.

### PC-A7: Caller-visible AI draft

```text
active participant in AsyncConsultModal
-> explicit Draft with AI action
-> services/consultAssistService.js [planned]
-> consult-assist Edge Function with
   room_id,
   user_prompt,
   recent_messages (max 12),
   attachment_context (max 4)
-> response { draft, ai_assisted: true, scope, request_id }
-> component-local draft review state
-> user edits/discards/inserts draft into composer
-> normal send_async_consult_message only after explicit Send
-> persisted participant message has ai_assisted = false
```

No query cache, visit row, room row, message row, analytics event, or draft
history treats the Edge response as a sent clinical message.

### PC-C1: Console schedule read

```text
doctor_schedules + doctors + hospitals
-> get_console_doctor_schedules(
     p_hospital_id,
     p_from_date,
     p_to_date
   )
-> frontend/src/services/staff-scheduling/reads.js
-> useConsoleDoctorSchedulesQuery.js [planned]
-> useStaffSchedulingModalController.js
-> StaffScheduleOverview.jsx
-> role-scoped shifts in facility timezone
```

Org admin uses a server-proved facility scope. Platform admin may select an
authorized facility. No ambulance rows enter this projection.

### PC-C2: Console schedule upsert/delete

```text
Staff schedule form
-> upsert_doctor_schedule(
     p_doctor_id,
     p_date,
     p_start,
     p_end,
     p_shift_type,
     p_is_available,
     p_schedule_id
   )
   OR delete_doctor_schedule(p_schedule_id)
-> frontend/src/services/staff-scheduling/commands.js
-> useConsoleDoctorScheduleMutations.js [planned]
-> pending row/form state
-> receiver validates role, scope, 15-minute boundary, DST, overlap, and booked visits
-> invalidate schedule and availability queries
-> Console list refresh; App next availability read reflects the change
```

Console must render a booked-visit protection error as a conflict, not generic
failure or success. Before the schedule form can enter this chain, its facility
must carry a durable backend-confirmed timezone signal. Console displays the
stored IANA timezone and requires explicit confirmation, but that client gesture
does not substitute for canonical persistence or RPC enforcement.

### PC-C3: Console scheduled visit projection and detail

```text
role-scoped visits read
-> frontend/src/services/visits/scheduledQueries.js [planned]
-> frontend/src/services/visits/normalization.js
-> useVisitsDataSource.js
-> VisitsDesktopWorkspace or MobileVisits
-> focused record
-> VisitModal / desktop detail rail / mobile detail sheet / VisitsPanel
-> patient, assigned doctor, facility, care mode, facility-local time, lifecycle
```

The projection may expose that async consult exists. It must not select
`emergency_chat_messages`, attachment paths, captions, or message counts.

### PC-C4: Console scheduled lifecycle action

```text
focused scheduled visit + role-aware action
-> ScheduledVisitActionSheet.jsx [planned]
-> frontend/src/services/visits/scheduledCommands.js [planned]
-> transition_scheduled_visit exact payload
-> pending action state
-> RPC response or typed denial/conflict
-> invalidate Visits page/detail and App user-scoped visit realtime fires
-> both products render the same lifecycle truth
```

Generic `frontend/src/services/visits/commands.js` remains fail-closed.

### PC-E1: Emergency compatibility

```text
emergency request creation/matching
-> existing emergency receiver
-> schedule-covered doctor preferred when available
-> on-call/current availability ordering
-> existing doctor-optional fallback
-> request/dispatch/visit history succeeds even with no schedule or doctor
-> existing emergency App and Console UI
```

No UI adoption file may make schedule or clinician data required for emergency
rendering or actions. Because the current live doctor audit found no usable
`status`/`is_on_call` signal, the first observable behavior may remain the
existing schedule-less fallback. That is an expected compatibility result, not
an empty test.

## 9. App implementation phases

Each phase is independently reviewable and may ship disabled. Do not start its UI
write path until the preceding gates pass.

### A0. Projection and service substrate

Planned new files:

- `utils/scheduledVisitProjection.js`
- `services/scheduledVisitsService.js`
- `hooks/visits/scheduledVisits.queryKeys.js`
- `hooks/visits/useBookVisitAvailabilityQuery.js`
- `hooks/visits/useScheduledVisitMutations.js`
- `hooks/visits/useVisitByIdQuery.js`

Planned existing files:

- `services/visitsService.js`
- `hooks/visits/useVisitsQuery.js`
- `hooks/visits/useVisitsRealtime.js`
- `hooks/visits/useVisitHistorySelectors.js`
- `hooks/visits/visits.queryKeys.js`
- `contexts/VisitsContext.jsx`

Work:

- Map all scheduled fields in one normalized projection.
- Add exact RPC adapters with typed/normalized errors for unavailable slot,
  idempotency mismatch, overlap, policy-window denial, illegal transition, and
  authorization denial.
- Keep existing emergency and legacy mappings intact.
- Add direct-by-UUID patient read for cold detail hydration under RLS.
- Add query-key factories so booking/lifecycle invalidation cannot miss list,
  detail, availability, or room state.
- Add App env gates `EXPO_PUBLIC_ENABLE_SCHEDULED_VISITS_V1`,
  `EXPO_PUBLIC_ENABLE_ASYNC_CONSULT_V1`,
  `EXPO_PUBLIC_ENABLE_ASYNC_CONSULT_MEDIA_V1`, and
  `EXPO_PUBLIC_ENABLE_CONSULT_AI_DRAFT_V1`, default false until their individual
  rollout gates pass. A disabled write gate shows honest unavailability; it never
  falls back to mock booking.

Exit gate:

- Projection tests prove scheduled/emergency/legacy classification and patient
  versus doctor identity.
- Existing emergency history rows and actions are unchanged.
- No scheduled command calls a direct table write.

### A1. Availability and Book Visit composition

Planned existing files:

- `hooks/visits/useBookVisitScreenModel.js`
- `hooks/visits/useBookVisitBootstrap.js`
- `hooks/visits/useBookVisitLifecycle.js`
- `hooks/visits/bookVisit.queryKeys.js`
- `stores/bookVisitStore.js`
- `machines/bookVisitMachine.js`
- `atoms/bookVisitAtoms.js`
- `services/hospitalsService.js`
- `components/visits/bookVisit/BookVisitScreenOrchestrator.jsx`
- `components/visits/bookVisit/BookVisitStepPanel.jsx`
- `components/visits/bookVisit/BookVisitContextPane.jsx`
- `components/visits/bookVisit/BookVisitActionIsland.jsx`
- `components/visits/bookVisit/bookVisit.content.js`
- `components/visits/book-visit/ServiceSelection.jsx`
- `components/visits/book-visit/SpecialtySelection.jsx`
- `components/visits/book-visit/SpecialtySearchModal.jsx`
- `components/visits/book-visit/ProviderSelection.jsx`
- `components/visits/book-visit/ProviderDetailsModal.jsx`
- `components/visits/book-visit/DateTimeSelection.jsx`
- `components/visits/book-visit/BookingSummary.jsx`

Work:

- Present two care modes: `In person` and `Async consult`.
- Use the existing provider-selection visual area as facility selection in v1.
  Keep its path to avoid a broad rename; remove all doctor-choice copy and state.
- Add a booking-specific hospital method that server-filters verified,
  booking-eligible, available facilities by search/specialty and pages them.
- Consume a canonical facility-timezone confirmation signal before availability.
  If the signal is absent or false, do not call or locally derive slots; render
  the no-slots readiness state. Do not treat `timezone !== 'UTC'` as confirmation.
- Retain a map-seeded facility when it is eligible; otherwise explain why it is
  unavailable and offer facility search.
- Query a default 14-day availability window. The server maximum is 31 days.
- Group returned candidates by day and start time. Do not show duplicate slots
  for multiple eligible doctors and do not promise a doctor before commit.
- Review shows facility, specialty, care mode, slot, timezone, notes, and the
  statement `A clinician will be assigned automatically`.
- Remove fixed slots, random names, placeholder meeting URLs, and `video call`
  wording.
- Generate/persist the booking intent key as defined in PC-A2.

Loading and empty behavior:

- Facility search uses compact list skeletons and a debounced server query.
- Availability uses date/slot skeletons that preserve layout.
- No slots says `No times are available for this selection` with Change facility,
  Change specialty, and Change dates actions.
- A denied/unavailable receiver says booking is temporarily unavailable and
  retains the draft.

Exit gate:

- No Book Visit code references the random doctor list or fixed slot constant.
- Review contains no doctor promise and no live-video promise.
- Search/count copy never claims more facilities than the server page proves.

### A2. Booking result and navigation

Planned existing files:

- `hooks/visits/useBookVisitScreenModel.js`
- `stores/bookVisitStore.js`
- `components/visits/book-visit/BookingSummary.jsx`
- `components/visits/bookVisit/BookVisitActionIsland.jsx`
- `utils/navigationHelpers.js`
- `hooks/map/useMapRouteHandlers.js`

Work:

- The primary action becomes pending immediately and remains single-submit.
- Call `book_scheduled_visit` only.
- On idempotent success, treat the returned existing visit as success.
- On slot conflict, keep the draft, refetch availability, announce that the time
  changed, and move focus to the next available slots.
- On success, invalidate visits and navigate to the returned visit UUID.
- Confirmation shows the server-assigned clinician, facility-local time, care
  mode, and `Open consult` only for async care.
- Do not insert a local visit before the receiver returns.

Exit gate:

- Double tap, process retry, and reconnect retry create or return one visit.
- A changed payload never reuses an old idempotency key.
- Cold detail after success works without relying on in-memory store state.

### A3. History, details, and lifecycle

Planned existing files:

- `hooks/visits/useVisitHistorySelectors.js`
- `hooks/map/history/useMapHistoryFlow.js`
- `components/map/history/MapHistoryModal.jsx`
- `components/map/history/MapHistoryRow.jsx`
- `components/map/views/visitDetail/MapVisitDetailOrchestrator.jsx`
- `components/map/views/visitDetail/MapVisitDetailStageBase.jsx`
- `components/map/surfaces/visitDetail/useMapVisitDetailModel.js`
- `components/map/surfaces/visitDetail/MapVisitDetailBody.jsx`
- `components/map/surfaces/visitDetail/MapVisitDetailSkeleton.jsx`

Work:

- Render `In person` or `Async consult`, facility, specialty, assigned clinician,
  facility-local date/time, timezone, lifecycle, and preparation/notes already
  owned by the visit.
- Replace Join Video with Open consult.
- Patient cancel and reschedule appear only for upcoming scheduled rows and use
  the transition RPC.
- Reschedule reuses the availability selector and keeps the current slot visible
  until the RPC succeeds.
- Terminal consult visits remain readable but their composer is archived.
- Emergency Resume, payment, rating, directions, and call behaviors keep their
  existing source-specific predicates.

Exit gate:

- Scheduled lifecycle values are never classified as emergency by themselves.
- No scheduled cancel uses `useVisitsMutations.cancelVisit`.
- Patient name and doctor name remain distinct before and after enrichment.

### A4. Shared communication core, text consult, and gated media

Planned new files:

- `services/communicationService.js`
- `services/asyncConsultService.js`
- `services/privateDocumentUploadPolicy.js`
- `services/privateConsultMediaService.js`
- `hooks/communication/communication.queryKeys.js`
- `hooks/communication/useCommunicationMessages.js`
- `hooks/communication/useCommunicationRealtime.js`
- `hooks/asyncConsult/useAsyncConsultRoom.js`
- `hooks/asyncConsult/useAsyncConsultMutations.js`
- `components/map/communication/AsyncConsultModal.jsx`
- `components/map/communication/AsyncConsultComposer.jsx`
- `components/map/communication/AsyncConsultMessageList.jsx`
- `components/map/communication/AsyncConsultMediaPicker.jsx`
- `components/map/communication/AsyncConsultDraftPanel.jsx`

Planned existing files:

- `services/emergencyChatService.js`
- `hooks/emergencyChat/emergencyChat.queryKeys.js`
- `hooks/emergencyChat/useEmergencyChatMessages.js`
- `hooks/emergencyChat/useEmergencyChatRealtime.js`
- `hooks/emergencyChat/useEmergencyChatMutations.js`
- `components/map/communication/EmergencyContactDispatchModal.jsx`
- `components/map/communication/EmergencyContactDispatchMessageList.jsx`
- `components/map/communication/EmergencyContactDispatchComposer.jsx`
- `components/map/surfaces/visitDetail/MapVisitDetailBody.jsx`
- `services/insuranceService.js`
- `hooks/insurance/useInsuranceScreenModel.js`

Work:

- Move only generic room/message mapping, pagination, realtime, read state, and
  cache helpers into `communicationService` and shared hooks.
- Keep `emergencyChatService` and emergency hooks as compatibility facades with
  unchanged public signatures.
- Add `channel_type`, attachments, and `ai_assisted` to shared projections.
- Async consult opens by visit, calls `ensure_async_consult_room`, then reads the
  room under participant RLS.
- Land and verify the text composer/read-receipt/realtime path independently from
  attachment controls.
- Page messages newest-first at the service boundary, present oldest-to-newest,
  load 30 at a time, and retain the existing 100-row server safety maximum.
- Use stable `created_at` plus message UUID ordering/cursor behavior; do not use a
  local array length as a complete message count.
- With the media gate enabled, the composer accepts an attachment with required
  caption/accessibility text. It shows upload and send as separate pending stages.
- Validate image types JPEG/PNG/WebP at 10 MiB and video types MP4/WebM/QuickTime
  at 25 MiB and 30 seconds before upload; receiver validation remains final.
- Add one shared private-document size policy. Insurance image selection/upload
  must reject files over 25 MiB before touching the shared bucket. Consult uses
  the same bucket ceiling plus its tighter image and duration rules.
- Keep photo/video controls hidden or explicitly unavailable while
  `EXPO_PUBLIC_ENABLE_ASYNC_CONSULT_MEDIA_V1` is false. Do not enable the flag
  until a trusted backend orphan-cleanup job rechecks message linkage, cleans
  abandoned `telemedicine/` objects, passes fault injection, and leaves zero
  residue.
- Generate short-lived signed URLs only for attachment paths on rows the current
  participant can read. Expiry triggers refresh, not public fallback.
- Room-scoped realtime subscribes only while consult is open and unsubscribes on
  room change, close, sign-out, or unmount.

Exit gate:

- Existing emergency chat contract and role matrix remain green.
- Cross-room media, read receipts, subscriptions, and signed reads fail closed.
- Console imports none of the consult content services.
- Failed upload/send never displays a sent message.
- Text consult passes independently while media remains disabled.
- Insurance upload validation passes before the shared 25 MiB bucket cap is
  applied live.

### A5. AI draft adoption

Planned new file:

- `services/consultAssistService.js`

Planned existing files:

- `components/map/communication/AsyncConsultComposer.jsx`
- `components/map/communication/AsyncConsultDraftPanel.jsx`
- `hooks/asyncConsult/useAsyncConsultMutations.js`

Work:

- Put `Draft with AI` beside secondary composer tools, not as the send action.
- Require an explicit prompt or selected recent context.
- Bound request exactly: prompt 2,000 characters, up to 12 recent messages with
  7,000 aggregate characters, and up to 4 attachment context records.
- Show the returned scope text and `AI draft - review before sending`.
- Keep the draft in component-local state scoped to room ID.
- Provide Edit, Insert, Regenerate, and Discard. Send remains a separate explicit
  user action through the normal participant message RPC.
- Clear draft on room change, sign-out, archive, and successful send.

Exit gate:

- AI request creates no message, visit, prescription, payment, or dispatch row.
- No draft is sent without an explicit second action.
- Participant cannot persist trusted AI provenance.

### A6. Resilience, accessibility, and cross-platform polish

Planned existing files are the route/shell/leaves touched in A1-A5.

Work:

- Native compact view uses bottom sheets, short copy, 44 by 44 minimum targets,
  and the existing action island without covering system/bottom navigation.
- Expo web uses the existing wide Book Visit context pane and map detail sidebar;
  it does not stretch a mobile sheet into a desktop page.
- Dialogs trap focus on web, restore focus to the initiating control, close on
  Escape when safe, and announce pending/success/error state through live regions.
- Selected day/slot/care-mode controls expose selected, disabled, expanded, and
  busy accessibility states. Icons have text alternatives.
- Video/image previews have caption text. Motion respects reduced-motion state.
- A known-offline screen may show cached history/messages with `May be out of
  date`. Booking, lifecycle, schedule, and send remain unavailable; v1 never
  queues them.
- A transient failure retains user input and offers retry. Reconnect invalidates
  availability, visit detail, and open-room messages.

Exit gate:

- iOS, Android, narrow web, and wide web pass the interaction matrix in section
  14 with no blank route, hidden action, modal/bottom-bar overlap, or text clip.

## 10. Console implementation phases

### C0. Replace false schedule persistence

Planned new files:

- `frontend/src/services/staff-scheduling/projection.js`
- `frontend/src/hooks/staff-scheduling/staffScheduling.queryKeys.js`
- `frontend/src/hooks/staff-scheduling/useConsoleDoctorSchedulesQuery.js`
- `frontend/src/hooks/staff-scheduling/useConsoleDoctorScheduleMutations.js`

Planned existing files:

- `frontend/src/services/staffSchedulingService.js`
- `frontend/src/services/staff-scheduling/reads.js`
- `frontend/src/services/staff-scheduling/commands.js`
- `frontend/src/services/staff-scheduling/realtime.js`
- `frontend/src/services/staff-scheduling/conflicts.js`
- `frontend/src/services/staff-scheduling/stats.js`
- `frontend/src/services/staff-scheduling/rosterReads.js`

Work:

- Preserve the facade while replacing read/create/update/delete internals with
  exact schedule RPCs.
- Delete the meaning of synthetic IDs such as `doctor_{id}` and
  `{ambulance}_crew_{index}` from the active schedule lane.
- Map real schedule UUID, doctor/facility IDs and names, timezone, date, start,
  end, shift type, availability, and updated time.
- Read at most 180 days per RPC call; default the UI to a 14-day window.
- Client overlap checks provide immediate guidance only. RPC errors are final.
- Do not optimistically add/delete a schedule row. Mark it pending, then
  invalidate on receiver success.
- Subscribe to `doctor_schedules` only while an authorized schedule surface is
  open, filtered by selected facility when possible.
- Treat `timezone_confirmed_at` as a required service projection field. Return
  `timezone_unconfirmed` and keep schedule mutations disabled when it is null.

Exit gate:

- No active schedule command updates `doctors.status` or `ambulances.crew`.
- Unauthorized users cannot execute or see schedule management actions.
- Booked-visit protection, DST rejection, overlap, and 15-minute validation have
  dedicated error presentation.

### C1. Schedule administration UI

Planned existing files:

- `frontend/src/components/modals/StaffSchedulingModal.jsx`
- `frontend/src/components/modals/staff-scheduling/useStaffSchedulingModalController.js`
- `frontend/src/components/modals/staff-scheduling/StaffSchedulingModalView.jsx`
- `frontend/src/components/modals/staff-scheduling/StaffScheduleOverview.jsx`
- `frontend/src/components/modals/staff-scheduling/StaffScheduleForm.jsx`
- `frontend/src/components/modals/staff-scheduling/schedulePresentation.js`
- `frontend/src/components/pages/DoctorsPage.jsx`
- `frontend/src/components/pages/doctors/useDoctorsPageController.js`
- `frontend/src/components/pages/doctors/useDoctorsPageChrome.js`
- `frontend/src/components/pages/doctors/useDoctorsRouteBridge.js`
- `frontend/src/components/pages/doctors/DoctorsPageView.jsx`
- `frontend/src/components/pages/doctors/StaffDesktopWorkspace.jsx`
- `frontend/src/components/mobile/doctors/MobileDoctorsView.jsx`
- `frontend/src/components/context/DoctorsPanel.jsx`

Work:

- Mount `Schedules` as a secondary Staff context action for admin and org admin.
- Keep Add staff as the one global primary/FAB action. A focused doctor may show
  `View schedule` and `Add shift` inside its detail/context actions.
- Platform admin selects an authorized facility before doctor selection. Org
  admin is locked to proved organization facilities.
- Show the stored IANA timezone and an explicit facility-timezone confirmation
  step before Add shift. Call `confirm_hospital_timezone`, then require a reread
  with non-null `timezone_confirmed_at` before enabling Add shift.
- Form fields are doctor, date, start, end, shift type, and availability. Remove
  notes, on-duty status, and ambulance concepts.
- Use 15-minute inputs and show facility timezone next to date/time.
- Edit passes the real schedule UUID. Delete requires confirmation and explains
  that a shift with active bookings cannot be removed.
- Overview groups by facility-local date, then start time. Empty state offers Add
  shift only when authorized.
- Canonical schedule deep link is `/doctors?schedule={schedule_uuid}`. It opens
  only after role/scope proof and falls back to the Staff page with an honest
  unavailable notice when denied or missing.

Exit gate:

- Desktop modal and mobile sheet use the existing Console surface tokens, sit
  above the bottom dock, and have structural skeletons.
- The same RPC response is rendered after refresh; no UI-only schedule survives.
- A compatibility-UTC or otherwise unconfirmed facility cannot create a real
  shift, and its App booking view shows no slots.

### C2. Scheduled visit service projection and boundaries

Planned new files:

- `frontend/src/services/visits/scheduledQueries.js`
- `frontend/src/services/visits/scheduledCommands.js`
- `frontend/src/components/pages/visits/useScheduledVisitActions.js`
- `frontend/src/components/pages/visits/ScheduledVisitActionSheet.jsx`

Planned existing files:

- `frontend/src/services/visitsService.js`
- `frontend/src/services/visits/normalization.js`
- `frontend/src/services/visits/pageQueries.js`
- `frontend/src/services/visits/pageProjection.js`
- `frontend/src/services/visits/pageEnrichment.js`
- `frontend/src/services/visits/constants.js`
- `frontend/src/utils/visitStatus.js`
- `frontend/src/utils/visitRowProjection.js`
- `frontend/src/utils/visitContextUtils.js`

Work:

- Add a server-paged Scheduled lane filtered by `request_id is null`, supported
  care mode, and non-null canonical start. Order by `scheduled_start_at` and UUID
  with exact count.
- Page size remains 20 on Console. Filter and sort changes reset page 1.
- The mixed legacy/emergency lane keeps its explicit 5,000-row resolver guard;
  it must not silently downgrade to partial totals.
- Scheduled date filters use `scheduled_start_at`; legacy filters continue using
  their existing date field.
- Search scheduled rows only across server-searchable base fields. Until a
  backend patient-name projection exists, search copy must say ID, facility,
  clinician, or type, not patient.
- Normalize care mode, canonical time/timezone, assigned doctor, and source kind.
- Preserve patient/doctor/responder identities as separate projections.
- Add an RPC-only scheduled command service. Keep generic visit commands locked.

Exit gate:

- Scheduled page totals, filters, and pagination are server-complete for their
  lane.
- No capped collection is presented as a global count.
- No Console query selects consult messages or attachment data.

### C3. Scheduled rows, details, and role-aware actions

Planned existing files:

- `frontend/src/components/pages/VisitsPage.jsx`
- `frontend/src/components/pages/visits/useVisitsDataSource.js`
- `frontend/src/components/pages/visits/useVisitsRouteBridge.js`
- `frontend/src/components/pages/visits/visitPageModel.js`
- `frontend/src/components/pages/visits/VisitsDesktopWorkspace.jsx`
- `frontend/src/components/mobile/MobileVisits.jsx`
- `frontend/src/components/mobile/visits/MobileVisitRows.jsx`
- `frontend/src/components/mobile/visits/mobileVisitsModel.js`
- `frontend/src/components/modals/VisitModal.jsx`
- `frontend/src/components/modals/VisitModalSections.jsx`
- `frontend/src/components/context/VisitsPanel.jsx`

Work:

- Add All and Scheduled view controls without turning tabs into KPI cards.
- Rows show patient, care mode, status, facility, assigned clinician, and
  facility-local scheduled time. Keep max three context-relevant KPI cards.
- Desktop uses the existing focused detail rail; mobile uses the existing detail
  sheet. The generic VisitModal becomes canonical read detail, not a broad edit
  form for scheduled care.
- `/visits?id={visit_uuid}` remains the canonical detail deep link on desktop and
  mobile. Cold hydration fetches the scoped record and never substitutes a
  request display ID for UUID mutation identity.
- `ScheduledVisitActionSheet` owns cancel, reschedule, start, complete, and
  no-show confirmations. It passes only receiver-accepted fields.
- Assigned doctor sees Start/Complete/No-show for assigned rows when legal.
- Org admin and admin see server-permitted lifecycle actions in their scope.
- Drivers, unassigned providers, sponsors, and viewers get no action.
- Async care detail says `Async consult` and may show Active/Closed availability.
  It never opens or summarizes the conversation for Console admins.
- Multiple select remains available where already authorized, but bulk scheduled
  lifecycle action stays disabled because no bulk receiver exists.

Exit gate:

- Every enabled action immediately shows pressed/pending state and retains the
  sheet on error.
- Refresh and App realtime converge to the receiver response.
- Legacy/emergency details and request links retain current behavior.

### C4. Realtime, loading, and responsive completion

Planned existing files are the Console files touched in C0-C3.

Work:

- Visits subscriptions exist only while `/visits` is mounted. Filter by scoped
  facility or assigned doctor where supported; otherwise debounce one route-owned
  invalidation and rely on RLS.
- Schedule subscriptions exist only while schedule UI is open.
- Initial route, modal, detail, and schedule list use structural skeletons.
- Background refresh retains rows and marks refresh state without replacing the
  page with a skeleton.
- Mobile schedule and action sheets sit above the bottom navigation z-layer.
- Desktop keyboard order moves header -> filters -> table -> detail actions.
- Live regions announce action results. Disabled actions explain authorization,
  lifecycle, or receiver unavailability.
- Existing row selection, search, column sort, context panel, page action, and
  navbar behavior remain intact.

Exit gate:

- No duplicate realtime channel remains after close/navigation.
- Mobile at 320/375/430 CSS pixels and desktop at 1280/1440/1920 have no overlap,
  clipped labels, nested cards, or unintentional border-only separation.

## 11. Mobile, web, desktop, and accessibility contract

### App mobile

- Book Visit remains a staged vertical flow with one sticky primary action.
- Facility and slot selection use bottom sheets or full-height compact stages.
- Availability starts with the nearest meaningful date, not a desktop calendar
  compressed into the viewport.
- Consult composer remains above keyboard and safe area; attachment preview does
  not hide Send or the latest message.
- Camera/library permission denial provides Settings and Continue with text.

### App web/desktop

- Reuse `BookVisitWideLayout` and its context pane.
- Reuse the map detail sidebar/modal variants.
- Keyboard users can choose care mode, facility, date, and slot without pointer
  input.
- Deep link hydration renders a detail skeleton, then the record or a scoped
  not-found/denied state.

### Console mobile

- Staff keeps its existing list and Add staff FAB. Schedule is a focused/context
  action, not a second floating primary command.
- Visits keeps compact KPIs, search/filter row, selection grammar, grouped rows,
  and bottom detail sheet.
- Lifecycle confirmations are bottom sheets above the bottom dock.

### Console desktop

- Staff schedules reuse the modal plus right-context/detail relationships.
- Visits keeps dense table, column sorting, selection, and focused right detail.
- Schedule and lifecycle forms do not appear as editable cells in the table.

### Accessibility acceptance

- Every icon-only control has an accessible name and tooltip on web.
- Touch targets are at least 44 by 44 logical pixels.
- Selected care mode/day/slot exposes selected state.
- Pending actions expose busy and disable duplicate activation.
- Validation is associated with its field and summarized at the first invalid
  control.
- Focus enters and remains in modal/sheet, then returns to its trigger.
- Status is not communicated by color alone.
- Media has caption/accessibility text and video has explicit play/pause labels.
- Reduced motion removes nonessential transforms and transitions.

## 12. Navigation and deep-link contract

| Product | Meaning | Canonical target | Cold-start behavior |
| --- | --- | --- | --- |
| App | Book Visit | `/(user)/(stacks)/book-visit` through existing navigation helper | Load persisted draft only after auth; stale intent revalidates availability |
| App | Visit history | `/(user)?mapSheet=recent_visits` | Load user visits, then open history |
| App | Visit detail | `/(user)?mapSheet=visit_detail&visitKey={visit_uuid}` | Fetch scoped visit by UUID if list cache is empty |
| App | Async consult | Visit detail deep link, then explicit Open consult | Never deep link to raw room ID; visit authorization resolves room |
| Console | Visit detail | `/visits?id={visit_uuid}` | Fetch scoped visit, focus row/detail, or show denied/not found |
| Console | Schedule | `/doctors?schedule={schedule_uuid}` | Verify role/scope, open schedule modal/focus, or show denied/not found |

Query parameters carry lookup identity only. Mutation payloads always use the
resolved internal UUID from the authorized row.

## 13. Realtime, pagination, search, and offline boundaries

### Realtime

- App visit channel remains filtered by authenticated `user_id`.
- App consult channel is filtered by room ID and mounted only while the room is
  active/open.
- Console schedule channel is route/modal owned and facility-scoped when
  possible.
- Console visits channel is route owned and role-scoped when possible.
- Availability is not a realtime promise. Refetch on focus, date/facility change,
  mutation success, reconnect, and slot conflict.
- Realtime events invalidate canonical queries. They do not mutate a parallel
  durable store with a second truth.

### Pagination

- Booking facilities: server-paged; initial 20, subsequent 20.
- Availability: default 14-day request, maximum 31 days; group only the returned
  window and label it.
- App history: convert to server-ranged/infinite pages before claiming a total;
  initial 30 and next 30, ordered by canonical scheduled time for scheduled rows
  and existing source time for legacy rows. If a mixed stable order cannot be
  proved without a backend projection, show source-specific sections rather than
  a false global order.
- Consult messages: 30 per page, maximum request 100, stable timestamp/UUID
  cursor, room scoped.
- Console scheduled visits: 20 per page with exact count.
- Console schedules: bounded date window, maximum 180 days per call.
- The existing Console mixed Visits 5,000-row resolver stays an explicit error
  boundary until a backend mixed-source projection exists.

### Search

- Facility search runs on the server and states its loaded scope.
- Availability is filtered by facility, specialty, mode, and date parameters,
  not client search.
- App history search, if retained, searches loaded rows only and must say so; v1
  does not claim full-history search.
- Console Scheduled search uses only proved server fields. Patient-name copy is
  excluded until a server projection supports it.
- Consult message search is out of scope.

### Offline

- Cached reads may remain visible with a stale/offline label.
- Booking, reschedule, cancel, lifecycle, message, media, AI, and schedule writes
  are never queued.
- Unknown connectivity may attempt once and fail honestly. Known-offline state
  disables the action with reconnect guidance.
- Input, booking key, draft text, and unsent attachment choice remain local for
  retry, but no UI labels them sent or booked.
- Reconnect refetches before enabling a slot-dependent action.

### Deterministic demo/live parity

- App and Console call the same RPC, table read, Edge Function, Storage path,
  query key, hook, state machine, route, and component for demo and live actors.
- `bootstrap-demo-ecosystem` is the only demo schedule/readiness owner. The UI
  does not generate demo doctors, fixed slots, visits, rooms, or messages.
- A demo label may render only from a trusted row field already returned by the
  canonical service. It does not change authorization or receiver selection.
- Demo facilities must receive the same canonical timezone confirmation as live
  facilities. A compatibility-UTC demo facility without confirmation also shows
  no slots.
- Demo booking uses the same idempotency and concurrency behavior. Demo consult
  uses the same participant RLS, message RPC, private path, and media gate.
- If deterministic demo messages are introduced later, the bootstrap/API lane
  owns them. The client must not inject simulated chat into the query cache.
- Two bootstrap runs must produce the same bounded future schedule identities,
  preserve active booked dependencies, and avoid append-only growth.
- Live rows with no schedule, no usable doctor status/on-call signal, or no doctor
  continue through emergency fallback. Demo readiness must not hide that case.
- Test evidence must record both a deterministic demo actor and a non-demo actor
  for booking, lifecycle, text consult, schedule administration, and detail
  projection before production rollout.

## 14. Exact verification matrix

The `ID` values are stable release evidence keys. A gate passes only when the
test has recorded environment, actor, exact result, and cleanup status.

| ID | Layer | Setup/action | Required assertion | Automation/evidence owner |
| --- | --- | --- | --- | --- |
| B-01 | Static backend | Run `npm run hardening:scheduled-visits-contract` from App | All source/type/signature/grant checks pass | `supabase/tests/scripts/assert_scheduled_visits_contract.js` |
| B-02 | Live backend | Run `npm run hardening:scheduled-visits-live-contract -- --project-ref={confirmed_ref} --phase=postdeploy` | Correct project; tables, constraints, RPCs, grants, policies, Storage, and Edge contract present | `assert_scheduled_visits_contract_live.js` |
| B-03 | Emergency | Run `npm run hardening:chat-rls` and emergency runtime confidence suite | Existing emergency chat and doctor-optional fallback unchanged | Existing hardening scripts |
| B-04 | Demo | Run `npm run hardening:bootstrap-demo-matrix:apply` twice in the controlled test lane | Same bounded future shifts/readiness; no duplicate clinician/schedule; zero residue after cleanup | `run_bootstrap_demo_ecosystem_matrix.js` |
| B-05 | Timezone readiness | Exercise unconfirmed compatibility UTC, confirmed real UTC, and confirmed non-UTC facilities | Unconfirmed facility rejects schedule writes and yields no availability; both confirmed timezone cases use their real local boundaries | Live role/availability matrix; blocked until canonical confirmation signal exists |
| B-06 | Shared bucket | Inspect `documents` before/after deployment; upload insurance and consult boundary sizes | Bucket remains private; postdeploy cap is 25 MiB; 25 MiB or smaller insurance input passes client bucket guard; larger input fails before upload; consult image remains 10 MiB | Live Storage inventory plus App upload policy test |
| B-07 | Orphan cleanup | Upload media, force message RPC failure, link one object late, run preview/apply cleanup | Cleanup rechecks linkage, preserves linked media, removes only abandoned consult objects, and finishes at zero residue | Trusted backend cleanup harness; required before media flag |
| A-01 | Projection | Feed scheduled, emergency, legacy, closed-with-deleted-doctor, and malformed rows | Correct source, identities, fallback, care mode, and canonical time | Planned pure projection test beside `utils/scheduledVisitProjection.js` |
| A-02 | Availability | Patient selects each mode/facility/specialty/date, including unconfirmed timezone | Only RPC slots render; no doctor chooser; unconfirmed facility shows no slots; empty/conflict states are honest | Planned hook/service contract test plus App web/native walkthrough |
| A-03 | Idempotency | Double tap and retry same booking payload/key | One visit; same UUID on retry; one async room when applicable | Live concurrency fixture plus UI network retry walkthrough |
| A-04 | Intent rotation | Change facility, specialty, mode, or slot after a failed attempt | New key; unchanged payload retains old key | Planned Book Visit store test |
| A-05 | Concurrency | Two patients attempt final slot; one patient attempts overlapping slots | At most one final-slot booking; patient overlap rejected; loser refreshes availability | Live RPC concurrency matrix |
| A-06 | History/detail | Book, restart app, open history and cold deep link | Patient, doctor, facility, mode, timezone, and actions survive restart | iOS/Android/web E2E record |
| A-07 | Patient lifecycle | Cancel and reschedule inside/outside policy, and try emergency row | Legal scheduled action succeeds; policy denial retained; emergency never enters RPC | Service test plus live role matrix |
| A-08 | Consult text | Patient and assigned doctor send/retry/read; unassigned doctor/admin try | One idempotent message; read receipt same room; unauthorized actors denied | Async consult live role matrix |
| A-09 | Consult media | Verify media gate off before cleanup proof, then try valid images/videos and each invalid MIME/size/duration/path/cross-room case after proof | Text remains usable with media off; valid linked media renders by signed URL after enablement; every invalid/cross-room case fails | Storage/RLS live matrix plus release-gate inspection |
| A-10 | Media failure | Upload succeeds, message RPC fails, then retry same ID/path and abandon another object | UI never says sent before row; retry creates one message; trusted cleanup preserves linked object and removes abandoned object | Fault-injection walkthrough plus B-07 cleanup guard |
| A-11 | AI draft | Request, edit, discard, regenerate, send; unauthorized actor tries | Request creates no message; label/scope visible; only explicit Send persists normal user message | Edge smoke and UI walkthrough |
| A-12 | Offline | Open cached history/room, lose network, attempt every mutation, reconnect | Stale read labelled; no queued writes; input retained; refetch before retry | iOS/Android/web network walkthrough |
| A-13 | Accessibility | Keyboard/screen reader/reduced motion/large text on Book Visit, detail, consult | Focus, labels, selected/busy state, announcements, no clipping | Manual WCAG/mobile audit record |
| A-14 | Insurance bucket compatibility | Select insurance images below, at, and above 25 MiB before applying shared bucket cap | Below/at cap follow existing upload flow; above cap fails locally with retained form; existing insurance reads remain intact | Shared upload policy test plus Insurance App walkthrough |
| C-01 | Schedule read | Admin, scoped org admin, provider, patient, anon request schedule data | Admin/org admin scoped RPC works; provider own direct read only if surfaced; patient/anon denied | Console Jest service test plus live role matrix |
| C-02 | Schedule command | Create/edit/delete valid shift; try unconfirmed UTC, confirmed real UTC, overlap, DST gap, wrong scope, booked shift | Unconfirmed facility cannot commit; only valid confirmed/scoped command commits; dedicated errors shown; no doctor status mutation | Console Jest controller test plus live RPC matrix |
| C-03 | Schedule UX | Open desktop/modal and mobile/sheet, confirm timezone, filter dates, deep link, background refresh | Confirmation survives canonical reread; absent signal disables Add shift; skeleton/empty/pending/error; no bottom-dock overlap | Console browser screenshots and interaction log |
| C-04 | Scheduled page | Page/search/filter/sort scheduled rows across more than one page | Exact count and 20-row server pages; canonical date; honest search labels | Console service/Jest tests and browser walkthrough |
| C-05 | Console detail | Open scheduled/emergency rows by click and `/visits?id=` | Correct patient/doctor separation; care mode/timezone; emergency link unchanged | Console Jest projection test and browser walkthrough |
| C-06 | Role actions | Assigned doctor, unassigned provider, org admin, admin, driver exercise each action | Matrix in 7.2 exactly; generic writes stay disabled | Console action-hook test plus live role matrix |
| C-07 | Consult privacy | Inspect Console requests, queries, UI, exports, and realtime as admin/org admin | No message body, caption, attachment path, room content, or clinical message count | Static UI contract guard plus browser/network inspection |
| X-01 | Cross-product | Schedule shift in Console, book in App, reschedule in either legal surface | Availability and both details converge without manual repair | Recorded App/Console E2E |
| X-02 | Emergency regression | Use the current zero usable `status`/`is_on_call` doctor state, remove schedules, and create bed/ambulance emergency | Emergency request, doctor-optional fallback, dispatch, and history still work with no schedule/on-call signal | Existing emergency E2E plus explicit no-schedule fixture |
| X-03 | Build | Run App `npm run build:web` and Console `npm run build` | Production builds and existing hardgates pass | CI/build logs |
| X-04 | Encoding | Run required mojibake/non-ASCII scans on every touched text file | No accidental encoding corruption; intentional non-ASCII reviewed | PR evidence |
| X-05 | Cleanup | Run general cleanup and trusted consult orphan-cleanup preview/guard after live matrices | Zero test users, visits, rooms, messages, abandoned media, or schedules remain; linked media is preserved | Existing cleanup scripts plus B-07 owner |

Because App has no audited component-test runner, v1 must not quietly introduce a
large test framework. Pure projection/store tests may use a lightweight existing
Node script pattern; rendered behavior is proved through Expo web plus native
interaction records. Any new dependency requires a ledger decision.

## 15. Rollout gates and rollback

### Gate R0: source and deployment readiness

- Parent data contract is reviewed.
- Exact deployment SQL is additive and non-destructive.
- Confirmed-project preflight and postdeploy live guards pass.
- `consult-assist` and updated demo bootstrap deploy successfully.
- Role, RLS, concurrency, idempotency, Storage, field-coverage, contract-drift,
  emergency-fallback, and zero-residue matrices pass.
- A durable facility-timezone confirmation signal exists and schedule plus
  availability receivers enforce it. Compatibility UTC alone does not pass.
- The shared `documents` bucket remains private and its intended 25 MiB cap is
  tested against existing insurance uploads before rollout.

Stop condition: any failed live assertion. Do not enable UI writes.

### Gate R1: safe client substrate

- App scheduled and consult env gates exist and default false.
- App text consult, consult media, and AI draft have separate default-false gates.
- Console scheduled/schedule controls exist behind default-false release gates.
- Disabled state does not fall back to mock booking, direct visit writes, doctor
  status updates, or public media.
- Projection and emergency regression tests pass.

### Gate R2: internal read rollout

- Enable scheduled reads/details for internal demo users.
- Keep booking, lifecycle, consult send, and schedule mutations disabled.
- Confirm timezone, identity, pagination, deep link, and deterministic demo.
- Confirm unready facilities show no slots and cannot create shifts.

### Gate R3: internal write rollout

- Enable Console schedule administration for named internal admins/org admins.
- Enable App booking and patient lifecycle for internal users.
- Enable async text independently after its room/message gates pass.
- Keep photo and short-video controls disabled until the trusted orphan-cleanup
  owner passes B-07 and X-05. Then enable photo, then short video.
- Enable AI draft independently after A-11; it does not depend on media.
- Each capability advances only after its matrix rows pass and cleanup is zero.

### Gate R4: production rollout

- Publish App through EAS update and web export after native/web E2E.
- Merge/push Console through the normal Git/Vercel deployment after Console E2E.
- Monitor RPC denial/conflict/error rates, duplicate booking attempts, media send
  failures, orphan cleanup outcomes, stale room subscriptions, unconfirmed
  timezone blocks, insurance size rejections, and Console schedule conflicts.
- Do not report booking, message, or schedule success from client telemetry alone;
  compare backend rows/receiver responses.

### Rollback

- Turn off the affected UI release gate and ship an EAS/web update. Keep canonical
  read-only scheduled history visible.
- Media rollback disables attachment controls without disabling text consult.
- AI draft rollback disables drafting without disabling normal text send.
- Console rollback hides write actions and leaves schedule/visit reads available.
- Never reactivate legacy mock booking, direct scheduled visit writes, doctor
  status schedule simulation, public media, or Console clinical content.
- Do not drop additive columns, rows, rooms, messages, schedules, RPCs, or Storage
  policy as a UI rollback.
- Existing emergency paths remain active throughout.
- If a client version cannot be gated remotely, publish a forward fix. Roll back
  to a prior update only if that update is proved not to use the unsafe legacy
  booking/schedule path.

## 16. Blast-radius controls and collaboration boundaries

1. One owner edits shared App `services/visitsService.js` and
   `hooks/visits/useVisitHistorySelectors.js` at a time.
2. One owner edits Console Visits query/projection files at a time.
3. App Book Visit, shared communication, Console scheduling, and Console visit UI
   can proceed in parallel only after A0 contracts land and their file packs do
   not overlap.
4. Preserve facades (`VisitsContext`, `visitsService`,
   `staffSchedulingService`, `emergencyChatService`) while importers migrate.
5. Do not rename Book Visit provider leaf files in v1; first correct semantics,
   then record any rename as a separate follow-up.
6. No direct Supabase/App/Edge/Storage call may be added in a page component.
   Services own calls; hooks own cache/lifecycle; views render state.
7. No scheduled command may call generic visit mutation helpers.
8. No schedule command may mutate doctor status or ambulance crew.
9. No Console module may import async consult message/media services.
10. No global shell/PageData provider may prefetch consult, schedules, or visit
    details for unrelated routes.
11. No UI-only conflict check claims authority; receiver response wins.
12. Do not add a dependency until the current dependency cannot satisfy the
    proved requirement. Record the decision before installation.
13. Every phase gets a coherent commit only after its tests pass. Do not mix
    backend deployment, App adoption, and Console adoption in one commit.
14. Before every commit: inspect status/diff, stage only owned files, run targeted
    tests, run encoding checks, and leave unrelated work untouched.
15. Generated types are regenerated from canonical schema when required and are
    never hand-edited.
16. The timezone confirmation state is backend-owned. Do not persist it in local
    storage, infer it from `UTC`, or let a Console checkbox bypass receiver proof.
17. Media UI and text consult keep separate release flags. No attachment control
    is enabled until the trusted cleanup owner is recorded in the ledger.
18. Because `documents` is shared, the only non-consult App files admitted to
    the media file pack are `services/insuranceService.js` and
    `hooks/insurance/useInsuranceScreenModel.js`, solely for the 25 MiB
    pre-upload compatibility guard.

## 17. Append-only implementation ledger

This ledger is the durable record of how implementation differs from this plan.
Entries are append-only. Never rewrite an earlier entry to make the plan appear
prescient. If an entry is wrong, append a correction referencing its ID.

Required entry template:

```text
### UI-ADOPT-{four digit sequence}

- Timestamp UTC:
- Actor/session:
- Repo and branch:
- Phase/gate:
- Intent:
- Planned files:
- Actual files:
- Unplanned files touched and why:
- Contract proof chain:
- Deviation from plan:
- Decision and evidence:
- Tests run:
- Test result/evidence path:
- Demo/live parity checked:
- Emergency regression checked:
- Accessibility/responsive checked:
- Commit/deployment reference:
- Rollback state:
- Follow-up owner:
```

Initial planned entries:

### UI-ADOPT-0001

- Timestamp UTC: planned 2026-07-13
- Actor/session: unassigned
- Repo and branch: App, implementation branch to be named
- Phase/gate: A0 / R1
- Intent: add scheduled visit projection, RPC adapters, query keys, cold detail,
  and default-off release gates without changing UI behavior
- Planned files: A0 list in section 9
- Actual files: pending
- Unplanned files touched and why: pending
- Contract proof chain: PC-A1 through PC-A4 substrate
- Deviation from plan: pending
- Decision and evidence: preserve existing facades and emergency mapping;
  compatibility UTC is not timezone confirmation
- Tests run: A-01, B-01, B-03, B-05, X-02 through X-04
- Test result/evidence path: pending
- Demo/live parity checked: pending
- Emergency regression checked: pending
- Accessibility/responsive checked: not applicable beyond disabled state
- Commit/deployment reference: pending
- Rollback state: flags default false
- Follow-up owner: A1 implementer

### UI-ADOPT-0002

- Timestamp UTC: planned 2026-07-13
- Actor/session: unassigned
- Repo and branch: App, implementation branch to be named
- Phase/gate: A1-A3 / R2-R3
- Intent: replace mock Book Visit with facility/availability/booking and adopt
  scheduled history/detail/lifecycle
- Planned files: A1, A2, and A3 lists in section 9
- Actual files: pending
- Unplanned files touched and why: pending
- Contract proof chain: PC-A1 through PC-A4
- Deviation from plan: pending
- Decision and evidence: automatic doctor assignment; no optimistic visit insert
- Tests run: A-02 through A-07, X-01 through X-04
- Test result/evidence path: pending
- Demo/live parity checked: pending
- Emergency regression checked: pending
- Accessibility/responsive checked: pending
- Commit/deployment reference: pending
- Rollback state: writes remain gated until R3
- Follow-up owner: A4 implementer

### UI-ADOPT-0003

- Timestamp UTC: planned 2026-07-13
- Actor/session: unassigned
- Repo and branch: App, implementation branch to be named
- Phase/gate: A4-A6 / R3
- Intent: extract shared communication mechanics and add async text/media/AI draft
- Planned files: A4, A5, and A6 lists in section 9
- Actual files: pending
- Unplanned files touched and why: pending
- Contract proof chain: PC-A5 through PC-A7
- Deviation from plan: pending
- Decision and evidence: one chat engine; text independently releasable; private
  linked media blocked on trusted orphan cleanup; shared insurance bucket guard;
  draft-only AI
- Tests run: A-08 through A-14, B-03, B-06, B-07, X-03 through X-05
- Test result/evidence path: pending
- Demo/live parity checked: pending
- Emergency regression checked: pending
- Accessibility/responsive checked: pending
- Commit/deployment reference: pending
- Rollback state: consult capabilities independently gated
- Follow-up owner: release owner

### UI-ADOPT-0004

- Timestamp UTC: planned 2026-07-13
- Actor/session: unassigned
- Repo and branch: Console, implementation branch to be named
- Phase/gate: C0-C1 / R2-R3
- Intent: replace false schedule persistence and mount scoped administration UI
- Planned files: C0 and C1 lists in section 10
- Actual files: pending
- Unplanned files touched and why: pending
- Contract proof chain: PC-C1 and PC-C2
- Deviation from plan: pending
- Decision and evidence: real doctor schedule RPCs; Add staff remains primary
  action; canonical timezone confirmation is mandatory
- Tests run: B-05, C-01 through C-03, X-01 through X-04
- Test result/evidence path: pending
- Demo/live parity checked: pending
- Emergency regression checked: pending
- Accessibility/responsive checked: pending
- Commit/deployment reference: pending
- Rollback state: schedule writes default disabled
- Follow-up owner: C2 implementer

### UI-ADOPT-0005

- Timestamp UTC: planned 2026-07-13
- Actor/session: unassigned
- Repo and branch: Console, implementation branch to be named
- Phase/gate: C2-C4 / R2-R3
- Intent: add complete scheduled projection, canonical detail, and role-aware
  lifecycle actions without exposing consult content
- Planned files: C2, C3, and C4 lists in section 10
- Actual files: pending
- Unplanned files touched and why: pending
- Contract proof chain: PC-C3 and PC-C4
- Deviation from plan: pending
- Decision and evidence: scheduled server page; generic commands stay fail-closed
- Tests run: C-04 through C-07, X-01 through X-04
- Test result/evidence path: pending
- Demo/live parity checked: pending
- Emergency regression checked: pending
- Accessibility/responsive checked: pending
- Commit/deployment reference: pending
- Rollback state: lifecycle actions default disabled
- Follow-up owner: release owner

### UI-ADOPT-0006

- Timestamp UTC: planned 2026-07-13
- Actor/session: release owner
- Repo and branch: App and Console release branches
- Phase/gate: R4
- Intent: complete cross-product E2E, publish EAS update, and deploy Console/web
- Planned files: no product edits unless a failed gate requires a documented fix
- Actual files: pending
- Unplanned files touched and why: pending
- Contract proof chain: PC-A1 through PC-E1
- Deviation from plan: pending
- Decision and evidence: pending
- Tests run: full section 14 matrix, including independent text/media gates
- Test result/evidence path: pending
- Demo/live parity checked: pending
- Emergency regression checked: pending
- Accessibility/responsive checked: pending
- Commit/deployment reference: pending
- Rollback state: pending
- Follow-up owner: operations/monitoring owner

### UI-ADOPT-0007

- Timestamp UTC: 2026-07-14T04:33:24Z
- Actor/session: Codex backend rollout session
- Repo and branch: App `codex/scheduled-visits-data-contract`; Console `main`
- Phase/gate: data deployment / R0
- Intent: prove the exact deployed backend before App or Console UI writes
- Planned files: maintained schema pillars, generated types, `consult-assist`,
  demo bootstrap, contract harnesses, and this evidence ledger
- Actual files: data-pass implementation pack plus bounded consult provider
  fallback, demo timezone resolver, collision-safe demo hospital allocation,
  live deployment/E2E harnesses, and rollout evidence docs
- Unplanned files touched and why: demo hospital coordinate allocation was
  hardened after the live matrix exposed a deterministic unique-key collision;
  timezone provider fallback was added after the linked Google key returned
  `REQUEST_DENIED`
- Contract proof chain: canonical schema/RPC/Edge/Storage -> live project ->
  role/concurrency/idempotency harness -> demo bootstrap -> zero residue
- Deviation from plan: Google remains the preferred demo timezone source;
  validated TimeAPI coordinate resolution is the bounded demo-only fallback
- Decision and evidence: project `dlwtcmhdzoklveihuhjf`; post-deploy 19/19;
  live E2E 14/14 run `1784003441752-f1088c8b`; demo matrix 25/25 phases
- Tests run: 319 static checks, Deno check/lint, post-deploy guard, five-region
  bootstrap matrix, repeated Hemet matrix, full live scheduled-visits E2E
- Test result/evidence path:
  `supabase/tests/artifacts/scheduled_visits_live_e2e_report.json`
- Demo/live parity checked: yes; one receiver contract and five live demo regions
- Emergency regression checked: yes; schedule preference plus unconditional
  emergency fallback passed in the live E2E harness
- Accessibility/responsive checked: not applicable to backend gate
- Commit/deployment reference: migration
  `20260713020000_scheduled_visits_async_consult_runtime_sync.sql`; deployed
  `consult-assist` and `bootstrap-demo-ecosystem`
- Rollback state: additive schema retained; UI write gates remain independently
  controllable
- Follow-up owner: App and Console UI implementation owners

### UI-ADOPT-0008

- Timestamp UTC: 2026-07-14T04:56:07Z
- Actor/session: Codex backend/UI integration session
- Repo and branch: App `codex/scheduled-visits-data-contract`; Console `main`
- Phase/gate: timezone prerequisite / R0
- Intent: close the confirmed-real-UTC versus compatibility-UTC ambiguity
  before enabling schedule or booking UI
- Planned files: organization pillar, core RPC pillar, generated App/Console
  types, demo bootstrap, API docs, and scheduled-care guards
- Actual files: planned pack plus live E2E confirmation-role assertions
- Unplanned files touched and why: none
- Contract proof chain: hospital confirmation fields -> authorized confirmation
  RPC -> schedule/availability/booking/reschedule enforcement -> App/Console
  projections
- Deviation from plan: missing-signal risk R-15 was closed before UI writes
  rather than leaving schedule creation permanently disabled
- Decision and evidence: exact-source digest `9ed59d572adbf0f6`; post-deploy
  20/20; live E2E 14/14 run `1784004570245-3efdc05d`; five-region matrix 25/25
- Tests run: 349 static checks, Deno check/lint, 7/7 forced-rollback
  deployment preflight, 20/20 post-deploy, Hemet smoke, five-region matrix,
  full live E2E, zero-residue cleanup
- Test result/evidence path:
  `supabase/tests/artifacts/scheduled_visits_live_e2e_report.json`
- Demo/live parity checked: yes; demo writes the same confirmation fields and
  real admins use the scoped RPC
- Emergency regression checked: yes; unconditional emergency fallback remained
  green in the live harness
- Accessibility/responsive checked: not applicable to backend prerequisite
- Commit/deployment reference: temporary deployment version
  `20260714044500`, removed after apply; remote history repaired as reverted
- Rollback state: additive columns/RPC are live; UI feature flags remain the
  release rollback boundary
- Follow-up owner: App and Console UI implementation owners

### UI-ADOPT-0009

- Timestamp UTC: 2026-07-14T06:47:11Z
- Actor/session: Codex App UI implementation and verification session
- Repo and branch: App `codex/scheduled-visits-data-contract`
- Phase/gate: A0-A6 / R1-R3
- Intent: connect the existing Book Visit, history, detail, lifecycle, and
  communication surfaces to the deployed scheduled-care contract
- Planned files: App service, query, state, Book Visit, map history/detail,
  async-consult, release-flag, and UI contract packs in section 9
- Actual files: planned packs plus `utils/visitHistoryIdentity.js`,
  `utils/releaseFlag.js`, cold-detail skeleton correction, availability cache-key
  correction, and post-booking visit cache priming
- Unplanned files touched and why: patient/doctor/responder identity helpers were
  separated after independent review found emergency responders could be replaced
  by scheduled-clinician enrichment; the booking mutation now primes list/detail
  caches so the canonical visit route renders immediately while refetch reconciles
- Contract proof chain: facility read -> availability RPC -> durable booking intent
  -> booking RPC -> normalized Visits list/detail cache -> canonical
  `mapSheet=visit_detail&visitKey=<uuid>` route -> scheduled actions; async room RPC
  -> participant-scoped messages/realtime -> editable AI draft -> explicit send
- Deviation from plan: consult media controls remain absent and the media gate stays
  false because a trusted orphan-cleanup owner is not live; v1 releases text and
  optional draft assistance only
- Decision and evidence: server assigns the clinician; no fake provider choice,
  fixed slot, optimistic visit insert, meeting URL, or client demo branch remains
- Tests run: scheduled-visits UI contract, async-consult UI contract, 349 static
  scheduled contract checks, cross-repo contract drift, emergency hardening,
  emergency-chat RLS, cleanup dry-run, and Expo web export
- Test result/evidence path: UI contract tests pass; contract drift reports zero
  missing tables/columns/RPCs across 33 tables and 67 RPCs; web export bundled
  2,818 modules
- Demo/live parity checked: yes; one service/hook/UI lane consumes both bootstrap
  and ordinary live rows
- Emergency regression checked: yes; static emergency hardening and 23/23 live
  emergency-chat RLS cases pass
- Accessibility/responsive checked: structural loading, archived/read-only consult,
  cold detail, compact/wide composition, and explicit pending/error actions verified;
  authenticated App visual proof remains dependent on a patient browser session
- Commit/deployment reference: implementation commit and EAS Update pending R4
- Rollback state: scheduled reads/writes, async text, and AI draft have independent
  release flags; media remains false
- Follow-up owner: release owner

### UI-ADOPT-0010

- Timestamp UTC: 2026-07-14T06:47:11Z
- Actor/session: Codex Console implementation and browser-verification session
- Repo and branch: Console `main`
- Phase/gate: C0-C4 / R2-R3
- Intent: replace simulated staff shifts, add scoped scheduled-visit projections,
  and preserve the established desktop/mobile Console grammar
- Planned files: Console schedule service/hooks/modal and Visits
  query/projection/page/mobile/detail/action packs in section 10
- Actual files: planned packs plus global Visits realtime removal, dormant scoped
  query allowlisting, focused-clinician schedule launch, clinician-facility selector
  scoping, and neutral default mobile sheet actions
- Unplanned files touched and why: browser proof exposed the admin selector trying to
  load all 1,598 hospitals and rejecting its own 500-row cap; it now derives the
  complete relevant facility set from the clinician directory and fails explicitly
  rather than presenting partial data. Browser proof also exposed the retired red
  default CTA, so the shared sheet action and canon were corrected to neutral ink.
- Contract proof chain: schedule-admin role -> clinician facility projection ->
  confirmed IANA timezone -> canonical schedule RPC -> local-time modal -> realtime
  scoped by facility roster; scheduled visit role -> server page/detail projection ->
  route/mobile/desktop details -> lifecycle RPC action sheet -> App consequence
- Deviation from plan: Today summary freshness uses scoped read refresh on focus
  instead of an unfiltered global `visits` realtime channel
- Decision and evidence: generic history selects only allowlisted non-clinical
  fields and excludes scheduled care; scheduled projection has no consult content;
  no direct `doctor_schedules` read or unscoped Visits realtime owner remains
- Tests run: 15 focused suites / 112 tests, schedule selector/controller follow-ups,
  changed-file ESLint, database encoding, mojibake, data contract, UI hardgate,
  mobile grammar, and production build
- Test result/evidence path: all tests and gates pass; build scans 144 service files,
  verifies 464 high-confidence references, reaches 689 UI files, and compiles
- Demo/live parity checked: yes; the live browser rendered one async scheduled visit
  and 13 facility-local clinician shifts from the same canonical paths
- Emergency regression checked: yes; generic/emergency source scope remains separate,
  request realtime remains request-id scoped, and Console build gates pass
- Accessibility/responsive checked: desktop detail modal, 390x844 mobile feed/detail,
  mobile lifecycle action sheet, bottom dock/FAB, focus feedback, modal stacking, and
  honest loading/denied/not-found/retry states verified
- Commit/deployment reference: Console implementation commit/push pending R4
- Rollback state: schedule reads/writes and scheduled visit reads/actions remain
  independently gated; ordinary visit history remains available
- Follow-up owner: release owner

## 18. Highest-risk adoption decisions

| Risk | Why it is dangerous | Required closure |
| --- | --- | --- |
| R-01 Fake doctor choice | Current Book Visit selects a random/fabricated clinician while the server contract assigns automatically | Remove all doctor input and pre-booking clinician promises before enabling booking |
| R-02 False schedule persistence | Current Console reports success after changing doctor status, not a schedule row | Replace all active read/write paths with schedule RPCs before mounting UI |
| R-03 Source misclassification | Current history treats any lifecycle state as emergency | Centralize the scheduled predicate and test all row generations |
| R-04 Direct write bypass | Current App visits service can insert/update/cancel directly | Scheduled calls use only dedicated RPC service; generic methods remain legacy/emergency-specific |
| R-05 Identity replacement | Enrichment can blur patient, doctor, and responder | Separate IDs/projections and test modal/detail after request synchronization |
| R-06 Clinical privacy leak | Reusing chat can tempt Console room/message reads | App-only consult service; static import/query guard; Console shows availability state only |
| R-07 Media truth gap | Upload can succeed before message insertion and participant clients cannot delete objects | Keep media flag off; two-stage pending UI, stable retry ID/path, trusted service-owned orphan cleanup, no client delete |
| R-08 Idempotency misuse | Regenerating key on retry duplicates intent; reusing after edits aliases different intent | Persist key with semantic fingerprint and unit-test rotation rules |
| R-09 Timezone drift | Legacy `date`, device time, facility time, and compatibility UTC can disagree | Canonical instant plus booking-time IANA snapshot; durable confirmation required before schedules/slots; never infer from value |
| R-10 Partial truth | App all-hospital reads and Console 5,000-row resolver can look complete | Server-paged booking/scheduled lanes and explicit legacy cap errors |
| R-11 Realtime leakage | Broad/global channels can load protected data or duplicate refresh | Route/room ownership, role filters, debounced invalidation, cleanup tests |
| R-12 Demo divergence | Client mocks may make demo pass while live fails | No client demo branch; two bootstrap runs and one RPC/UI path |
| R-13 Emergency regression | Making schedules or doctors required could block urgent care; current live doctors provide no usable status/on-call signal | Explicit zero-status/no-schedule/no-doctor E2E gate before every rollout |
| R-14 AI overstatement | Draft can be mistaken for sent medical advice | Caller-visible draft scope, explicit review/send, no persistence or trusted provenance |
| R-15 Missing timezone signal | Default compatibility UTC must not unlock schedule or booking | Closed in backend: consume `timezone_confirmed_at`; confirm only through `confirm_hospital_timezone` |
| R-16 Shared bucket cap | Applying 25 MiB to `documents` affects existing insurance as well as consult media | Add shared client guard and insurance regression before live cap deployment |

## 19. Implementation start checklist

Before the first code edit, the implementation owner must confirm:

- the live backend gate and project reference status
- the exact active phase and owned file pack
- no overlapping contributor owns a shared file
- current App and Console git status without cleaning unrelated work
- generated App/Console type parity
- the release gates and safe disabled behavior
- the canonical facility-timezone confirmation signal and its enforcing receiver
- the trusted orphan-cleanup owner before assigning any media rollout work
- shared `documents` cap compatibility with the existing insurance flow
- the proof chain and exact receiver payload for every enabled action
- the planned test IDs and cleanup owner
- the next append-only ledger ID

If any item is unknown, continue the audit or keep the action disabled. The UI is
not implementation-ready merely because the screen can be drawn.
