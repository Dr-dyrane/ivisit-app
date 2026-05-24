---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Pickup Control And Quote Adoption Audit

Date: `2026-05-07`
Scope: live `/map` flow only

## Problem Statement

Two related defects remain in the live map flow:

1. pricing does not consistently follow the current pickup country
2. pickup change is still hidden or missing in key phases after explore intent

The result is a user can:

- change pickup once and see currency update
- move into hospital detail, service selection, or payment and still see raw canonical pricing on some cards
- remain unsure how to change pickup again from the deeper phases

## Current Checkpoint

Implemented in the current local worktree:

- ambulance decision quote adoption
- bed decision quote adoption
- pre-tracking pickup-edit return contract using:
  - `sourcePhase`
  - `sourceSnapState`
  - `sourcePayload`
- explicit pickup-edit affordances in:
  - ambulance decision
  - bed decision
  - commit payment
- tracking pickup edit removed intentionally

Still remaining:

- hospital detail quote adoption
- service detail quote inheritance / adoption
- hospital detail pickup affordance
- service detail pickup affordance
- explore-intent and search copy tightening

## Canonical Rule

`location` is the canonical owner.

`currency / billing quote` is derived from pickup country, not treated as an independently-driven UI state.

That means:

- if pickup country is known, quote queries should use it directly
- if pickup country is missing, quote queries can fall back to stored billing preferences
- if stored billing context differs from pickup context, the app should surface that pricing is updating to the pickup country

## Remaining Quote Adoption Gaps

### 1. Hospital detail service rails still own price formatting

Files:

- [mapHospitalDetail.helpers.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/surfaces/hospitals/mapHospitalDetail.helpers.js)
- [MapHospitalDetailServiceRail.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/surfaces/hospitals/MapHospitalDetailServiceRail.jsx)

Current issue:

- helper builds `priceText` directly from canonical service/room rows
- quote lane is not injected before the card render

Required fix:

- pass structured `priceAmount`, `priceCurrency`, and `displayPriceText`
- render `displayPriceText` only

### 2. Ambulance decision quote adoption

Files:

- [useMapAmbulanceDecisionModel.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/ambulanceDecision/useMapAmbulanceDecisionModel.js)
- [mapAmbulanceDecision.helpers.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/ambulanceDecision/mapAmbulanceDecision.helpers.js)
- [MapAmbulanceDecisionStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/ambulanceDecision/MapAmbulanceDecisionStageParts.jsx)

Status:

- implemented in the current worktree

Current state:

- service options are projected through the quoted-price lane before render
- decision cards can show pickup-country display pricing instead of canonical raw text

### 3. Bed decision quote adoption

Files:

- [useMapBedDecisionModel.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/bedDecision/useMapBedDecisionModel.js)
- [mapBedDecision.helpers.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/bedDecision/mapBedDecision.helpers.js)
- [MapBedDecisionStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/bedDecision/MapBedDecisionStageParts.jsx)

Status:

- implemented in the current worktree

Current state:

- room options are projected through the quoted-price lane before render
- hero and alternative rows can show pickup-country display pricing

### 4. Service detail still renders inherited raw card pricing

Files:

- [MapServiceDetailStageBase.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/serviceDetail/MapServiceDetailStageBase.jsx)
- [MapServiceDetailStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/serviceDetail/MapServiceDetailStageParts.jsx)

Current issue:

- detail stage trusts `service.priceText`
- if upstream service card was not quoted, detail stage remains wrong too

Required fix:

- ensure quoted service payload is what the detail phase receives

### 5. Commit payment summary rows still need upstream quoted-label cleanup

Files:

- [MapCommitPaymentStageBase.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/commitPayment/MapCommitPaymentStageBase.jsx)
- [useMapCommitPaymentController.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/commitPayment/useMapCommitPaymentController.js)

Current issue:

- total is quoted
- pickup edit affordance is now present
- but some upstream selection labels can still inherit raw text if hospital detail or service detail did not hand forward quoted values

Required fix:

- keep the quoted total lane
- finish upstream quoted-label propagation from hospital detail and service detail

## Pickup Change UX Gaps

### 1. Explore intent still hides pickup change inside generic search

Files:

- [MapExploreIntentStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/exploreIntent/MapExploreIntentStageParts.jsx)
- [MapExploreIntentHospitalSummaryCard.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx)
- [mapExploreIntent.content.js](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/exploreIntent/mapExploreIntent.content.js)

Current issue:

- search pill still reads too generically
- once pickup exists, there is no strong explicit `Change pickup` action in the default summary state

### 2. Hospital detail lacks direct pickup redirect

Files:

- [MapHospitalDetailStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/hospitalDetail/MapHospitalDetailStageParts.jsx)
- [MapHospitalDetailBody.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/surfaces/hospitals/MapHospitalDetailBody.jsx)

Current issue:

- user can inspect services and hospital context
- but cannot directly reopen pickup search from there

### 3. Service detail lacks direct pickup redirect

Files:

- [MapServiceDetailStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/serviceDetail/MapServiceDetailStageParts.jsx)

### 4. Commit payment pickup redirect

Files:

- [MapCommitPaymentStageParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/commitPayment/MapCommitPaymentStageParts.jsx)
- [MapCommitPaymentStageBase.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/commitPayment/MapCommitPaymentStageBase.jsx)

Status:

- implemented in the current worktree

Current state:

- payment now exposes a direct pickup-edit redirect before tracking
- the redirect reopens search in `LOCATION` mode and returns to commit payment after selection

### 5. Tracking pickup edit policy

Files:

- [MapTrackingStageBase.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/tracking/MapTrackingStageBase.jsx)
- [MapTrackingParts.jsx](/C:/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/views/tracking/parts/MapTrackingParts.jsx)

Status:

- intentionally removed

Rationale:

- tracking never owned a real tracked-request destination mutation path
- the old control only changed local `/map` shell state
- that made tracking look editable when the live trip destination was not actually being updated

## UX Direction

The live map should expose pickup change as a first-class action, not an inferred one.

Preferred pattern:

- small redirect icon/button on the utility edge of pre-tracking route or pickup cards
- action opens search sheet in `LOCATION` mode
- after selection or close, restore the previous phase and payload cleanly

## Required State Contract

We need one explicit return contract for location editing.

Current implementation:

- `sourcePhase`
- `sourceSnapState`
- `sourcePayload`

Notes:

- this is now implemented for pre-tracking location edits
- there is no separate `returnOnLocationClose` field; the reducer return uses the stored source payload directly
- tracking is intentionally outside this contract

This should be stored in the sheet runtime before opening location search from:

- hospital detail
- service detail
- ambulance decision
- bed decision
- commit payment
- tracking

## Copy Direction

The search affordance should say plainly what it does.

Better explore-intent placeholder/copy direction:

- `Change your pickup or address, and search for care`
- thin visual weight
- concise enough to fit mobile

## Implementation Order

1. finish quote adoption in hospital detail -> service detail -> commit payment upstream labels
2. add direct pickup affordances in hospital detail and service detail
3. tighten explore-intent and search copy after the flow is wired
4. keep tracking read-only for pickup changes unless a real request-destination mutation contract is added later
