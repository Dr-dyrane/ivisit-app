# Map CTA State Pass Plan (v1)

Status: Planned
Scope: `/map`
Purpose: harden map CTA semantics so every major action truthfully reflects `ready`, `recover`, or `unavailable`

Related audit:

- [`../../../audit/MAP_CTA_STATE_CONTRACT_AUDIT_2026-05-02.md`](../../../audit/MAP_CTA_STATE_CONTRACT_AUDIT_2026-05-02.md)

## Why This Pass Exists

Recent map fixes proved that several `/map` surfaces still encode state truth too late.

Today, some flows still behave like this:

1. model says the user cannot continue
2. UI still renders a forward red CTA
3. handler rejects or no-ops later

That is not calm or trustworthy emergency UX.

The standard for this pass is:

- `ready` -> progress CTA
- `recover` -> recovery CTA
- `unavailable` -> neutral disabled CTA

## Pass Order

Patch by ROI:

1. `serviceDetail`
2. `commitDetails`
3. `chooseHospital`
4. `tracking`

## Pass 17A. Service Detail CTA Contract

Owner:

- [`components/map/views/serviceDetail/MapServiceDetailStageParts.jsx`](../../../../components/map/views/serviceDetail/MapServiceDetailStageParts.jsx)

Target:

- stop treating service-detail footer state as only `selected` vs `not selected`
- introduce explicit CTA branches for:
  - ready
  - recover
  - unavailable

Done when:

- the footer does not always look like a forward-progress action
- missing or stale service state does not render a misleading confirm CTA

## Pass 17B. Commit Details Auth CTA Contract

Owner:

- [`components/map/views/commitDetails/MapCommitDetailsStageParts.jsx`](../../../../components/map/views/commitDetails/MapCommitDetailsStageParts.jsx)

Target:

- stop passing `isDisabled={false}` unconditionally into the auth question card
- make invalid email, invalid phone, expired OTP, and equivalent failure states visible at the CTA layer

Done when:

- the CTA does not present as submittable when the current step is invalid
- submit handlers are no longer the first place users discover failure state

## Pass 17C. Choose Hospital Review CTA Contract

Owner:

- [`components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx`](../../../../components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx)

Target:

- expand beyond `isRefreshingRoutePreview`
- introduce CTA truth for:
  - route updating
  - no viable hospital
  - route stale
  - catalog failed

Done when:

- the review card can express recovery or unavailability instead of only refresh-vs-normal

## Pass 17D. Tracking Bottom Action Contract

Owner:

- [`components/map/views/tracking/parts/MapTrackingParts.jsx`](../../../../components/map/views/tracking/parts/MapTrackingParts.jsx)
- [`components/map/views/tracking/mapTracking.model.js`](../../../../components/map/views/tracking/mapTracking.model.js)

Target:

- stop using `loading` as the only gating condition
- make bottom-action semantics explicit when the action is temporarily unavailable, incomplete, or should be hidden

Done when:

- the bottom action no longer appears live by default unless upstream removes it entirely

## Explicit Non-Owner For This Pass

### `MapCommitPayment`

File:

- [`components/map/views/commitPayment/MapCommitPaymentStageParts.jsx`](../../../../components/map/views/commitPayment/MapCommitPaymentStageParts.jsx)

Reason:

- already has explicit `disabled` and `loading`
- may need copy refinement later
- not the strongest offender in this pass

## Guardrail Rule

This pass must not solve CTA truth with late `useEffect` syncing.

Prefer:

- derived booleans
- named controller outputs
- explicit content constants
- machine/atom truth where state is shared

Do not ship any surface where the CTA still needs the handler to reveal the real state.
