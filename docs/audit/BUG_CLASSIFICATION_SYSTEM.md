# iVisit Bug Classification System
_Last updated: 2026-04-28_

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

---

### OPEN / POTENTIAL

| ID | Class | Layer | Severity | Description | Detection Method |
|---|---|---|---|---|---|
| BUG-011 | SOC | AT + HO | P2 | `trackingRatingStateAtom` (in-flow, persisted) and `recoveredRatingStateAtom` (recovery, not persisted) are independent atoms. If a user completes a trip, app crashes between `writeTrackingRatingRecoveryClaim` and `setRatingState`, on restart: recovery path fires modal. In-flow atom is cleared (was never fully set). No conflict — but the recovery path skips `finalizeCompletedTracking` (`completeKind` not in recovery state context if the trip was for the same ride as an active Zustand state). | CLA |
| BUG-012 | PC | AT | P3 | `trackingRatingStateAtom` is persisted via `persistedTrackingAtom`. If the app closes with `visible: true` (mid-rating), on next cold start the modal re-appears even if the user had already submitted (only the `deleteRecoveryClaim` write failed). This is the same underlying failure as BUG-010 but surfaces differently on cold start. | CLA |
| BUG-013 | SHM | RT | P2 | `mergeAmbulanceRealtimeTrip` (ambulances table) only maps `location` and `updated_at`. If the ambulances table gains a `heading` column (it currently has `responder_heading` on `emergency_requests` only), this merge function would silently drop it. Low risk today, pre-emptive flag. | SPA |
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

### The gap

**If `updateVisit` fails, there is no retry or optimistic commit.** The claim stays live. The next session's `purgeStaleTrackingRatingClaims` will still find the visit as `RATING_PENDING` and re-surface the modal.

### Fix path

Two layers needed:

**Layer 1 — Optimistic lifecycle write before network call:**
Write `lifecycleState = RATED` to local Zustand/visits cache optimistically before the `updateVisit` network call. On failure, roll back. This means `purgeStaleTrackingRatingClaims` sees `RATED` even if server is unreachable, and purges the claim.

**Layer 2 — Server-side idempotency on rating:**
`updateVisit` should be a PATCH with a `rated_at IS NULL` condition or use a Postgres upsert that is idempotent — so even if submitted twice, the second write is a no-op and returns success, allowing `deleteRecoveryClaim` to complete.

---

## Audit Checklist (run against any new realtime-touching PR)

```
□ Schema Diff: every field in mapEmergencyRequestRow present in mergeEmergencyRealtimeTrip?
□ Dep Array: every variable that could change across renders listed in useEffect deps?
□ Phase Guard: every patchActiveAmbulanceTrip/store write has isTrackingMapActive or equivalent?
□ Claim Lifecycle: every writeXxxClaim has deleteXxxClaim on BOTH success AND failure path?
□ In-flight Lock: every submit handler has isPending guard that survives unmount?
□ Terminal Preservation: any query returning null — does the store sync effect preserve terminal state?
□ Hydration Order: any queryFn reading store — uses getState() not closed-over selector?
□ Shape Parity: realtime payload snake_case fields mapped to camelCase trip object for ALL consumed columns?
```
