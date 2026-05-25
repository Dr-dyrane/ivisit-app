---
status: living
owner: architecture
last_updated: 2026-04-28
---

# iVisit Bug Classification System
_Last updated: 2026-04-28 — Session 2 update_

---

## Classification Taxonomy

Every bug is assigned a **Class** (structural type), a **Layer** (where it lives), a **Severity** (user impact), and a **Detection Method** (how it can be caught before it ships).

---

## Class Definitions

| Class | Code | Definition |
|---|---|---|
| **Merge Gap** | MG | A merge/projection function receives a realtime or server payload but silently drops a field — the UI shows stale data without any error |
| **Stale Spread** | SS | `{ ...prev, explicitField }` pattern where `explicitField` is incomplete — fields present in the source schema but absent from the explicit block are silently inherited from prev |
| **State Ownership Conflict** | SOC | Two systems (e.g. Zustand + Jotai atom, or TanStack Query + Jotai atom) hold the same logical field — one updates, the other doesn't, UI shows the stale one depending on render path |
| **Lifecycle Race** | LR | Two async operations write to the same state concurrently — last-write-wins is wrong, or terminal state is overwritten by a stale in-flight |
| **Mask Regression** | MR | A bug that was hidden by a compensating mechanism — the fix to the compensating mechanism surfaces the underlying bug |
| **Guard Missing** | GM | A side-effect (subscription, patch, fetch) fires in a context where it shouldn't — no `isActive`, `isMounted`, or phase guard |
| **Recovery Claim Leak** | RCL | A persistence record (AsyncStorage claim, atom, ref) is written on trip start but never deleted on resolution — survives to the next session and re-triggers UI incorrectly |
| **Double Submission** | DS | A mutation (rating, payment, patch) can be called more than once for the same record — no idempotency guard, in-flight lock, or server-side uniqueness constraint |
| **Subscription Leak** | SL | A realtime channel or location watcher is not cleaned up on unmount/dep change — fires for stale data |
| **Shape Mismatch** | SHM | REST response shape ≠ realtime payload shape — code that handles one assumes the other's field names |
| **Hydration Race** | HR | State is read before async hydration (Zustand persist, TanStack Query) completes — default value is used, correct value arrives later and causes a visible reset |
| **Terminal Wipe** | TW | A query/fetch returning `null` for a completed trip overwrites Zustand store data that the UI still needs (e.g. rating hero card, completion screen) |
| **Phase Contamination** | PC | State set during one sheet/nav phase bleeds into a different phase because the atom or ref is not reset on phase transition |
| **Partial Identity Loss** | PIL | A merge preserves some fields of a nested object (e.g. `assignedAmbulance`) but not all — a partial server push with missing fields clobbers previously known values |

---

## Layer Definitions

| Layer | Code | Files |
|---|---|---|
| **Realtime Projection** | RT | `utils/emergencyRealtimeProjection.js`, `useEmergencyRealtime.js` |
| **Server Sync** | SV | `useActiveTripQuery.js`, `emergencyRequestsService.js`, `ambulanceService.js` |
| **Store** | ST | `stores/emergencyTripStore.js`, Zustand slices |
| **Atom** | AT | `atoms/mapScreenAtoms.js`, Jotai atoms |
| **Hook Orchestration** | HO | `useMapTrackingSync.js`, `useTrackingRatingFlow.js`, `useMapHistoryFlow.js`, `useEmergencyHandlers.js` |
| **Controller** | CT | `useMapTrackingController.js`, `useMapCommitPaymentController.js` |
| **Screen** | SC | `MapScreen.jsx`, `PaymentScreen.jsx` |
| **Component** | CM | `ServiceRatingModal.jsx`, tracking views |
| **Persistence** | PS | `database.js`, `StorageKeys`, AsyncStorage |
| **Service** | SE | `paymentService.js`, `emergencyRequestsService.js` |

---

## Severity Definitions

| Severity | Code | Description |
|---|---|---|
| **Critical** | P0 | Data loss, wrong action committed (double charge, wrong trip rated), security |
| **High** | P1 | Feature broken, user must reload/restart to recover |
| **Medium** | P2 | Stale UI, requires manual action to correct but no data loss |
| **Low** | P3 | Visual glitch, cosmetic, or edge-case only |

---

## Detection Methods

| Method | Code | Description |
|---|---|---|
| **Schema Diff Audit** | SDA | Diff service mapper field list against all merge function explicit return blocks |
| **Dep Array Audit** | DAA | Check every `useEffect` dep array — is every value that could change listed? |
| **Phase Guard Audit** | PGA | Check every side-effect with a network or store write — is there a phase/isActive guard? |
| **Claim Lifecycle Audit** | CLA | For every `write*Claim` call, verify a corresponding `delete*Claim` on every success AND failure path |
| **In-flight Lock Audit** | ILA | For every submit/mutation, verify `isPending` guard prevents re-entry |
| **Terminal State Audit** | TSA | Trace every path where store/atom could be set to `null` — verify UI has terminal-state preservation |
| **Hydration Order Audit** | HOA | Identify all queryFn/effects that read store — verify they use `getState()` not closed-over React state |
| **Shape Parity Audit** | SPA | Compare realtime payload field names (`snake_case`) against trip object field names (`camelCase`) for every consumed table |

---

## Known Bug Registry

### FIXED

| ID | Class | Layer | Severity | Description | Fixed in |
|---|---|---|---|---|---|
| BUG-001 | MG + SS | RT | P1 | `mergeEmergencyRealtimeTrip` never forwarded `estimated_arrival` → `etaSeconds`/`estimatedArrival`. Masked by 3 compensating mechanisms (server sync, map route patch, post-payment refetch). Exposed by `isTrackingMapActive` guard fix. | `emergencyRealtimeProjection.js` 2026-04-28 |
| BUG-002 | MG + SS | RT | P2 | `mergeEmergencyRealtimeTrip` never forwarded `hospital_id`, `hospital_name`, `specialty`, `display_id` → `displayId`. Hospital reassignment by dispatcher would show stale hospital name on tracking hero. | `emergencyRealtimeProjection.js` 2026-04-28 |
| BUG-003 | GM | HO | P2 | `useMapTrackingSync` reconciliation effect had no `isTrackingMapActive` guard — fired phantom `patchActiveAmbulanceTrip` calls while user was on explore sheet. | `useMapTrackingSync.js` (your changes) |
| BUG-004 | MR | HO | P1 | `isTrackingMapActive` guard (BUG-003 fix) removed the compensating mask for BUG-001, exposing ETA freeze. Root cause was BUG-001. | Resolved by BUG-001 fix |
| BUG-005 | HR | ST | P2 | `useActiveTripQuery` queryFn captured pre-hydration Zustand state via React selector — `previousTrip = null` → `startedAt = Date.now()` → trip progress reset to 0 on Metro reload. Fixed by reading `useEmergencyTripStore.getState()` imperatively inside queryFn. | `useActiveTripQuery.js` (prior session) |
| BUG-006 | PIL | SV | P2 | `buildAmbulanceTripSnapshot` partial server push with `responderName` absent would write `name: undefined`, erasing previously known driver name on next polling cycle. Fixed by `||` chaining: server → store → fullAmbulance → null. | `useActiveTripQuery.js` (prior session) |
| BUG-007 | TW | SV | P2 | `useActiveTripQuery` filtering by `isActiveStatus` returns `null` for completed trips — store wipe before rating UI could display hero card. Fixed by terminal-state preservation guard in sync effect. | `useActiveTripQuery.js` (prior session) |
| BUG-008 | LR | HO | P1 | `useEmergencyHandlers` wrote both `COMPLETED` and `RATING_PENDING` in parallel — race caused incorrect lifecycle state. Fixed to sequential write. | `useEmergencyHandlers.js` (prior session) |
| BUG-009 | DS | HO + AT | P1 | `deleteRecoveryClaim` ran after `updateVisit`. If the server write failed, the claim survived to the next session — re-surfacing the rating modal. On server failure with no rollback the claim was permanently lost, preventing retry. | `mapTracking.rating.js` 2026-04-28 — optimistic claim delete + claim rollback on failure |
| BUG-010 | RCL | PS + AT | P1 | Generic `updateVisit` had no idempotency guard — duplicate submission after network failure could overwrite rating data. | `visitsService.updateRating` 2026-04-28 — `rated_at IS NULL` condition makes duplicate writes a safe no-op |
| BUG-016 | HR | HO + SC | P1 | Payment → Map state gap: `router.push('/(auth)/map')` fired immediately after payment success with no cache invalidation. `useMapExploreFlow` derived `trackingRequestKey` from `activeAmbulanceTrip` which was still null. Map mounted with stale state → tracking never triggered → user required Metro restart. Fixed by awaiting `invalidateActiveTrip()` (TanStack Query cache invalidation) before navigation — deterministic refetch in-flight before map screen mounts. | `usePaymentScreenModel.js` (prior session) — `useInvalidateActiveTrip` hook |

---

### OPEN / POTENTIAL

| ID | Class | Layer | Severity | Description | Detection Method |
|---|---|---|---|---|---|
| BUG-011 | SOC | AT + HO | ~~P2~~ **CLOSED** | **Reclassified: by design.** Recovery path (`recoveredRatingStateAtom`) sets `completeKind: null` intentionally — the Zustand trip state (`activeAmbulanceTrip`/`activeBedBooking`) was already cleared at completion before the crash. `finalizeCompletedTracking` is a no-op on `null` completeKind. The two atoms are correctly independent: `trackingRatingStateAtom` is persisted (in-flow, survives cold start), `recoveredRatingStateAtom` is a plain `atom(null)` (session-only, re-derived from AsyncStorage claims on each mount). No actual conflict path exists. | N/A — closed after code audit 2026-04-28 |
| BUG-012 | PC | AT | ~~P3~~ **FIXED** | `trackingRatingStateAtom` persisted `visible:true` — cold start re-showed rating modal even when visit already rated. Two-layer fix: (1) **upstream** — `hydrateTrackingViz` in `mapScreenAtoms.js` strips `visible:true` before writing to atom (modal never flashes); (2) **runtime guard** — `useTrackingRatingFlow` computes `validatedRatingState` via `useMemo` (not `useEffect` — no layer violation): if visit not found or `lifecycleState === RATED`, returns `INITIAL_TRACKING_RATING_STATE`. | `mapScreenAtoms.js` + `useTrackingRatingFlow.js` 2026-04-28 |
| BUG-018 | HR | ST + L4 | **FIXED** | `useTripLifecycle` machine-drive `useEffect` fired on first render before Zustand `initFromStorage` completed. Pre-hydration values were all `null` → fell to `else` branch → sent `RESET` → XState machine stayed `IDLE` → `hasActiveTrip = false` → `useMapTracking` auto-open guard blocked → tracking sheet opened ~10-15s late (delayed until TanStack query resolved). Fix: gate effect on `useStoreHydrated()` — one-line `if (!storeHydrated) return` at top of effect, `storeHydrated` added to dep array. | `useTripLifecycle.js` 2026-04-28 |
| BUG-019 | ST | AT + L5 | **FIXED** | `selectedPaymentMethod` in `useMapCommitPaymentController` was `useState(null)` — reset to null on every sheet remount (collapse/background). User had to re-select their card. All other payment state already migrated to Jotai atoms (PT-D). Fix: migrate to `selectedPaymentMethodObjectAtom` (L5 Jotai). Reset on unmount so different hospital's sheet doesn't inherit stale selection. | `paymentAtoms.ts` + `useMapCommitPaymentController.js` 2026-04-28 |
| BUG-020 | HR | HO | **FIXED** | `nowMsRef` in `useMapExploreFlow` was synced via `useEffect(() => { nowMsRef.current = nowMs }, [nowMs])` — guardrail rule 3 violation (useEffect used only to sync a ref). Effect fires one render late → `activeMapRequest` consumed a stale timestamp on cold start → one-frame ETA artifact. Fix: assign `nowMsRef.current = nowMs` inline during render — same pattern as `totalCostValueRef`. | `useMapExploreFlow.js` 2026-04-28 |
| BUG-013 | SHM | RT | P2 | `mergeAmbulanceRealtimeTrip` (ambulances table) only maps `location` and `updated_at`. If the ambulances table gains a `heading` column (it currently has `responder_heading` on `emergency_requests` only), this merge function would silently drop it. Low risk today, pre-emptive flag. | SPA |
| BUG-017 | GM | SC + HO | P2 | All stack screens except `PaymentScreen` have zero viewport awareness — no `getStackViewportVariant`, no `usesSidebarLayout`, no `contentMaxWidth` clamping. On web md+ they render as full-bleed single-column mobile layouts. Affected: `MoreScreen` (1498 lines), `InsuranceScreen` (1287 lines, direct Supabase calls in screen), `SearchScreen`, `NotificationsScreen`, `HelpSupportScreen`, `RequestAmbulanceScreen`. `PaymentStageBase` + `stackViewportConfig.js` are already the correct pattern to adopt. | SPA + PGA |
| BUG-014 | GM | RT | P2 | `useEmergencyRealtime` patient location subscription (`watchPositionAsync`) has no guard against `Platform.OS === "web"` being the only guard — if `Location.getForegroundPermissionsAsync` throws on a device without location permission, the effect swallows the error silently and never sets up tracking. No toast/log visible to user. | PGA |
| BUG-015 | SL | RT | P3 | `useEmergencyRealtime` per-trip subscription keyed on `activeAmbulanceTrip?.id ?? activeAmbulanceTrip?.requestId`. If these two values differ across a server merge (e.g. `id` changes but `requestId` stays same), the dep changes, old channel is removed, new one is created — but there is a gap window where no channel exists. Low frequency. | DAA |

---

## Double-Rating Analysis (BUG-009 + BUG-010)

### The exact scenario you described

> "I finish a ride and rate but it doesn't save, and then after another ride that rating piles up and I have to rate twice"

**Step-by-step failure path:**

```
1. Trip A completes
   → useEmergencyHandlers sets lifecycleState = RATING_PENDING  ✅
   → writeTrackingRatingRecoveryClaim(visitId) persisted to AsyncStorage  ✅
   → setRatingState(ratingState atom) → modal appears  ✅

2. User submits rating
   → resolveTrackingRatingSubmit called
   → updateVisit(visitId, { lifecycleState: RATED, rating: X })
     ← NETWORK FAILURE — request times out or app is killed here

3. App restarts / next session
   → purgeStaleTrackingRatingClaims runs
   → checks visit.lifecycleState for visitId
   → visit still shows RATING_PENDING (server write never committed)
   → claim survives the purge
   → pendingRecoveredRatingVisit finds Trip A again
   → recoveredRatingStateAtom modal fires → user sees Trip A rating again

4. User completes Trip B
   → same flow → ratingState atom set for Trip B
   → both modals can surface in the same session
```

**Why `isSubmitPending` in `ServiceRatingModal` doesn't fully protect this:**
`isSubmitPending` is local `useState` — it resets on unmount. It prevents double-tap within a single modal session but cannot protect across app restarts.

### Current protections that ARE in place

- `handledRecoveredRatingVisitIdsRef` — session-scoped Set, prevents the same recovery from firing twice **within a session**
- `ratingRecoveryVersionAtom` — incremented after each handled recovery, re-triggers the claims-load effect
- `purgeStaleTrackingRatingClaims` — 5th layer, cross-checks against `lifecycleState` from Supabase (only works if `updateVisit` succeeded)
- `isSubmitPending` / `isSkipPending` in modal — prevents double-tap within session

### The gap (was)

**If `updateVisit` fails, there is no retry or optimistic commit.** The claim stays live. The next session's `purgeStaleTrackingRatingClaims` will still find the visit as `RATING_PENDING` and re-surface the modal.

### Fix path — SHIPPED 2026-04-28

**Layer 1 — Optimistic claim delete + rollback (`mapTracking.rating.js`):**
Claim is deleted from AsyncStorage *before* the network write. If the server write fails, `writeTrackingRatingRecoveryClaim` is called in the `catch` block to restore the claim so the recovery system can re-surface the modal in the next session.

**Layer 2 — Server-side idempotency (`visitsService.updateRating`):**
New dedicated method with `.is('rated_at', null)` Supabase filter — the PATCH is a no-op if the visit was already rated. Returns `{ alreadyRated: true }` which the caller treats as success, allowing `deleteRecoveryClaim` to complete cleanly. Tip processing is skipped on `alreadyRated: true` (tip was already charged in the original session).

### Remaining open item (BUG-012)

`trackingRatingStateAtom` persists `visible: true` into `TRACKING_VISUALIZATION`. If BUG-009/010 fixes ran but the atom write to `visible: false` was lost (OS kill between `setRatingState(INITIAL)` and the AsyncStorage write), cold start re-shows the modal. **Not yet fixed.** Fix path: validate `ratingState.visible` against visits cache on hydration.

---

## Audit Checklist (run against any new realtime-touching PR)

```
â–¡ Schema Diff: every field in mapEmergencyRequestRow present in mergeEmergencyRealtimeTrip?
â–¡ Dep Array: every variable that could change across renders listed in useEffect deps?
â–¡ Phase Guard: every patchActiveAmbulanceTrip/store write has isTrackingMapActive or equivalent?
â–¡ Claim Lifecycle: every writeXxxClaim has deleteXxxClaim on BOTH success AND failure path?
â–¡ Claim Rollback: every optimistic deleteXxxClaim has a restore path in the catch block?
â–¡ In-flight Lock: every submit handler has isPending guard that survives unmount?
â–¡ Idempotency: every rating/payment mutation has a server-side uniqueness guard (rated_at IS NULL etc.)?
â–¡ Terminal Preservation: any query returning null — does the store sync effect preserve terminal state?
â–¡ Hydration Order: any queryFn reading store — uses getState() not closed-over selector?
â–¡ Shape Parity: realtime payload snake_case fields mapped to camelCase trip object for ALL consumed columns?
â–¡ Persisted Atom Validation: any persisted atom with a boolean flag (visible, active) — validated against server truth on cold-start hydration?
â–¡ Viewport Awareness: new stack screen uses getStackViewportVariant + PaymentStageBase pattern?
â–¡ Screen Size: new screen file < 500 lines? model hook extracted? service calls in hook not screen?
```

---

## Stack Screen Viewport Gap (BUG-017 detail)

### What `PaymentScreen` has that others don't

`PaymentStageBase` → `getStackViewportVariant` → `getStackViewportSurfaceConfig` → `computePaymentSidebarLayout`:
- 14-variant resolver (ios/android/web Ã— compact/tablet/desktop/xl)
- Sidebar island at tablet+ (`overlayLayout: "left-sidebar"`)
- `contentMaxWidth` clamping (720px tablet, 960px desktop, 1120px XL)
- Centered modals at tablet+ (`modalPresentationMode: "centered-modal"`)
- XL third-column context island

### Screens that need this treatment (priority order)

| Screen | Lines | Violations | Priority |
|---|---|---|---|
| `MoreScreen.jsx` | 1498 | No viewport, monolith, >800 line rule | **P2 / next** |
| `InsuranceScreen.jsx` | 1287 | No viewport, direct Supabase calls in screen | **P2 / next** |
| `SearchScreen.jsx` | 705 | No viewport, moderate | P3 |
| `NotificationsScreen.jsx` | 555 | No viewport | P3 |
| `HelpSupportScreen.jsx` | 532 | No viewport | P3 |
| `RequestAmbulanceScreen.jsx` | 808 | Emergency flow — complex | P3 |
| `MedicalProfileScreen.jsx` | 422 | No viewport | P3 |

### Pattern to adopt
1. Extract model hook (`useXxxScreenModel`) — owns all state + service calls
2. Wrap in `StageBase` component — owns viewport resolution + layout shell
3. Create `CompactVariant` + `SidebarVariant` (or `ManagementVariant`) — owns layout
4. Screen file becomes a 10-20 line orchestrator (`<XxxScreenOrchestrator />`)
5. Modals rendered at orchestrator level (not inside variants — avoids z-order issues)
