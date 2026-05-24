---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Map Pass 18 Worktree Checkpoint 2026-05-07

Date: `2026-05-07`
Scope: live `/map` worktree only
Source of truth: local `git status --short`

## Worktree Snapshot

As of this checkpoint, `ivisit-app` has a mixed-owner dirty worktree:

- `71` modified paths
- `14` untracked paths
- `85` total status entries

This is not a safe "stage everything" moment.

The worktree currently contains:

1. Pass 18 `/map` truth hardening work
2. billing quote adoption follow-ons
3. marker / sprite / asset-side experiments
4. manual address / `changeAddress` slice work
5. user-side edits that did not originate from one single Codex pass

The next git update should be cut by deterministic buckets, not by one bulk stage.

Current top-level distribution:

- modified `assets`: `16`
- modified `components`: `26`
- modified `docs`: `6`
- modified `hooks`: `16`
- modified `services`: `3`
- modified other top-level lanes: `4`
- untracked `docs`: `10`
- untracked non-doc paths: `4`

## Pass 18 Plan vs Current Code

### Implemented against the plan

1. Canonical pickup truth
- `hooks/map/exploreFlow/mapPickupLocationTruth.js`
- `hooks/map/exploreFlow/useMapLocation.js`
- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `contexts/GlobalLocationContext.jsx`

Current state:
- `/map` pickup truth now prefers:
  1. `session_manual`
  2. `device`
  3. `saved_manual_fallback`
  4. `saved_device_fallback`
  5. `missing`
- location-off is treated as explicit truth, not as a silent healthy fallback

2. Location-off terminal behavior
- `hooks/map/exploreFlow/useMapLoadingState.js`
- `hooks/map/exploreFlow/mapExploreFlow.loading.js`
- `screens/MapScreen.jsx`

Current state:
- location-off no longer has to stay behind the loading overlay
- search can auto-open into pickup selection when no trusted pickup exists

3. Nearby and nearest-hospital truth
- `hooks/emergency/useHospitals.js`
- `services/hospitalsService.js`
- `supabase/functions/discovery/discover-hospitals/index.ts`
- `hooks/map/exploreFlow/useMapDerivedData.js`
- `hooks/map/exploreFlow/mapExploreFlow.derived.js`
- `hooks/map/exploreFlow/useMapHospitalSelection.js`
- `components/map/views/exploreIntent/*`

Current state:
- `nearby` is now a strict `<= 5km` lane
- summary nearest-hospital selection is separated from the broad dispatchable lane
- provider discovery skip logic now checks local comfort, not only broad 50km sufficiency

4. Route and stale-session hardening
- `services/routeService.js`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
- `hooks/map/exploreFlow/useMapLocation.js`
- `hooks/map/exploreFlow/useMapExploreFlow.js`

Current state:
- invalid route coordinates are rejected before provider fetch
- pickup changes clear stale hospital focus
- cross-session pickup/hospital route mismatches are rejected locally

5. Search analytics schema fix
- `services/discoveryService.js`
- `hooks/search/useSearchRanking.js`

Current state:
- query commits and result selections no longer share the wrong insert contract

6. Billing quote adoption in active decision surfaces
- `hooks/payment/useQuotedPriceMap.js`
- `components/map/views/ambulanceDecision/*`
- `components/map/views/bedDecision/*`
- `components/map/views/commitPayment/*`

Current state:
- ambulance and bed decision cards can render quoted display pricing
- commit payment keeps the quoted payment lane

7. Pre-tracking pickup edit return contract
- `hooks/map/exploreFlow/mapExploreFlow.transitions.js`
- `hooks/map/exploreFlow/useMapSheetNavigation.js`
- `hooks/map/state/useMapSheetPhaseReducer.js`
- `hooks/map/exploreFlow/useMapLocation.js`
- `components/map/core/MapSheetOrchestrator.jsx`
- `screens/MapScreen.jsx`

Current state:
- pickup edits can reopen search in `LOCATION` mode from:
  - ambulance decision
  - bed decision
  - commit payment
- search now preserves:
  - `sourcePhase`
  - `sourceSnapState`
  - `sourcePayload`
- location selection can return to the originating pre-tracking phase instead of always forcing explore intent

8. Tracking pickup edit pullback
- `components/map/views/tracking/MapTrackingStageBase.jsx`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`

Current state:
- pickup change was removed from tracking
- rationale: tracking never mutated the live request destination, so the old control was misleading

## Still Needed Before Pass 18 Can Be Called Complete

1. Hospital detail quote adoption is still incomplete
- `components/map/surfaces/hospitals/mapHospitalDetail.helpers.js`
- `components/map/surfaces/hospitals/useMapHospitalDetailModel.js`

2. Service detail still depends on upstream price text and still lacks a direct pickup-edit affordance

3. Hospital detail still lacks a direct pickup-edit affordance

4. Explore-intent and search copy still need tightening
- clearer pickup-first wording
- less repetition
- stronger discoverability once a pickup already exists

5. Provider / secondary hospital visibility policy is still unresolved
- summary truth is better
- list/deep-flow policy for non-dispatch-ready nearby hospitals is not fully settled

6. Worktree still contains non-Pass-18 or mixed-owner changes
- ambulance sprite assets
- sprite generation script
- marker/preview/route files outside the current deterministic slice
- payment-side files outside the map-decision quote lane

7. Manual address / `changeAddress` ownership is not folded cleanly into the plan yet
- `components/changeAddress/*`
- `screens/ChangeAddressScreen.jsx`
- this likely belongs to the pickup-control lane, but it should not be staged blindly with the current `/map` bucket unless its navigation and ownership contract are explicit

## Deterministic Staging Order

Recommended git-update buckets:

### Bucket A. Pickup truth and search return contract

Stage together:
- `hooks/map/exploreFlow/mapPickupLocationTruth.js`
- `hooks/map/exploreFlow/useMapLocation.js`
- `hooks/map/exploreFlow/useMapExploreFlow.js`
- `hooks/map/exploreFlow/mapExploreFlow.transitions.js`
- `hooks/map/exploreFlow/useMapSheetNavigation.js`
- `hooks/map/state/useMapSheetPhaseReducer.js`
- `screens/MapScreen.jsx`
- `contexts/GlobalLocationContext.jsx`

Purpose:
- canonical pickup truth
- pre-tracking search return contract

### Bucket B. Nearby / nearest hospital truth

Stage together:
- `hooks/emergency/useHospitals.js`
- `services/hospitalsService.js`
- `supabase/functions/discovery/discover-hospitals/index.ts`
- `hooks/map/exploreFlow/useMapDerivedData.js`
- `hooks/map/exploreFlow/mapExploreFlow.derived.js`
- `hooks/map/exploreFlow/useMapHospitalSelection.js`
- `hooks/map/exploreFlow/useMapLoadingState.js`
- `hooks/map/exploreFlow/mapExploreFlow.loading.js`
- `components/map/views/exploreIntent/*`

Purpose:
- fixed `nearby`
- local nearest summary
- location-off terminal state

### Bucket C. Route + stale-session hardening

Stage together:
- `services/routeService.js`
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
- `services/discoveryService.js`
- `hooks/search/useSearchRanking.js`

Purpose:
- reject bad route inputs
- clear stale hospital sessions on pickup boundary
- fix search analytics insert contract

### Bucket D. Quote adoption and pre-tracking pickup affordances

Stage together:
- `hooks/payment/useQuotedPriceMap.js`
- `hooks/payment/useBillingQuoteQuery.ts`
- `components/map/views/ambulanceDecision/*`
- `components/map/views/bedDecision/*`
- `components/map/views/commitPayment/*`
- `components/map/core/MapSheetOrchestrator.jsx`
- `components/map/views/tracking/MapTrackingStageBase.jsx`
- `components/map/views/tracking/parts/MapTrackingParts.jsx`

Purpose:
- quoted pricing in active decision surfaces
- pickup edit available pre-tracking only
- tracking pullback finalized

### Bucket E. Mixed-owner or out-of-slice work

Review separately before staging:
- `assets/map/ambulance-sprites/*`
- `scripts/map/generate-ambulance-sprites.ps1`
- `components/changeAddress/*`
- `screens/ChangeAddressScreen.jsx`
- `components/map/RouteLayer.jsx`
- `components/emergency/requestModal/BedBookingOptions.jsx`
- `hooks/payment/usePaymentScreenModel.js`
- `hooks/visits/useBookVisitScreenModel.js`
- `hooks/visits/usePaymentHistoryEntryQuery.js`
- any user-authored edits not intended for the `/map` pass

Purpose:
- keep the git update deterministic
- avoid coupling `/map` truth hardening to unrelated experiments or user-side work

## Deterministic Git Update Flow

Use this order for the next git update:

1. pick exactly one bucket
2. stage only that bucket plus its matching doc updates
3. run `git diff --cached --check`
4. confirm no unrelated `assets`, `changeAddress`, or payment-side files leaked into the staged set
5. commit that bucket before touching the next one

If the next update is meant to be Pass 18 only, do not stage Bucket E in the same commit.

## Recommended Documentation Update Order

When staging the next git update, keep docs aligned in this order:

1. `docs/flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md`
2. `docs/audit/map/LOCATION_CONTROL_AND_MANUAL_PICKUP_AUDIT_2026-05-07.md`
3. `docs/audit/map/MAP_LOCATION_NEARBY_AND_ROUTE_FAILURE_AUDIT_2026-05-07.md`
4. `docs/audit/map/NEAREST_HOSPITAL_SELECTION_AUDIT_2026-05-07.md`
5. `docs/audit/map/PICKUP_CONTROL_AND_QUOTE_ADOPTION_AUDIT_2026-05-07.md`
6. this checkpoint doc and its manifest

## Exit Condition For A Clean Git Update

The worktree is ready for a deterministic git update when:

1. one bucket is staged at a time
2. the bucket has matching docs
3. the bucket does not include unrelated asset or user-only edits
4. remaining pending work is explicitly left in the audit docs instead of being silently deferred
