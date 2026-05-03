# Map CTA State Contract Audit (2026-05-02)

Status: Audit only, not implemented yet

## Scope

This audit covers the remaining `/map` CTA surfaces that still present forward-progress actions without a full `ready / recover / unavailable` contract.

Reference baseline:

- [`MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md`](./MAP_ENTITY_RENDER_STATE_CHECKPOINT_2026-05-01.md)
- [`../flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md`](../flows/emergency/architecture/MAP_RUNTIME_PASS_PLAN_V1.md)

## Why This Audit Exists

The recent ambulance/bed decision defect proved a recurring pattern:

- the model already knows the user cannot continue
- the UI still shows a red progress CTA
- submit handlers reject or no-op later

That means the bug class is not only "missing null checks."

It is a contract mismatch:

- model truth says `recover` or `unavailable`
- CTA grammar still says `continue`

## Hard Repeats

These are the next strongest repeats of the exact same defect class.

### 1. `MapServiceDetailFooter`

File:

- [`components/map/views/serviceDetail/MapServiceDetailStageParts.jsx`](../../components/map/views/serviceDetail/MapServiceDetailStageParts.jsx)

Current behavior:

- always renders a forward primary CTA
- binds raw `onConfirm`
- label only depends on `isSelected`

Why this is a problem:

- there is no explicit `recover` branch
- there is no explicit `unavailable` branch
- if the selected service becomes stale, missing, or semantically invalid, the footer still looks like the user can continue

Severity:

- High

### 2. `MapCommitDetails` auth CTA

File:

- [`components/map/views/commitDetails/MapCommitDetailsStageParts.jsx`](../../components/map/views/commitDetails/MapCommitDetailsStageParts.jsx)

Current behavior:

- `MapAuthQuestionCard` is passed `isDisabled={false}` unconditionally

Why this is a problem:

- invalid email
- invalid phone
- expired OTP
- other failure states

still present as visually actionable submit states, while the handlers do the real rejection later

Severity:

- High

## Contract Gaps, Not As Broken As The Screenshot

These do not fail as directly as the decision sheets did, but they still do not express the full state contract at the CTA layer.

### 3. `EmergencyChooseHospital` review CTA

File:

- [`components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx`](../../components/emergency/intake/views/chooseHospital/EmergencyChooseHospitalStageBase.jsx)

Current behavior:

- only special-cases `isRefreshingRoutePreview`

Gap:

- no richer CTA handling for:
  - no viable hospital
  - route stale
  - catalog failed

Severity:

- Medium

### 4. `MapTracking` bottom action

Files:

- [`components/map/views/tracking/parts/MapTrackingParts.jsx`](../../components/map/views/tracking/parts/MapTrackingParts.jsx)
- [`components/map/views/tracking/mapTracking.model.js`](../../components/map/views/tracking/mapTracking.model.js)

Current behavior:

- bottom action disables only on `loading`

Gap:

- if the action becomes semantically unavailable, the button still presents as live unless upstream removes it entirely

Severity:

- Medium

## Not The Same Severity

### 5. `MapCommitPayment`

File:

- [`components/map/views/commitPayment/MapCommitPaymentStageParts.jsx`](../../components/map/views/commitPayment/MapCommitPaymentStageParts.jsx)

Current behavior:

- already has explicit `disabled`
- already has explicit `loading`

Assessment:

- this is not the same bug class as the decision-sheet failure
- it could still use clearer `recover` copy in some branches
- it is not the highest-priority offender

Severity:

- Low relative to the others in this pass

## Recommended Fix Order

Patch by ROI:

1. `serviceDetail`
2. `commitDetails`
3. `chooseHospital`
4. `tracking`

## Pass Rule

The fix standard for this pass should be:

- `ready`: primary progress CTA
- `recover`: primary recovery CTA with truthful copy
- `unavailable`: neutral disabled CTA, not a fake red progress affordance

This pass should not be treated as a handler-only cleanup.

It is a state-to-CTA contract pass.
