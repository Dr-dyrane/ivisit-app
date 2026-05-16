# Contact Dispatch Communication Room Dossier V1

Status: Implemented, final runtime verification pending
Documented: 2026-05-15
Scope: active emergency tracking flow, map root modal, emergency-request-owned communication room

## CEO Approval

iVisit will add a Contact Dispatch communication room to active emergency flows.

The product goal is simple:

- when an emergency request is active, the user can contact the provider/dispatcher without leaving the map
- if a communication room already exists for the active emergency request, open it
- if no room exists, create or attach the room through the canonical backend path
- the room is operational, calm, and scoped to the emergency, not a social chat product

Primary use case:

The ambulance is en route, but the patient starts moving toward the ambulance in another vehicle. The patient needs a fast way to say:

- "We are moving toward the ambulance."
- "Can we meet halfway?"
- "Pickup location has changed."
- "Please call me."
- "We have arrived."

## Source Audit

### Local iVisit References

- `docs/REFACTORING_GUARDRAILS.md`
  - five-layer rule: Supabase/Realtime -> TanStack Query -> Zustand -> XState -> Jotai
  - pass rule: every pass must cover state management, UI quality, DRY/modularity, and documentation
  - useEffect rule: effects only for real side effects such as subscriptions, timers, cleanup, or navigation
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
  - MapScreen must stay thin
  - live operational facts belong to durable emergency state, not sheet payload
  - map screen owns lifted modals that must survive sheet phase transitions
- `docs/architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md`
  - best current precedent for formal five-layer feature documentation
  - realtime invalidates query/store paths; it does not mutate UI directly
  - consumer hooks are facades, not bootstrap owners
- `docs/architecture/state/GOLD_STANDARD_STATE_ROADMAP.md`
  - active trip state is persisted through Zustand
  - XState owns lifecycle legality
  - Jotai owns ephemeral UI state
- `components/map/surfaces/MapModalShell.jsx`
  - current best modal shell for map-root overlays
  - already handles map modal motion, header hiding, detents, web drawer behavior, safe area, and platform motion
- `components/map/views/tracking/MapTrackingStageBase.jsx`
  - tracking sheet hero card and CTA row live here
  - tracking stage already sources raw trip data through `activeMapRequest.raw`
- `components/map/views/tracking/mapTracking.model.js`
  - tracking CTA actions are assembled as data, then rendered in parts
  - this is where Contact Dispatch action belongs
- `services/emergencyRequestsService.js`
  - current Supabase adapter for emergency requests
  - includes aggressively filtered realtime subscriptions by request id/display id
- `services/emergencyContactsApiService.js`
  - best local pattern for row mapping, input normalization, CRUD service, and scoped realtime subscribe API
- `supabase/docs/CONTRIBUTING.md`
  - no fix migrations; edit the correct pillar migration
  - filter realtime subscriptions aggressively
  - validate IDs and use shared helper patterns
  - sync to console after migration/docs changes

### Supabase References Checked

- Supabase Realtime Postgres Changes docs: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JavaScript insert/update/upsert/select docs: https://supabase.com/docs/reference/javascript/insert

Implementation implication:

- use Postgres Changes for v1 message and room updates because the app already uses this pattern
- use RLS policies around participants, rooms, and messages
- use security definer RPCs for room creation/participant attachment so client code cannot attach arbitrary participants
- use filtered channels such as `room_id=eq.<room_id>` and never subscribe to whole chat tables

## Product Definition

Feature name:

- Contact Dispatch

Domain meaning:

- a communication room attached to a single emergency request
- all messages are operational coordination
- the room lifecycle follows the emergency lifecycle
- users remain in `/map`; no navigation away from tracking

Out of scope for v1:

- social chat profiles
- group discovery
- arbitrary room creation
- file uploads
- read receipts per message beyond room-level last-read
- message editing/deletion UI
- offline message queue beyond one idempotent retry path
- provider console UI implementation, except DB/API compatibility

## User Experience Contract

### Entry

Tracking sheet hero card:

- add a chat/message icon affordance on the hero card or hero right meta action slot
- label: `Contact`
- accessibility label: `Contact dispatch`
- immediate pressed feedback is required
- tapping opens the communication room modal at MapScreen root

Tracking CTA row:

- include `Contact Dispatch`
- target CTA set:
  - `Continue Check-In`
  - `Reserve My Bed Space`
  - `Contact Dispatch`

Copy guidance:

- use `Contact Dispatch` for the action label
- use `Dispatch` as the compact hero icon label if space is tight
- do not use `Chat`, `Messenger`, or `DM`
- do not explain the feature inside the sheet unless there is an empty room

### Room Surface

Use a full-screen map-root modal based on `MapModalShell`.

Preferred behavior:

- stay inside MapScreen
- preserve active tracking behind the modal
- hide global header while visible
- iOS/Android: full-height modal with safe-area header and sticky composer
- web/sidebar: left drawer or centered map modal using existing `MapModalShell` viewport rules
- Android keyboard: use existing keyboard-aware modal hooks if composer is blocked

Visual direction:

- iMessage-like conversation rhythm
- iVisit surfaces: borderless, quiet, smooth, low copy
- messages use soft grouped bubbles, not heavy cards
- operational system/status rows are centered and muted
- quick actions are compact chips above the composer
- no decorative borders
- no large hero section

Header:

- title: `Contact Dispatch`
- subtitle: provider/driver/dispatcher state such as `Hemet Valley Medical Center` or `Driver assigned`
- left: back/close
- right: optional call icon only when a verified responder/hospital phone exists

Empty state:

- title: `Send an update`
- body: `Use this for pickup changes, arrival updates, or dispatch instructions.`
- quick actions visible immediately
- composer focused only when user taps the field, not on modal open

Loading state:

- skeleton bubbles matching final message rows
- never blank
- if ensure-room is running, show `Opening dispatch...` as a compact header/status state

Error state:

- if room creation fails: `Dispatch is not available right now. Try again.`
- do not expose Supabase/RLS language to users
- keep retry button visible

## Five-Layer State Architecture

### Layer 1: Supabase / Realtime

Owns:

- canonical rooms
- canonical participants
- canonical messages
- room archive lifecycle
- participant authorization
- realtime row events

Tables:

1. `emergency_chat_rooms`
2. `emergency_chat_participants`
3. `emergency_chat_messages`

`emergency_requests` should also get `communication_room_id UUID NULL` for fast lookup and explicit ownership.

Rules:

- one active room per emergency request
- messages are append-only in v1
- client cannot directly create arbitrary participants
- room creation and participant attachment happen through a security definer RPC
- realtime never mutates UI state directly; it invalidates or updates the query cache path

### Layer 2: TanStack Query

Owns:

- room ensure/fetch lifecycle
- message fetch lifecycle
- participant fetch lifecycle
- send-message mutation
- mark-read mutation
- realtime invalidation/cache append contract

Query keys:

```js
export const emergencyChatQueryKeys = {
  all: ["emergencyChat"],
  roomByRequest: (requestId) => ["emergencyChat", "room", requestId],
  messages: (roomId) => ["emergencyChat", "messages", roomId],
  participants: (roomId) => ["emergencyChat", "participants", roomId],
};
```

Consumer facade:

- `useEmergencyChatRoom({ requestId, enabled })`
- `useEmergencyChatMessages({ roomId, enabled })`
- `useEmergencyChatMutations({ roomId })`
- `useEmergencyChatRealtime({ roomId, enabled })`

Rules:

- disabled until a valid active request id exists
- `ensureRoomForRequest` should be mutation-driven from opening the modal, not eagerly called on every tracking render
- messages query should paginate newest-first at the service layer, then reverse for display if needed
- use optimistic message with `clientMessageId`, then reconcile with server row

### Layer 3: Zustand

Owns only durable client-side chat UX state that must survive modal remounts.

Allowed:

- local unsent composer drafts keyed by `roomId`
- last opened emergency chat request id
- local optimistic outbox metadata if a send mutation is retrying after transient failure

Forbidden:

- canonical messages
- canonical participants
- canonical room membership
- unread truth if server tracks last-read

Recommended store:

- `stores/emergencyChatStore.js`

Minimal state:

```js
{
  draftsByRoomId: {},
  lastOpenedRequestId: null,
  setDraft(roomId, text),
  clearDraft(roomId),
  setLastOpenedRequestId(requestId)
}
```

Do not create this store if v1 can keep drafts in Jotai without persistence. If created, it must stay draft/outbox only.

### Layer 4: XState

Owns lifecycle legality, not server data.

Machine:

- `machines/emergencyChatRoomMachine.js`
- hook: `hooks/emergencyChat/useEmergencyChatRoomLifecycle.js`

States:

- `idle`
- `ensuringRoom`
- `loadingMessages`
- `ready`
- `sending`
- `reconnecting`
- `archived`
- `error`

Events:

- `OPEN`
- `ROOM_READY`
- `MESSAGES_READY`
- `SEND`
- `SEND_SUCCESS`
- `SEND_FAILURE`
- `REALTIME_DISCONNECTED`
- `REALTIME_RECOVERED`
- `ARCHIVED`
- `CLOSE`

Rules:

- `SEND` is illegal without a ready room
- archived rooms can be read but not sent to
- reconnecting should not clear visible messages
- closing the modal does not destroy room/query data

### Layer 5: Jotai

Owns ephemeral UI state.

Atoms:

- `emergencyChatModalVisibleAtom`
- `activeEmergencyChatRequestIdAtom`
- `emergencyChatQuickActionsVisibleAtom`
- `emergencyChatComposerFocusedAtom`
- `emergencyChatScrollIntentAtom`
- `emergencyChatReplyingToMessageIdAtom` reserved for later

Rules:

- atoms do not duplicate message rows
- atoms do not own room membership
- atoms may coordinate modal visibility across MapScreen and tracking stage

## Database Design

### Tables

Add these to the correct Supabase pillar:

- `supabase/migrations/20260219000300_logistics.sql` for logistics-owned tables and `emergency_requests.communication_room_id`
- `supabase/migrations/20260219000700_security.sql` for RLS policies
- `supabase/migrations/20260219000800_emergency_logic.sql` or `20260219010000_core_rpcs.sql` for security definer RPCs, following current repo convention

Do not create a new one-off fix migration.

#### emergency_chat_rooms

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `emergency_request_id UUID NOT NULL UNIQUE REFERENCES public.emergency_requests(id) ON DELETE CASCADE`
- `visit_id UUID NULL REFERENCES public.visits(id) ON DELETE SET NULL`
- `created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL`
- `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'))`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `last_message_at TIMESTAMPTZ`
- `archived_at TIMESTAMPTZ`

Indexes:

- unique `emergency_request_id`
- `(status, updated_at DESC)`
- `(last_message_at DESC)`

#### emergency_chat_participants

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `room_id UUID NOT NULL REFERENCES public.emergency_chat_rooms(id) ON DELETE CASCADE`
- `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- `role TEXT NOT NULL CHECK (role IN ('patient', 'driver', 'crew', 'provider', 'hospital_admin', 'dispatcher', 'support'))`
- `display_name_snapshot TEXT`
- `joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `left_at TIMESTAMPTZ`
- `last_read_message_id UUID`
- `last_read_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Constraints:

- unique active membership: `(room_id, user_id)` is enough for v1

Indexes:

- `(room_id, user_id)`
- `(user_id, updated_at DESC)`
- `(room_id, role)`

#### emergency_chat_messages

Columns:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `room_id UUID NOT NULL REFERENCES public.emergency_chat_rooms(id) ON DELETE CASCADE`
- `sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL`
- `sender_role TEXT NOT NULL CHECK (sender_role IN ('patient', 'driver', 'crew', 'provider', 'hospital_admin', 'dispatcher', 'support', 'system'))`
- `kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'quick_action', 'status_event', 'system'))`
- `body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000)`
- `client_message_id TEXT`
- `metadata JSONB NOT NULL DEFAULT '{}'::JSONB`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `edited_at TIMESTAMPTZ`
- `deleted_at TIMESTAMPTZ`

Constraints:

- unique `(room_id, sender_id, client_message_id)` where `client_message_id IS NOT NULL`

Indexes:

- `(room_id, created_at DESC)`
- `(sender_id, created_at DESC)`
- `(room_id, kind, created_at DESC)`

### emergency_requests Addition

Add:

- `communication_room_id UUID NULL`

After `emergency_chat_rooms` exists:

- add FK to `emergency_chat_rooms(id)`
- keep `emergency_chat_rooms.emergency_request_id` as the real unique owner

Purpose:

- `communication_room_id` is fast UI attachment metadata
- the unique room ownership remains enforced by `emergency_chat_rooms.emergency_request_id`

## RLS and Authorization

Helper:

```sql
public.p_is_emergency_chat_participant(p_room_id uuid)
```

Returns true if:

- `auth.uid()` is a participant in the room and `left_at IS NULL`
- or `auth.uid()` owns the underlying emergency request
- or `auth.uid()` is the request responder
- or user belongs to the request hospital organization as `org_admin`, `dispatcher`, or supported provider role
- or `public.p_is_admin()`

Policies:

- rooms: participants can select rooms in scope
- participants: participants can select participants in their room
- messages: participants can select messages in their room
- messages insert: participants can insert messages for themselves into active rooms
- participant insert/update: only via RPC/admin/server path

Security decision:

- prefer RPC writes for room creation and participant attachment
- allow direct message insert only after membership exists, or route all sends through `send_emergency_chat_message`

Recommended v1:

- room creation: RPC only
- message sending: RPC only
- reads: direct select through RLS
- realtime: Postgres Changes filtered by `room_id`

## RPC Contract

### ensure_emergency_chat_room

Purpose:

- create or attach a room for an emergency request
- seed known participants
- return room and participant summary

Inputs:

- `p_request_id UUID`

Server behavior:

1. Validate caller can access the emergency request.
2. Lock by request id or use unique constraint to avoid duplicate rooms.
3. Create room if missing.
4. Attach patient participant from `emergency_requests.user_id`.
5. Attach responder participant from `emergency_requests.responder_id` if present.
6. Attach hospital dispatcher/admin/provider participants only when a safe lookup exists.
7. Write `emergency_requests.communication_room_id` if null.
8. Return room payload.

Idempotency:

- repeated calls for the same request return the same room
- duplicate participant inserts use `ON CONFLICT DO UPDATE` for active membership fields

### send_emergency_chat_message

Inputs:

- `p_room_id UUID`
- `p_body TEXT`
- `p_kind TEXT DEFAULT 'text'`
- `p_client_message_id TEXT DEFAULT NULL`
- `p_metadata JSONB DEFAULT '{}'::JSONB`

Behavior:

- validate caller participant membership
- validate active room
- normalize/trim body
- insert message
- update `emergency_chat_rooms.last_message_at`
- return canonical message row

Idempotency:

- if `client_message_id` already exists for the same room/sender, return the existing row

### mark_emergency_chat_room_read

Inputs:

- `p_room_id UUID`
- `p_message_id UUID`

Behavior:

- validate membership
- update participant `last_read_message_id` and `last_read_at`

### archive_emergency_chat_room

Trigger path:

- when `emergency_requests.status` becomes `completed` or `cancelled`, archive room

Behavior:

- set room `status = 'archived'`
- set `archived_at`
- keep messages readable
- block new messages

## Frontend File Plan

### Services

Create:

- `services/emergencyChatService.js`

Owns:

- row mapping
- input normalization
- RPC calls
- message pagination
- realtime subscribe helpers

Exports:

- `mapEmergencyChatRoomRow`
- `mapEmergencyChatParticipantRow`
- `mapEmergencyChatMessageRow`
- `normalizeEmergencyChatMessageInput`
- `ensureRoomForRequest(requestId)`
- `listMessages(roomId, { limit, before })`
- `sendMessage(roomId, input)`
- `markRoomRead(roomId, messageId)`
- `subscribeToMessages(roomId, onEvent, onStatus)`

Pattern reference:

- `services/emergencyContactsApiService.js`
- `services/emergencyRequestsService.js`

### Query

Create:

- `hooks/emergencyChat/emergencyChat.queryKeys.js`
- `hooks/emergencyChat/useEmergencyChatRoom.js`
- `hooks/emergencyChat/useEmergencyChatMessages.js`
- `hooks/emergencyChat/useEmergencyChatMutations.js`
- `hooks/emergencyChat/useEmergencyChatRealtime.js`

Rules:

- service owns mapping
- query hooks own fetch/mutation lifecycle
- realtime hook invalidates or appends to query cache
- no screen-level Supabase calls

### State

Create if needed:

- `stores/emergencyChatStore.js`
- `machines/emergencyChatRoomMachine.js`
- `hooks/emergencyChat/useEmergencyChatRoomLifecycle.js`
- `atoms/emergencyChatAtoms.js`

State ownership:

- messages: Query only
- room: Query only
- participants: Query only
- drafts/outbox: Zustand if persistence is required, otherwise Jotai
- modal visibility/active request id: Jotai
- send legality and archive/readiness: XState

### UI

Create:

- `components/map/communication/EmergencyContactDispatchModal.jsx`
- `components/map/communication/EmergencyContactDispatchMessageList.jsx`
- `components/map/communication/EmergencyContactDispatchComposer.jsx`
- `components/map/communication/EmergencyContactDispatchQuickActions.jsx`
- `components/map/communication/emergencyContactDispatch.styles.js`
- `components/map/communication/emergencyContactDispatch.theme.js`
- `components/map/communication/emergencyContactDispatch.content.js`
- `components/map/communication/emergencyContactDispatch.helpers.js`

Why `components/map/communication`:

- the modal is map-root owned
- it is triggered from tracking
- it must preserve map context and not become a generic stack screen

Do not place message UI inside `MapTrackingStageBase.jsx`.

### Map Integration

Files to touch:

- `atoms/emergencyChatAtoms.js`
- `components/map/MapModalOrchestrator.jsx`
- `components/map/views/tracking/MapTrackingStageBase.jsx`
- `components/map/views/tracking/mapTracking.model.js`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`
- `screens/MapScreen.jsx` only as a thin wiring point if needed
- `hooks/map/exploreFlow/useMapExploreFlow.js` only if modal visibility must join existing `hasActiveMapModal`

Rules:

- tracking controller emits `onOpenContactDispatch`
- MapScreen/MapModalOrchestrator renders modal
- modal reads active request id from atom/prop and uses hooks
- MapScreen does not run chat RPCs

## UI Anatomy

### Modal Layout

```
MapModalShell
  Header
    close
    title: Contact Dispatch
    subtitle: driver/provider status
    optional call action
  Body
    Status strip (connection / archived / dispatch joined)
    Message list
      system event rows
      participant grouped bubbles
      pending optimistic bubble
      failed retry bubble
  Footer
    Quick actions row
    Composer row
      text input
      send icon button
```

### Message Bubble Rules

Patient messages:

- align right
- brand red accent only as a subtle fill/tint
- white text only if contrast is strong

Provider/dispatch messages:

- align left
- neutral elevated surface
- small role/name label above first message in a group

System/status events:

- center
- muted text
- no bubble unless needed

Pending:

- lower opacity
- spinner or clock icon

Failed:

- inline retry icon
- message remains visible

### Quick Actions

Initial v1 quick actions:

- `Moving toward ambulance`
- `Meet halfway?`
- `Pickup changed`
- `Please call me`
- `We arrived`

Send behavior:

- quick action fills/sends a `quick_action` message
- metadata includes `quickActionKey`
- body remains human-readable

## Pass Plan

### Pass CD-0: Final Architecture Review

Owner: CTO/System Architect

Goal:

- verify no existing chat/support table already satisfies emergency-flow room ownership
- confirm with product whether provider console participant display is v1 or v1.1

Tasks:

- inspect `support_tickets`, `notifications`, `emergency_requests`, `visits`, `profiles`, `ambulances`, `hospitals`
- confirm participant role mapping from existing `profiles.role`
- confirm whether `responder_id` is reliably populated for ambulance trips
- write any delta under this dossier before implementation

Acceptance:

- no duplicate generic chat system introduced
- final room ownership remains `emergency_requests`

### Pass CD-1: Supabase Schema

Owner: Backend

Goal:

- add room, participant, and message tables under logistics

Files:

- `supabase/migrations/20260219000300_logistics.sql`
- `supabase/docs/SCHEMA_SNAPSHOT.md`
- `supabase/docs/MODULE_SCHEMA_BIBLE.md`

Tasks:

- add tables and indexes
- add `communication_room_id` to `emergency_requests`
- add updated_at triggers using existing `handle_updated_at`
- update docs/snapshot

Acceptance:

- one room per emergency request
- indexed room/message reads
- no new fix migration file

### Pass CD-2: RLS and RPC

Owner: Backend/Security

Goal:

- secure room access and expose idempotent RPCs

Files:

- `supabase/migrations/20260219000700_security.sql`
- `supabase/migrations/20260219000800_emergency_logic.sql` or `20260219010000_core_rpcs.sql`

Tasks:

- add participant helper function
- add RLS policies
- add `ensure_emergency_chat_room`
- add `send_emergency_chat_message`
- add `mark_emergency_chat_room_read`
- add archive trigger or room archive function

Acceptance:

- patient can only access rooms for their own emergency
- responder/provider can only access rooms they are attached to
- unauthorized user cannot select or send messages
- repeated ensure call returns the same room
- repeated send with same `client_message_id` returns one message

### Pass CD-3: Service Adapter

Owner: App Data

Goal:

- add a canonical frontend adapter with row mapping and normalization

Files:

- `services/emergencyChatService.js`

Tasks:

- implement row mappers
- implement RPC calls
- implement paginated message list
- implement filtered realtime subscribe
- normalize body and quick action metadata

Acceptance:

- no Supabase calls in components
- no `SELECT *` without an intentional field list
- all room and message rows are mapped to app casing
- service returns neutral arrays/nulls for disabled inputs

### Pass CD-4: Query and Realtime Hooks

Owner: App State

Goal:

- make room/messages query-driven and realtime-aware

Files:

- `hooks/emergencyChat/emergencyChat.queryKeys.js`
- `hooks/emergencyChat/useEmergencyChatRoom.js`
- `hooks/emergencyChat/useEmergencyChatMessages.js`
- `hooks/emergencyChat/useEmergencyChatMutations.js`
- `hooks/emergencyChat/useEmergencyChatRealtime.js`

Tasks:

- create query key contract
- create ensure-room query/mutation flow
- create messages query
- create send mutation with optimistic bubble and idempotency key
- subscribe to `emergency_chat_messages` filtered by `room_id`
- invalidate or patch messages query on realtime insert
- unsubscribe on close/unmount

Acceptance:

- opening modal shows existing messages without refresh
- new messages arrive without page reload
- no whole-table subscriptions
- no screen-level `useEffect` for chat orchestration

### Pass CD-5: State Layers

Owner: App State

Goal:

- wire UI/modal/draft/lifecycle state without duplicating server truth

Files:

- `atoms/emergencyChatAtoms.js`
- optional `stores/emergencyChatStore.js`
- `machines/emergencyChatRoomMachine.js`
- `hooks/emergencyChat/useEmergencyChatRoomLifecycle.js`

Tasks:

- add modal visible/request id atoms
- add quick-action tray atom
- add composer focus atom
- add lifecycle machine
- decide if draft persistence needs Zustand

Acceptance:

- messages are not copied to Jotai or Zustand
- modal can close/reopen without losing loaded query cache
- invalid send is impossible when room is not ready
- archived room disables composer

### Pass CD-6: Contact Dispatch Modal UI

Owner: UI/UX

Goal:

- build calm, full-screen operational communication room

Files:

- `components/map/communication/*`

Tasks:

- create `EmergencyContactDispatchModal`
- create message list
- create composer
- create quick actions
- create content/theme/styles/helpers split
- use `MapModalShell`
- add skeleton, empty, error, archived states
- add keyboard-aware footer behavior

Acceptance:

- no borders as decoration
- no card-in-card nesting
- no blank loading
- sticky composer remains visible with keyboard
- long names/messages do not clip vertically
- screen reader labels expose sender, role, timestamp, and message

### Pass CD-7: Tracking Entry Integration

Owner: Map Flow

Goal:

- expose Contact Dispatch from tracking without bloating tracking stage

Files:

- `components/map/views/tracking/mapTracking.model.js`
- `components/map/views/tracking/useMapTrackingController.js`
- `components/map/views/tracking/MapTrackingStageBase.jsx`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`
- `components/map/MapModalOrchestrator.jsx`
- `hooks/map/exploreFlow/useMapExploreFlow.js` if needed for modal active state

Tasks:

- add `Contact Dispatch` mid action
- add optional hero chat icon/action
- pass `onOpenContactDispatch` from map orchestration
- set active request id atom
- open modal
- register modal in `hasActiveMapModal`

Acceptance:

- tracking sheet CTA row includes Contact Dispatch
- hero action opens modal immediately
- map stays mounted
- tracking route/ambulance animation continues behind modal

### Pass CD-8: Backend Verification

Owner: QA/Backend

Tasks:

- create test patient emergency request
- ensure room
- send patient message
- attach responder participant
- send responder message
- verify RLS denies unrelated user
- verify archive blocks send
- verify realtime insert arrives for both participants

Acceptance:

- room scoped to emergency request
- all authorized participants see same room
- unauthorized participants see nothing

### Pass CD-9: Runtime Verification

Owner: QA/App

Scenarios:

- ambulance active, no room exists: tap Contact Dispatch, room creates and opens
- ambulance active, room exists: tap Contact Dispatch, existing messages open
- bed active: Contact Dispatch opens hospital/provider room if participants exist
- pending approval: either disabled with `Available after dispatch` or enabled to support dispatcher contact; product must decide in CD-0
- weak network: modal opens with skeleton/error, retry works
- Android keyboard: composer not blocked
- web: drawer/modal renders without blank content
- app reload: active room can reopen from tracking

Acceptance:

- no restart needed for messages or room state
- no blank modal body
- no duplicate rooms
- no duplicate optimistic messages after retry

## Implementation Order for Junior Dev

1. Read this dossier end to end.
2. Read `docs/REFACTORING_GUARDRAILS.md`.
3. Read `docs/architecture/emergency/EMERGENCY_CONTACTS_FIVE_LAYER_MIGRATION_V1.md`.
4. Read `services/emergencyContactsApiService.js`.
5. Read `components/map/surfaces/MapModalShell.jsx`.
6. Start with CD-0 and write any open questions into this file.
7. Implement only one pass at a time.
8. After each pass, run syntax checks and update this dossier with what changed.
9. Do not touch tracking UI until backend service/query hooks exist.
10. Do not add component-level Supabase calls.

## Regression Guardrails

Do not:

- create a generic social chat system
- store canonical messages in Zustand or Jotai
- add Supabase calls inside `MapTrackingStageBase`
- use a new navigation route for the room
- subscribe to all messages
- create a fix migration
- add visible borders as the primary visual structure
- hide the composer under the keyboard
- create a room on every tracking render
- attach participants on the client
- depend on Metro reload, sheet toggle, or route remount to hydrate messages

Must:

- keep MapScreen thin
- use a filtered realtime channel
- keep messages server/query owned
- keep modal state Jotai-owned
- keep room creation idempotent
- preserve map/tracking context
- render skeletons for loading
- use `clientMessageId` for optimistic sends
- document every pass result before moving to the next pass

## Acceptance Criteria

Product:

- active tracking exposes Contact Dispatch
- tapping Contact Dispatch opens a calm communication room
- user never leaves the map
- quick operational messages are available
- archived completed requests remain readable

Architecture:

- Supabase owns canonical room/participant/message truth
- TanStack Query owns fetch/mutation lifecycle
- Zustand owns only durable client draft/outbox state if needed
- XState owns room/send/archive legality
- Jotai owns modal and ephemeral UI state
- MapScreen remains thin
- tracking stage emits intent but does not own chat data

Backend:

- one room per emergency request
- participant-scoped RLS
- idempotent room ensure
- idempotent send
- filtered realtime

UI:

- iVisit borderless modal
- sticky composer
- accessible messages
- no blank loading
- no clipped Dynamic Type
- platform-inclusive keyboard behavior

## Rollback Plan

If backend is not ready:

- hide Contact Dispatch action behind a feature flag or `roomBackendAvailable` gate
- keep database changes unapplied
- no UI code should assume room exists

If UI causes regressions:

- remove modal registration from `MapModalOrchestrator`
- remove Contact Dispatch action from `mapTracking.model.js`
- keep backend tables/RPCs if already applied; they are inert without UI entry

If realtime is unstable:

- keep query fetch and send mutation
- disable realtime hook
- add manual refresh in modal header until realtime is repaired

## Open Product Decisions

1. Should Contact Dispatch be available during `pending_approval`, or only after dispatch starts?
2. Should quick actions send immediately or fill the composer for review first?
3. Should patient be allowed to call the responder directly from the room header?
4. Should provider console be included in v1, or should v1 support patient-side room only with backend compatibility?
5. Should archived rooms appear in visit detail history later?

Recommended answers for v1:

- enable once request is active/accepted; show disabled or hidden during pending approval
- quick actions send immediately after press, with undo omitted for simplicity
- call icon only when a verified responder phone exists
- app-side v1 first, console participant UI v1.1
- archived room history later, not v1
