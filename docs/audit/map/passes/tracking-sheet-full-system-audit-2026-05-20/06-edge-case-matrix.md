# Edge Case Matrix And Audit Method

> Extracted from `../TRACKING_SHEET_FULL_SYSTEM_AUDIT_2026-05-20.md` during the lossless modularization pass.
> The verbatim pre-split artifact is preserved in `00-full-audit-preserved.md`.

## Edge Case Audit Checklist By Flow

### Cash Ambulance Flow

| Step                       | Backend/API check                                               | Store/lifecycle check                               | UI check                                                       |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| create cash request        | RPC returns UUID/display id/payment pending                     | pending approval contains UUID and display id       | payment sheet acknowledges pending/approval state immediately  |
| approval before assignment | status accepted/in_progress may lack responder                  | active trip exists but responder false              | assigning/preparing copy, no fake driver name                  |
| approval with ETA route    | ETA/route exists before responder                               | route atom scoped to request key                    | ETA may show, but dispatch copy should not overclaim responder |
| responder hydrated         | ambulance identity appears from approval/query/realtime         | same request preserves ETA and route                | hero/header can move to dispatch/en route                      |
| ETA elapsed                | active status accepted/in_progress and arrival eligibility true | lifecycle active, not arrived                       | hero says confirm arrival and CTA confirms                     |
| user confirms arrival      | backend/store status arrived                                    | `canCompleteAmbulance` true, `canMarkArrived` false | hero says complete request and CTA completes                   |
| complete request           | backend completed/visit created                                 | active lifecycle false                              | rating visible, tracking chrome suppressed                     |

### Modal Interaction Flow

| Interaction                            | State risk                                                     | Evidence to capture                                                                    |
| -------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Contact Dispatch opens from tracking   | chat modal may close header or route subscriptions for a frame | before/after `trackingRequestKey`, `hasActiveTrip`, `trackingHeaderVisible`, ETA label |
| Contact Dispatch closes                | tracking may remount and recompute ETA/header                  | same request key, same route atom key, same snapshot stage                             |
| Rating modal opens                     | active trip cleanup may race with header visibility            | active key, lifecycle false, rating atom true, sheet/header hidden                     |
| Rating modal closes/submits            | visits/history truth may replace active tracking truth         | no live tracking reopen; visit detail/rating state is terminal                         |
| Rating modal close without submit/skip | close clears modal without finalizing trip cleanup             | active key, lifecycle state, visit lifecycle, whether header/sheet remain visible      |

### Action Surface / Companion Flow

| Interaction                        | State risk                                                  | Evidence to capture                                                        |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| active ambulance shows reserve bed | bed companion can be offered too late in the ambulance flow | stage, `canAddCompanionService`, `canCompleteAmbulance`, rendered actions  |
| active bed shows request transport | ambulance companion can appear after bed stay is complete   | bed lifecycle, stage, `canAddCompanionService`, rendered actions           |
| header action mirrors sheet action | header may expose only a subset of sheet actions            | header action key, sheet mid-actions, bottom action, action handler branch |
| completion action moves bottom     | hero may not match bottom action                            | primary action key, bottom action label, hero title/subtitle               |
| collapsed mid-action limit         | valid secondary action can be hidden until sheet expansion  | full mid-actions, visible collapsed actions, priority order                |
| companion after pre-terminal state | reserve/request action can feel late or operationally wrong | stage, completion eligibility, companion eligibility, rendered actions     |

### Contact Dispatch Flow

| Interaction                         | State risk                                                | Evidence to capture                                                              |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| open dispatch from ambulance trip   | chat room uses wrong id or display id                     | active ambulance UUID, chat request id atom, room request id                     |
| open dispatch from bed booking      | bed request id may override ambulance context incorrectly | active bed UUID, active ambulance UUID, selected chat request id                 |
| realtime subscribes then closes     | modal lifecycle or prop/atom mirror may remount briefly   | visible prop, visible atom, room id, lifecycle status, realtime status           |
| close dispatch                      | tracking sheet/header/ETA could remount or clear          | tracking request key, route atom key, snapshot stage, ETA before and after close |
| send message during tracking update | chat mutation invalidation could cause unrelated refresh  | query invalidations, active request query status, route/ETA preservation         |

### Cancel Flow

| Interaction             | State risk                                      | Evidence to capture                                                           |
| ----------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| cancel pending approval | request cancelled but pending UI remains        | backend status, pending approval atom, sheet phase, header visible            |
| cancel active ambulance | active trip clears but route/header survive     | backend status, active trip atom/query, lifecycle, route atom, header visible |
| cancel active bed       | bed clears but active map request still points  | backend bed status, active bed booking store, active map request kind         |
| cancel then reload      | persisted local state resurrects cancelled trip | post-reload active request query, persisted store, tracking key               |

### History Resume / Recovery Flow

| Interaction                         | State risk                                             | Evidence to capture                                                                |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| resume selected active history item | resume may only prove some trip is active              | selected history request id, active trip id, active history request keys           |
| resume inactive history item        | global active trip may open from the wrong history row | selected history request id, active trip id, toast/openTracking behavior           |
| recovered rating while active trip  | stale rating can compete with live tracking            | `activeMapRequest.hasActiveRequest`, in-flow rating visible, recovered rating atom |
| rate history visit                  | history rating may affect active tracking state        | selected visit id, active request id, tracking key, rating atom                    |

### Reload / Rehydrate Flow

| Reload point                       | Expected source of truth                       | UI must not do                                  |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| during pending approval            | query/store pending approval                   | show dispatch/en route actions                  |
| during active accepted/in_progress | query active row + preserved persisted runtime | lose ETA if route/ETA exists for same request   |
| during arrived pre-complete        | backend/store arrived                          | tell user to confirm arrival again              |
| during completed/rating            | visits/rating state                            | reopen active tracking because stale key exists |

### Header / Sheet Parity Flow

| Runtime condition               | Sheet should say                     | Header should say                        | Evidence to capture                                                             |
| ------------------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------- |
| pending approval                | awaiting approval / confirming       | awaiting approval / processing           | `trackingSnapshot.trackingStage`, `activeMapRequest.kind`, header `statusLabel` |
| active no responder no movement | assigning/finding driver             | assigning/preparing, not en route        | `hasResponder=false`, `hasEta=false`, `statusLabel`                             |
| active no responder with ETA    | assigning/preparing with ETA allowed | preparing/dispatch pending, not en route | `hasResponder=false`, `hasEta=true`, `routeSource`                              |
| responder no movement           | dispatch confirmed                   | dispatch confirmed                       | assigned responder fields and no route                                          |
| responder with movement         | en route                             | en route                                 | responder, route/ETA, progress                                                  |
| telemetry lost with route       | route remains but warning overlays   | same warning without dropping actions    | telemetry state plus `hasMovementSignal`                                        |
| arrived pre-confirm             | confirm arrival                      | arrived / confirm-oriented tone          | `canMarkArrived=true`, `canCompleteAmbulance=false`                             |
| arrived post-confirm            | complete request                     | complete-oriented arrived tone           | `canMarkArrived=false`, `canCompleteAmbulance=true`                             |
| modal owns focus                | modal surface stable                 | hidden until focus returns               | modal atom, `hasActiveMapModal`, request key, ETA before and after close        |
| completed/rating                | rating/complete, no live chrome      | hidden unless deliberately terminal      | `hasActiveTrip=false`, rating visible                                           |

## Edge Case Coverage Tracker

| Case                                          | Backend lane                                       | API lane                                                            | UI lane                                           | Status                    |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| Cash pending approval                         | request/payment pending rows                       | pending approval store + query                                      | `pending_approval`, no dispatch actions           | partial                   |
| Cash auto-approved with responder             | approved request + ambulance assignment            | hydrated approval result starts trip                                | en route or dispatch confirmed                    | verified manually         |
| Cash auto-approved before responder hydrate   | accepted request, assignment delayed               | same request preserved through query/realtime                       | assigning/preparing copy, no fake driver          | open                      |
| Card payment processing                       | payment intent + settlement                        | settlement waits on UUID and invalidates active trip before dismiss | payment sheet committed/finalizing state          | code-mapped, needs UI run |
| Wallet/immediate payment                      | active request row                                 | direct completion payload then active-trip invalidation             | immediate tracking shell                          | code-mapped, needs UI run |
| Reload during pending                         | persisted/query request                            | hydration gate + alias match; query waits for store hydration       | pending approval restored                         | code-mapped, needs UI run |
| Reload during active trip                     | active request + route fields                      | persisted store first, query merge second, runtime fields preserved | ETA and route persist                             | code-mapped, needs UI run |
| Contact Dispatch open/close                   | unique chat room per request UUID                  | room creation uses canonical id and chat cache only                 | modal should not disturb tracking                 | code-mapped, needs UI run |
| Contact Dispatch realtime lifecycle           | room-scoped message subscription                   | visible + room + lifecycle gates, message-key cache only            | `CLOSED` expected on close/remount, not ETA loss  | code-mapped, needs UI run |
| Modal gate mismatch                           | chat/rating/history modal visible                  | explore and shell compute different active-modal sets               | header, FAB, recovery gates suppress consistently | code-mapped, needs UI run |
| ETA elapsed before confirm                    | accepted/in_progress request                       | computed arrival eligibility                                        | hero says confirm, CTA confirm                    | fixed by current slice    |
| User confirmed arrival                        | arrived request/lifecycle                          | action model exposes complete                                       | hero says complete, CTA complete                  | fixed by current slice    |
| Complete request/rating                       | visit/request completed                            | defer cleanup + rating atom                                         | single rating modal, no tracking reopen           | partially verified        |
| Rating close without skip/submit              | visit may still be rating-pending                  | shell close routes to skip; raw close only clears atom              | no stranded tracking chrome                       | code-mapped, raw risk     |
| Cancel pending approval                       | patient update -> cancelled + visit cancel         | pending approval cleared; error copy not local                      | pending sheet and header close                    | code-mapped, needs UI run |
| Cancel active request                         | patient update -> cancelled                        | store clears active trip only on success; error copy not local      | tracking chrome closes                            | code-mapped, needs UI run |
| Cancel active bed                             | patient update -> cancelled                        | store clears active bed only on success; error copy not local       | bed tracking chrome closes                        | code-mapped, needs UI run |
| Lost/stale telemetry with route               | telemetry health                                   | route fallback preserved                                            | warning overlay, actions still available          | code-mapped, needs UI run |
| Lost/stale telemetry without route            | telemetry health                                   | no movement signal                                                  | delayed/lost state, no fake ETA                   | code-mapped, needs UI run |
| Route key mismatch hides ETA                  | active trip preserved but route atom key differs   | strict route key equality, tolerant store/query identity            | valid ETA/route visible for active request        | code-mapped, needs UI run |
| Bed-only booking                              | bed status/lifecycle + bed resource sync           | active bed booking store and 15-minute hold fallback                | bed reserved/ready/complete                       | code-mapped, needs UI run |
| Bed capacity after cancel/complete            | resource sync restores backend beds                | hospital realtime updates provider availability only                | active tracking closes separately from capacity   | code-mapped, needs UI run |
| Demo bootstrap provider truth                 | verified available demo rows, stale rows full      | refreshed post-staff hospital rows                                  | active request hospital id wins over stale rows   | code-mapped, needs UI run |
| Active hospital object/id mismatch            | active request row vs sheet payload                | object resolution still prefers payload before id lookup            | provider label/address/coords match request id    | code-mapped, fix open     |
| Ambulance + bed companion                     | both active records                                | one-record exclusivity mapped; timing still broad                   | no hidden companion state                         | code-mapped, timing open  |
| Companion action after arrival                | arrived request or completion-ready bed            | policy ignores primary arrival/complete eligibility                 | no operationally stale companion CTA              | code-mapped, fix open     |
| Visit detail resume                           | visit lifecycle                                    | row selection guarded; detail primary CTA still action-label driven | resume only when selected visit matches active    | code-mapped, fix open     |
| Visit detail resume id mismatch               | selected history request vs active row             | collapsed action guarded; primary detail resume still global        | no wrong-trip resume                              | open targeted fix         |
| Rating-pending history appears active         | visit lifecycle `rating_pending`                   | grouped under `active_now`, primary action rate                     | rate state does not imply live tracking           | code-mapped, needs UI run |
| Recovered rating during active tracking       | terminal visit/rating claim                        | recovered rating suppressed while active                            | no stale modal over active tracking               | partially verified        |
| Persisted visual atom mismatch                | active request remains canonical                   | visual atoms persist separately from trip store                     | no old phase/progress on new request              | code-mapped, needs UI run |
| Header/sheet parity across all stages         | same backend row/status                            | header model still separate from tracking snapshot                  | header, hero, and CTA agree                       | code-mapped, fix open     |
| Arrival/cancel action failure feedback        | RPC/status transition failure                      | busy state clears without local toast for several lanes             | failed action explains and preserves state        | code-mapped, fix open     |
| Staff terminal update during patient tracking | console/staff RPC completes or cancels request     | realtime/query terminal event clears active store                   | live chrome closes; rating/recovery if relevant   | code-mapped, needs UI run |
| Ambiguous frontend status string              | caller passes non-canonical status to `setStatus`  | service normalizes unknown status to `in_progress`                  | action code uses explicit constants only          | code-mapped, guard target |
| Synthetic request label despite display id    | aggregate label falls back to UUID-derived label   | trip/bed display ids skipped by tracking label order                | real display id shown when available              | code-mapped, fix open     |
| Half-snap action hidden by priority           | mid action exists in model but not visible in half | visible mid actions capped to three by priority                     | critical next action visible or bottom-promoted   | code-mapped, needs UI run |

## Audit Method

For each tracker row:

1. capture the backend row shape and legal transition
2. capture the API/service payload shape after each boundary
3. capture the local store shape before and after hydration/realtime
4. capture the tracking snapshot stage
5. capture rendered header, hero, details, mid actions, bottom action, modal
6. mark contradictions as UI sync, state sync, API sync, or backend contract

Do not apply broad sync changes until the contradiction is assigned to one of
those four buckets.

## Regression To Watch

Do not fix this by delaying the tracking sheet until everything is perfect. That would make payment feel dead.

The desired behavior is:

```text
payment succeeds
  -> sheet opens immediately
  -> active request identity is canonical
  -> UI shows pending/assigning honestly if responder is not ready
  -> ETA appears as soon as trip ETA or scoped route ETA exists
  -> header and sheet agree
  -> lifecycle false removes tracking chrome even if rating/modal remains
```
