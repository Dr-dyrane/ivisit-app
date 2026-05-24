---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# iVisit Service Sheet Simplification Audit

Date: 2026-05-19
Status: Active
Scope: Welcome, Explore Intent, Choose Care, location management, mini profile/auth, emergency service sheets, Explore Care provider sheets, Book Visit bridge

## Problem Statement

iVisit now exposes a richer care surface than the original closed-testing emergency lane. The product has grown from a direct emergency-dispatch experience into a map-first care system with ambulance dispatch, bed booking, combined ambulance and bed, visit booking, and Explore Care provider discovery.

That growth is strategically correct, but it creates a UX risk: the runtime can be sophisticated while the user experience starts to feel like too many surfaces, decisions, and names. The goal is not to remove capability. The goal is to make each service feel simpler, clearer, and more intentional while preserving the map-sheet runtime, payment continuity, realtime tracking, and provider discovery architecture.

The specific concern is:

- A new user should not be overwhelmed from the welcome page.
- Explore Intent should reveal care breadth without making emergency action less obvious.
- Choose Care should behave like a clear service picker, not a historical artifact.
- Each service should have an obvious user flow.
- Internal sheet phases should not leak as perceived product complexity.
- Location management should feel like one clear "set pickup" flow even though it owns search, saved places, recents, manual entry, candidate confirmation, and save flows.
- Mini profile should feel like account support, not another competing care service.
- Book Visit should not feel like a separate product when entered from Choose Care.

## Source Files Audited

- `components/welcome/welcomeContent.js`
- `components/map/views/exploreIntent/MapExploreIntentCareSection.jsx`
- `components/map/views/exploreIntent/MapExploreIntentProfileTrigger.jsx`
- `components/map/MapChooseCareModal.jsx`
- `components/map/MapCareHistoryModal.jsx` compatibility re-export
- `components/map/MapGuestProfileModal.jsx`
- `components/map/MapModalOrchestrator.jsx`
- `components/map/views/shared/MapTopLeftControl.jsx`
- `components/map/core/mapSheet.constants.js`
- `components/map/core/mapFlowContracts.js`
- `components/map/core/MapSheetOrchestrator.jsx`
- `components/map/views/locationIntent/MapLocationIntentOrchestrator.jsx`
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`
- `components/map/views/locationIntent/mapLocationIntent.model.js`
- `components/map/views/locationIntent/mapLocationIntent.helpers.js`
- `hooks/map/exploreFlow/useMapSheetNavigation.js`
- `hooks/map/decision/useMapDecisionHandlers.js`
- `hooks/map/exploreFlow/useMapCommitFlow.js`
- `hooks/map/exploreFlow/useMapLocation.js`
- `hooks/map/exploreFlow/useMapLocationIntent.js`
- `hooks/map/locationIntent/useAddressCandidateController.js`
- `hooks/map/locationIntent/useCandidateHandlers.js`
- `hooks/map/locationIntent/useManualEntryHandlers.js`
- `hooks/map/locationIntent/useManualDropController.js`
- `hooks/map/locationIntent/useSavedAddressActions.js`
- `hooks/map/shell/useMapShell.js`
- `components/map/views/ambulanceDecision/MapAmbulanceDecisionStageBase.jsx`
- `components/map/views/bedDecision/MapBedDecisionStageBase.jsx`
- `components/map/views/commitDetails/useMapCommitDetailsController.js`
- `components/map/views/commitTriage/useMapCommitTriageController.js`
- `components/map/views/commitPayment/useMapCommitPaymentController.js`
- `components/map/views/providerList/MapProviderListStageBase.jsx`
- `components/map/views/providerList/MapProviderListSheet.jsx`
- `components/map/views/providerDetail/MapProviderDetailStageBase.jsx`
- `constants/providerTypes.js`
- `hooks/map/useMapRouteHandlers.js`

## Audit Findings

### 1. Welcome Is Intentionally Narrow

The welcome page presents one primary action for a new user. This is intentional and should remain so. It protects the first session from feeling like a service marketplace before the user understands iVisit.

Decision:

- Do not add the full service catalog to Welcome.
- Keep Welcome focused on immediate help and orientation.
- Let Explore Intent and Choose Care reveal service breadth after the user enters the map runtime.

Risk if changed:

- Emergency clarity weakens.
- First-time cognitive load rises.
- Closed-testing reviewers may perceive the app as less focused.

### 2. Explore Intent Is the First Real Service Surface

`MapExploreIntentCareSection` exposes the emergency lane directly:

- Ambulance
- Bed space
- Compare / ambulance + bed

It also lets users open the expanded Choose Care modal. This is the right hierarchy: immediate emergency services are visible on the map, while broader care discovery is one tap deeper.

Decision:

- Keep Explore Intent emergency-biased.
- Avoid making every Explore Care category visible on the first sheet by default.
- Preserve the map as the constant reality layer.

### 3. Choose Care Modal Has Outgrown Its Name

`MapChooseCareModal` is the service picker for:

Emergency:

- Ambulance
- Bed space
- Ambulance + bed
- Book a visit, when signed in

Explore nearby care:

- Pharmacies
- Urgent care
- Clinics
- Labs
- Radiology
- Mental health
- Women's care
- Pediatrics

The UX is useful, but the file/component naming is misleading. That creates implementation risk because future developers may treat the modal as history-owned when it is service-entry-owned.

Decision:

- Treat this surface as "Choose Care" in product language.
- Rename internals in a controlled pass, not during unrelated work.
- Keep the expanded default behavior for Choose Care, because Explore Care categories need space.

### 4. Location Management Is A Full Flow, Not A Helper

Actual entry points:

- Auto-open from `useMapLocationIntent` when location is unavailable or requires user selection.
- Manual open from the map/location controls.
- Source-return open from ambulance, bed, and payment phases when the user changes pickup.
- Search-to-location handoff from `handleOpenLocationIntentFromSearch`.

Actual location modes:

- `DEFAULT`
- `ADDRESS_SEARCH`
- `CANDIDATE_DECISION`
- `MANUAL_STEP`
- `PIN_ADJUST`
- `CONFIRM`
- `SAVE_CATEGORY`
- `SAVE_DETAILS`
- `SAVE_SUCCESS`
- `SAVED_MANAGE`
- `PLACES_HUB`
- `RECENTS_HUB`

Important behavior:

- Each mode has a snap policy. Search, manual entry, saved places, recents, and save details are expanded-only; candidate/confirm flows are half-height.
- Manual entry is multi-step and country-aware, including localized subdivision labels such as state, emirate, prefecture, county, and region.
- Candidate selection is atom-backed and survives snap changes.
- Saved places have CRUD state, category selection, save details, success state, and manage/delete behavior.
- Device location can stay inside Location Intent or return to the source phase.
- Location changes clear location-scoped map state, reset route readiness, and update billing country overrides.
- Location return contracts preserve the user's source phase for hospital list/detail, service detail, ambulance decision, bed decision, and payment.
- Android keyboard behavior is explicitly hardened so expanded location modes do not collapse while typing.

Decision:

- Do not treat Location Intent as a secondary helper in the simplification plan.
- Keep it as a first-class map-sheet subsystem.
- Simplify its perceived UX by grouping modes into four user concepts:
  - Use device location
  - Search address/place
  - Use saved/recent place
  - Enter manually

Risk if simplified too aggressively:

- Manual address validation can regress.
- Source-return contracts can break mid-emergency.
- Billing country and provider discovery can drift from the selected pickup.
- Android keyboard collapse bugs can return.

### 5. Mini Profile And Guest Profile Are Account Support Flows

Actual signed-in flow:

`Avatar or profile trigger -> MiniProfileModal -> recent visits / location intent / sign out`

Actual guest flow:

`Guest profile trigger -> MapGuestProfileModal -> email OTP or Google OAuth -> return to map`

Important behavior:

- `MapTopLeftControl` is phase-aware:
  - unauthenticated Explore Intent shows back to Welcome
  - authenticated non-decision phases show avatar/profile
  - authenticated decision phases show back to map
  - commit/tracking phases can hide the control
- `MapGuestProfileModal` defers profile completion so urgent map intent is not blocked.
- Guest auth uses email OTP and Google OAuth.
- Email can hydrate from contact input memory, so returning users do not start cold.
- Guest profile and signed-in mini profile are modal overlays rendered by `MapModalOrchestrator`, not sheet phases.

Decision:

- Keep mini profile separate from Choose Care and service selection.
- Keep guest auth lightweight and map-scoped.
- Do not expose profile completion as a blocking step before emergency or Explore Care use.

Risk if merged into service flow:

- Emergency intent can be blocked by account administration.
- Guest conversion can feel like a hard gate instead of a supportive shortcut.
- Top-left control semantics can become inconsistent across decision phases.

### 6. Ambulance Flow Is Already Adaptive

Actual flow:

`Explore Intent or Choose Care -> Ambulance Decision -> Commit Details or Commit Payment -> Tracking`

Important behavior:

- If the user already has valid email and phone, `useMapDecisionHandlers` skips `COMMIT_DETAILS` and opens `COMMIT_PAYMENT`.
- `MapAmbulanceDecisionStageBase` has a HALF/EXPANDED model with service choice, route card, pickup change, more details, and hospital browsing.
- `useMapCommitFlow` preserves commit restoration across remounts.

Decision:

- Do not merge ambulance decision with commit phases.
- Improve perceived continuity through copy, progress, and loading feedback.
- Preserve contact-skip behavior.

### 7. Bed Flow Mirrors Ambulance With Room-Specific Logic

Actual flow:

`Explore Intent or Choose Care -> Bed Decision -> Commit Details or Commit Payment -> Tracking`

Important behavior:

- The bed sheet selects a room service, not just a hospital.
- The flow can skip contact details when the user identity is already sufficient.
- The bed sheet has route context and expanded detail sections.

Decision:

- Keep bed as a separate decision sheet.
- Do not collapse room selection into a generic emergency confirm sheet.
- Improve the language around room availability and commitment.

### 8. Ambulance + Bed Is Sequential By Design

Actual flow:

`Explore Intent or Choose Care -> Ambulance Decision -> Bed Decision -> Commit Details or Commit Payment -> Tracking`

Important behavior:

- Ambulance selection stores `savedTransport`.
- Bed decision receives `savedTransport`.
- If the user changes hospitals during paired bed selection, the saved transport can be invalidated and the flow returns to ambulance selection for that hospital.
- `MapBedDecisionStageBase` already renders saved transport differently in HALF and EXPANDED snap states.

Decision:

- Do not replace this with a single combined sheet yet.
- Make the sequential nature more obvious:
  - Step 1: transport
  - Step 2: bed
  - Then payment and tracking
- Keep saved transport visible as confirmation, not clutter.

Risk if collapsed too early:

- Hospital-scoped ambulance pricing can become stale.
- Saved transport invalidation can be lost.
- Combined checkout edge cases become harder to reason about.

### 9. Commit Details, Triage, and Payment Are Not Just UI Steps

Commit phases own real runtime responsibilities:

- `COMMIT_DETAILS`
  - Email
  - OTP
  - Phone validation
  - Contact input memory
  - Commit flow persistence

- `COMMIT_TRIAGE`
  - Deterministic triage steps
  - Optional skip paths
  - Live triage snapshot updates
  - Active trip and pending approval patching
  - Copilot prompt integration when enabled

- `COMMIT_PAYMENT`
  - Cost loading
  - Payment method selection
  - Wallet/cash/card eligibility
  - Payment intent handling
  - Cash approval wait state
  - Emergency request creation
  - Request completion handoff to tracking

Decision:

- Do not physically merge these controllers now.
- Make them feel like one guided "prepare request" journey through copy and progress.
- Keep the internal phases because they protect reliability.

### 10. Explore Care Provider Flow Is Already Simple

Actual flow:

`Choose Care category -> Provider List -> Provider Detail`

Important behavior:

- Provider list is expanded-only.
- It uses skeleton loading, sort/filter rail, provider buckets, provider selection state, and category identity.
- Provider detail enriches Google-only rows when needed.
- The flow stays inside the map-sheet runtime.

Decision:

- Do not simplify this flow now.
- Focus on data quality, global coverage, map focus, and provider autoselect regression.
- Keep Explore Care distinct from emergency dispatch.

### 11. Book Visit Is the Main Consistency Gap

Actual flow:

`Choose Care -> /(user)/(stacks)/book-visit`

This is a bridge out of the map-sheet runtime. It may be acceptable short term, but it is the one service that does not match the newer map-sheet model.

Decision:

- Keep as-is for near-term safety.
- Plan a later pass to bring Book Visit into the map-sheet runtime:
  - Choose visit type
  - Provider list
  - Provider detail
  - Schedule/confirm

## Current User-Facing Service Inventory

From Welcome:

- 1 primary service entry: continue into emergency/map help.

From Explore Intent:

- Ambulance
- Bed space
- Compare / ambulance + bed
- Search and nearby hospital browsing
- Location management
- Mini profile / guest profile
- Recents/history access
- Location/profile support

From Choose Care:

- Ambulance
- Bed space
- Ambulance + bed
- Book a visit, when signed in
- Pharmacies
- Urgent care
- Clinics
- Labs
- Radiology
- Mental health
- Women's care
- Pediatrics

Backend/provider taxonomy includes:

- Hospital
- Pharmacy
- Lab
- Radiology
- Urgent care
- Clinic
- Mental health
- Women's care
- Pediatrics

## Recommended Passes

### Pass 0: Documentation And Baseline

Status: In progress
Risk: Low

Goals:

- Lock the actual service flows.
- Prevent hasty simplification that deletes useful runtime behavior.
- Establish pass order and rollback logic.
- Maintain the baseline flow matrix in `IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md`.

Verification:

- Confirm all flow paths above match source files.
- Link this document from `docs/audit/map/README.md` and `docs/INDEX.md`.
- Keep the baseline matrix current as implementation passes begin.

Rollback:

- Documentation-only. Remove this doc and index links.

### Pass 1: Choose Care Naming Cleanup

Risk: Low to medium

Problem:

- `MapChooseCareModal` is now the service picker; `MapCareHistoryModal` remains only as a compatibility re-export.

Proposed change:

- Rename `MapCareHistoryModal` to `MapChooseCareModal`.
- Rename related props where safe:
  - `careHistoryVisible` -> `chooseCareVisible`
  - `setCareHistoryVisible` -> `setChooseCareVisible`
- Keep backwards-compatible names only where churn would be too large.

Files likely touched:

- `components/map/MapChooseCareModal.jsx`
- `components/map/MapCareHistoryModal.jsx` compatibility re-export
- `components/map/MapModalOrchestrator.jsx`
- `hooks/map/state/mapExploreFlow.store.js`
- `hooks/map/history/useMapHistoryFlow.js`
- `hooks/map/useMapRouteHandlers.js`

Acceptance checks:

- Choose Care opens expanded.
- Emergency blades still work.
- Explore Care category taps still open `PROVIDER_LIST`.
- History and recent visits still open their own surfaces.

Rollback:

- Revert the rename commit only. No schema or runtime state migration needed.

### Pass 2: Ambulance + Bed Narrative Polish

Risk: Low

Problem:

- The flow is sequential by design, but users may not understand why they see ambulance first, then bed.

Proposed change:

- Strengthen step copy in ambulance and bed decision sheets.
- Keep the `savedTransport` strip/card but make it read as confirmation.
- Make the footer CTA labels match the sequence:
  - Ambulance step: "Continue to bed"
  - Bed step: "Continue to payment"
- Preserve current routing and saved transport payloads.

Files likely touched:

- `components/map/views/ambulanceDecision/mapAmbulanceDecision.content.js`
- `components/map/views/ambulanceDecision/MapAmbulanceDecisionStageBase.jsx`
- `components/map/views/bedDecision/mapBedDecision.content.js`
- `components/map/views/bedDecision/MapBedDecisionStageBase.jsx`
- `components/map/views/bedDecision/MapBedDecisionStageParts.jsx`

Acceptance checks:

- Ambulance-only flow still says dispatch, not bed.
- Bed-only flow still says bed/room, not transport.
- Combined flow displays step 1 and step 2 correctly.
- Changing hospital during paired flow still invalidates saved transport when needed.

Rollback:

- Revert copy and view-only changes. No data impact.

### Pass 3: Location Management Simplification Audit

Risk: Medium

Problem:

- Location Intent is a full subsystem, but users should perceive it as one simple pickup-location flow.

Proposed change:

- Do not remove modes.
- Audit the visible labels and CTA hierarchy across:
  - device location
  - search
  - manual entry
  - saved places
  - recents
  - candidate confirmation
  - save/manage
- Make sure every entry path explains whether the user is changing pickup for browsing, ambulance, bed, or payment.
- Keep source-return payloads untouched.

Files likely touched:

- `components/map/views/locationIntent/*`
- `hooks/map/exploreFlow/useMapLocation.js`
- `hooks/map/exploreFlow/useMapLocationIntent.js`
- `hooks/map/locationIntent/*`

Acceptance checks:

- Location-off terminal state opens Location Intent once.
- Manual address cannot commit without valid coordinates.
- Search result selection returns to the correct source phase.
- Change pickup from ambulance returns to ambulance decision.
- Change pickup from bed returns to bed decision.
- Change pickup from payment returns to payment.
- Saved and recent places commit valid coordinates.
- Android manual entry/search stays expanded while keyboard is open.
- Billing country updates after manual/device location changes.

Rollback:

- Revert copy/layout changes only.
- Do not revert coordinate validation or Android keyboard hardening.

### Pass 4: Mini Profile And Guest Auth Audit

Risk: Low to medium

Problem:

- Profile surfaces are support flows, but they are part of the visible map experience and can affect perceived complexity.

Proposed change:

- Confirm top-left control behavior by phase.
- Keep guest auth map-scoped and profile-completion-deferred.
- Ensure MiniProfileModal location shortcut opens Location Intent, not a route.
- Keep Recent Visits available from profile without competing with Choose Care.

Files likely touched:

- `components/map/MapGuestProfileModal.jsx`
- `components/map/MapModalOrchestrator.jsx`
- `components/map/views/shared/MapTopLeftControl.jsx`
- `components/emergency/MiniProfileModal.jsx`
- `hooks/map/shell/useMapShell.js`

Acceptance checks:

- Guest Explore Intent top-left goes back to Welcome.
- Signed-in Explore Intent top-left opens mini profile/avatar.
- Decision phases show back behavior, not profile.
- Commit/tracking do not expose distracting profile controls.
- Guest email OTP and Google auth still return to map.
- Deferred profile completion remains enabled for urgent flows.

Rollback:

- Revert modal/control presentation changes only.
- Do not roll back auth service behavior unless auth verification fails.

### Pass 5: Guided Commit Presentation

Risk: Medium

Problem:

- Commit details, triage, and payment are separate internal phases with real responsibilities. But the user should feel one coherent request-preparation flow.

Proposed change:

- Add consistent progress language:
  - Contact
  - Health details
  - Payment
- Avoid merging controllers.
- Add lightweight status continuity between steps.
- Make back behavior predictable and clearly tied to the prior service decision.

Files likely touched:

- `components/map/views/commitDetails/*`
- `components/map/views/commitTriage/*`
- `components/map/views/commitPayment/*`
- `hooks/map/exploreFlow/useMapCommitFlow.js`
- `hooks/map/decision/useMapDecisionHandlers.js`

Acceptance checks:

- Existing contact skip still works.
- OTP flow still persists across remount.
- Triage live-save still works for active request updates.
- Payment method selection still persists during the payment sheet lifecycle.
- Payment success still always opens tracking.

Rollback:

- Revert presentation changes only.
- Do not roll back controller persistence or payment state fixes.

### Pass 6: Explore Care Regression Hardening

Risk: Medium

Problem:

- Explore Care is already simple at the flow level, but it is a new subsystem and must be trusted globally.

Proposed change:

- Keep `Provider List -> Provider Detail`.
- Verify provider autoselect behavior.
- Verify map focus does not fight emergency hospital focus.
- Verify no provider category pollutes emergency hospital discovery.
- Verify global provider search with Google enabled and Mapbox fallback.

Files likely touched:

- `components/map/views/providerList/*`
- `components/map/views/providerDetail/*`
- `hooks/emergency/useNearbyProviders.js`
- `services/hospitalsService.js`
- `supabase/functions/discovery/discover-hospitals/index.ts`
- `supabase/functions/_shared/domain/providers/*`

Acceptance checks:

- Hemet provider matrix returns meaningful results.
- Lagos/Festac provider matrix returns meaningful results.
- At least one non-US, non-Nigeria smoke location is tested.
- Provider list autoselects nearest provider where expected.
- Provider detail map focuses selected provider.
- Emergency hospital list remains hospital-only.

Rollback:

- Revert Explore Care client changes independently from edge discovery shared helpers where possible.
- If edge discovery regresses, deploy prior known-good `discover-hospitals` function from the rollback runbook.

### Pass 7: Book Visit Map-Sheet Design

Risk: Medium to high

Problem:

- Book Visit exits to a stack route from Choose Care. This is the least consistent service entry.

Proposed change:

- Design before implementation.
- Define whether Book Visit reuses `PROVIDER_LIST` and `PROVIDER_DETAIL` or needs dedicated booking phases.
- Keep the existing stack route until the sheet replacement is complete.

Potential future flow:

`Choose Care -> Book Visit -> Provider List -> Provider Detail -> Schedule -> Confirm`

Acceptance checks:

- Existing Book Visit route remains functional.
- Signed-in requirement remains explicit.
- No emergency dispatch state is created.
- Schedule state survives sheet collapse/remount.

Rollback:

- Keep route bridge until the replacement is complete.
- Feature flag any new sheet booking lane.

### Pass 8: Optional Architecture Consolidation

Risk: High

Problem:

- After UX polish, there may still be duplicated stage patterns between ambulance, bed, commit, and provider sheets.

Proposed change:

- Only after passes 1-5 are stable, consider shared stage primitives.
- Do not merge business controllers unless tests prove parity.

Acceptance checks:

- No change to user-visible behavior.
- No payment/tracking regression.
- No provider discovery regression.

Rollback:

- One commit per extraction.
- Keep public sheet phases stable.

## Risk Register

| Risk | Severity | Notes | Mitigation |
| --- | --- | --- | --- |
| Renaming Choose Care breaks imports | Medium | Component name is referenced by modal orchestrator and docs | Use `rg`, small commit, smoke test modal open |
| Combined ambulance + bed loses saved transport truth | High | Transport is hospital-scoped | Do not collapse phases in first pass |
| Contact skip breaks payment continuity | High | Valid email/phone currently opens payment directly | Preserve `useMapDecisionHandlers` branch |
| Location source-return contracts regress | High | Pickup changes can originate from decision/payment phases | Do not alter payload/sourcePhase behavior during UX pass |
| Manual location accepts invalid coordinates | High | Provider discovery and dispatch depend on coordinates | Preserve coordinate validation and candidate guards |
| Android location search/manual sheet collapses on keyboard | Medium | Existing code has explicit keyboard hardening | Keep expanded-mode snap locks |
| Profile/auth blocks urgent flow | High | Guest auth defers profile completion today | Preserve deferred profile completion |
| Commit controller merge breaks OTP/triage/payment | High | Controllers own real runtime state | Presentation-only pass first |
| Explore Care provider list loses autoselect | Medium | Recent suspected regression | Add explicit test/manual QA |
| Book Visit map-sheet rebuild creates duplicate booking state | Medium | Existing stack route has its own lifecycle | Design and feature flag first |
| Welcome becomes too broad | Medium | First-run emergency clarity is a product advantage | Keep Welcome narrow |

## Regression Checklist

- Welcome still has one obvious primary action.
- Explore Intent emergency actions still work.
- Choose Care opens expanded.
- Location unavailable opens Location Intent.
- Location search/manual/saved/recents all commit valid pickup coordinates.
- Location changes return to the correct source phase.
- Top-left control opens profile only when it should.
- Guest profile auth returns to map and does not force profile completion.
- Ambulance opens `AMBULANCE_DECISION`.
- Bed opens `BED_DECISION`.
- Ambulance + bed opens ambulance first, then bed with saved transport.
- Contact details are skipped when user email and phone are valid.
- Contact details are shown when identity is incomplete.
- Payment method selection does not collapse/reset unexpectedly.
- Payment success enters tracking.
- Tracking preserves active trip state after reload.
- Provider category opens `PROVIDER_LIST`.
- Provider tap opens `PROVIDER_DETAIL`.
- Provider list autoselect/map focus works.
- Emergency hospital discovery remains separate from Explore Care.
- Book Visit route bridge still works.

## Decision Summary

The recommended fix is feasible, but the first implementation should be perceived-simplicity work, not deep controller consolidation.

Proceed with:

1. Documentation baseline.
2. Choose Care naming cleanup.
3. Ambulance + bed narrative polish.
4. Location management simplification audit.
5. Mini profile and guest auth audit.
6. Guided commit presentation.
7. Explore Care hardening.
8. Book Visit map-sheet design.

Do not proceed yet with:

- Merging ambulance and bed decision sheets.
- Merging commit details, triage, and payment controllers.
- Flattening Location Intent modes into one component state.
- Making profile completion mandatory before urgent map use.
- Exposing the entire care catalog on Welcome.
