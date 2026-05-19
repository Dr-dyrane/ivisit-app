# iVisit Phase 0 To Phase 7 Product UX Simplification Plan

Date: 2026-05-19
Status: Planning / execution contract
Scope: Welcome, map-sheet service UX, Choose Care, emergency flows, location, profile/auth, Explore Care, commit flow, Book Visit

## Purpose

This plan is the working execution contract for simplifying iVisit's visible experience without removing the runtime machinery that makes the app safe.

The product should feel like:

```text
I know where I am -> I choose what I need -> iVisit prepares the request -> I confirm/payment -> I track or view care
```

Internally, iVisit still needs:

- location truth
- provider discovery
- identity/auth
- contact details
- triage
- payment
- realtime approvals
- tracking
- saved places
- profile/support flows

The goal is calm orchestration, not flattening.

## Source Documents

- `docs/audit/map/IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md`
- `docs/audit/map/IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md`
- `docs/architecture/refactoring/EDGE_FUNCTION_PHASE_8_ARCHITECTURE_CONSOLIDATION_PLAN_2026-05-19.md`
- `docs/REFACTORING_GUARDRAILS.md`
- `docs/architecture/ux/UX_ISSUES_SUBPASS_PLAN_2026-05-10.md`
- `docs/architecture/ux/passes/UX_E_LOCATION_SHEET.md`
- `docs/flows/emergency/architecture/explore-care/passes/README.md`
- `docs/flows/emergency/architecture/contact-dispatch/passes/README.md`

## Non-Negotiables

- Do not expose all services on Welcome.
- Do not merge ambulance and bed runtime phases in this plan.
- Do not merge commit controllers.
- Do not simplify Location Intent by removing modes.
- Do not move Book Visit into map sheets until the earlier phases are stable.
- Do not let provider discovery pollute emergency hospital discovery.
- Do not move responsibility into `MapScreen` when an owning hook/module already exists.
- Every phase must update docs, changed files, verification, and rollback notes.

## Phase Tracker

This table is the living checkpoint ledger. Update it before starting a phase, after finishing a phase, and whenever verification or rollback notes change.

| Phase | Status | Owner surfaces | Started | Finished | Verification | Rollback notes |
| --- | --- | --- | --- | --- | --- | --- |
| Phase 0: Baseline Current Experience | Static audit complete; runtime smoke pending | `docs/audit/map/*`, `MapScreen`, map sheet navigation, provider markers | 2026-05-19 | 2026-05-19 | `git diff --check`; targeted source audit; provider selection identity fix | Revert docs, top-left navigation-hook consolidation, or provider selection identity fix if regression appears |
| Phase 1: Define Product Lanes | Static audit complete; copy aligned | Welcome, Explore Intent, Choose Care copy/docs | 2026-05-19 | 2026-05-19 | Welcome one-action check; Explore emergency-first check; Choose Care lane labels aligned | Revert `MapChooseCareModal` label copy only |
| Phase 2: Fix Naming And Ownership | Static audit complete; compatibility alias kept | Choose Care modal, history modal, profile/auth overlays, sheet navigation owners | 2026-05-19 | 2026-05-19 | `rg` import sweep; Choose Care implementation moved to `MapChooseCareModal`; compatibility re-export kept | Revert `MapModalOrchestrator` import and `MapChooseCareModal` move if component resolution regresses |
| Phase 3: Improve Emergency Storytelling | Static copy alignment complete; runtime smoke pending | Ambulance decision, bed decision, service detail, combined ambulance+bed flow | 2026-05-19 | 2026-05-19 | `git diff --check`; combined ambulance+bed subtitles owned by copy constants; saved transport card preserved | Revert ambulance/bed decision copy and stage-base subtitle changes only |
| Phase 4: Treat Location As First-Class | Static UX ownership pass complete; runtime smoke pending | `LOCATION_INTENT`, location hooks, mini profile location entry, payment pickup entry | 2026-05-19 | 2026-05-19 | `git diff --check`; source-return call sites audited; default choices relabeled | Revert `mapLocationIntent.model.js` copy changes only; preserve source payload contracts |
| Phase 5: Explore Care Data Hardening | Edge smoke complete; Google decision recorded; runtime UI smoke pending | Provider list/detail, provider markers, provider discovery adapter, edge smoke matrix | 2026-05-19 | 2026-05-19 | `npm run hardening:edge-smoke` passed 81/81 with Google+Mapbox; `npm run hardening:edge-smoke -- --no-google` failed Tokyo/radiology | Disable Google Places flag if cost/failure risk appears; preserve DB/Mapbox fallback knowing global richness degrades |
| Phase 6: Make Commit Feel Like One Guided Request | Static copy alignment complete; runtime smoke pending | Commit details, triage, payment, tracking handoff | 2026-05-19 | 2026-05-19 | `git diff --check`; contact/health/payment labels aligned; handlers untouched | Revert commit content copy files only; use edge/payment runbook if payment behavior changes |
| Phase 7: Book Visit Integration | Planned | Choose Care Book Visit bridge, Book Visit stack, future sheet design | - | - | Route bridge closes Choose Care; state isolation check | Keep existing route bridge as fallback; feature-flag sheet integration |
| Phase 8: Edge Architecture Consolidation | Planned separately | Supabase Edge Functions and shared helpers | - | - | See Phase 8 plan | See edge rollback runbook and Phase 8 plan |

## Phase 0: Baseline Current Experience

Goal: freeze the truth before changing more UX.

Baseline these flows:

- Welcome -> Map
- Explore Intent -> Ambulance
- Explore Intent -> Bed
- Explore Intent -> Ambulance + Bed
- Choose Care -> Emergency options
- Choose Care -> Explore Care category
- Choose Care -> Book Visit
- Location unavailable -> Location Intent
- Change pickup from Ambulance Decision
- Change pickup from Bed Decision
- Change pickup from Payment
- Guest profile -> OTP/Google -> return to map
- Signed-in avatar -> Mini Profile -> Recent Visits / Location
- Provider List -> Provider Detail
- Payment -> Tracking

Deliverables:

- Flow truth table: entry, sheets/screens, state touched, return behavior, risks.
- Ownership map for each flow.
- Regression checklist.

Current artifacts:

- `docs/audit/map/IVISIT_SERVICE_FLOW_BASELINE_MATRIX_2026-05-19.md`
- `docs/audit/map/IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md`

Gate:

- Top-left/back ownership checked.
- Provider autoselect identity checked across sheet, map focus, and markers.
- Mini profile location return checked by source payload.
- Payment location return checked by source payload.
- Book Visit bridge checked for modal close before route push.
- `git diff --check`.

Phase 0 verification notes:

- `MapTopLeftControl` is rendered once from `MapScreen`; authenticated decision back now delegates to `closeDecisionPhase` in `useMapSheetNavigation`.
- Provider autoselect uses `getProviderSelectionId(provider)` and now shares the same identity fallback for selected provider focus and provider marker selection.
- `MiniProfileModal` calls `onOpenLocationIntent({ sourcePhase: "miniProfile" })`; `MapScreen` handles that return by reopening `MiniProfileModal`.
- `MapCommitPayment` location search passes `sourcePhase: MAP_SHEET_PHASES.COMMIT_PAYMENT` plus the current `sheetPayload`; `MapScreen` restores that payload when Location Intent closes.
- `handleBookVisitFromCare` calls `setCareHistoryVisible(false)` before pushing `/(user)/(stacks)/book-visit`.

Rollback:

- Revert only baseline docs or small bug fixes from the phase.

## Phase 1: Define Product Lanes

Goal: make iVisit mentally simple without deleting real capabilities.

Visible lanes:

1. Emergency Now
   - Ambulance
   - Bed space
   - Ambulance + bed

2. Explore Care
   - Pharmacy
   - Labs
   - Radiology
   - Urgent care
   - Clinics
   - Mental health
   - Women's care
   - Pediatrics

3. Location
   - Use device location
   - Search
   - Saved places
   - Recents
   - Manual address

4. Account
   - Guest sign-in
   - Mini profile
   - Recent visits
   - Sign out
   - Profile support

Implementation shape:

- Product-language documentation first.
- No runtime behavior change unless a mismatch is found.
- Update copy only after checking actual screen owners.

Phase 1 verification notes:

- Welcome remains narrow: `Get help now` with one `Continue` intent.
- Explore Intent keeps emergency actions first under `Choose care`.
- Choose Care modal now names lanes as `Emergency now` and `Explore care`, matching this plan's product lanes.

Gate:

- Welcome still has one obvious primary action.
- Explore Intent still keeps emergency actions first.
- Choose Care remains the broader service picker.

Rollback:

- Revert copy/classification changes only.

## Phase 2: Fix Naming And Ownership

Goal: remove conceptual confusion that causes implementation mistakes.

Planned changes:

- Rename or alias `MapCareHistoryModal` conceptually toward Choose Care.
- Keep history in `MapHistoryModal`.
- Keep signed-in profile in `MiniProfileModal`.
- Keep guest auth in `MapGuestProfileModal`.
- Keep location in `LOCATION_INTENT`.

Ownership checks:

- `MapScreen` should orchestrate, not own duplicated phase logic.
- `useMapSheetNavigation` owns sheet open/close contracts.
- `MapModalOrchestrator` owns modal rendering.
- Location source-return belongs to the Location Intent contract.

Phase 2 verification notes:

- The real Choose Care implementation now lives in `components/map/MapChooseCareModal.jsx`.
- `components/map/MapCareHistoryModal.jsx` remains as a compatibility re-export for historical docs/imports.
- `MapModalOrchestrator` imports and renders `MapChooseCareModal`.
- `careHistoryVisible` and `setCareHistoryVisible` remain unchanged for now because they are map-store state keys with broader blast radius.

Gate:

- `rg` confirms no stale component import loss.
- Choose Care opens expanded.
- Emergency and Explore Care entries still work.
- No duplicate back/close ownership introduced.

Rollback:

- Restore old component filename/imports if rename causes churn.
- Keep a compatibility re-export during transition if needed.

## Phase 3: Improve Emergency Storytelling

Goal: make emergency flows feel simple while keeping correct runtime separation.

User stories:

- Ambulance:
  `Choose ambulance -> confirm contact/payment -> tracking`

- Bed:
  `Choose bed -> confirm contact/payment -> tracking`

- Ambulance + bed:
  `Step 1: choose transport -> Step 2: choose bed -> payment -> tracking`

Implementation focus:

- Headings, step labels, CTA copy, progress language.
- Explain combined flow as a guided request.
- Preserve saved transport truth.
- Preserve hospital-scoped service selection and pricing.

Implemented static pass:

- Combined ambulance + bed flow now labels the ambulance decision as `Step 1 of 2 - choose transport`.
- Combined ambulance + bed flow now labels the bed decision as `Step 2 of 2 - choose bed`.
- Saved transport confirmation remains a separate bed-stage card, so the second step still shows that transport was already selected.
- Decision handlers, service selection, pricing, and saved transport state were not changed.

Do not:

- Merge ambulance and bed phases.
- Collapse service detail into payment.
- Remove contact skip logic.

Gate:

- Ambulance-only completes to tracking.
- Bed-only completes to tracking/active bed state.
- Ambulance + bed preserves selected transport before bed.
- Changing hospital invalidates hospital-scoped saved transport correctly.

Rollback:

- Revert copy/presentation files.
- Keep decision handlers untouched unless explicitly changed and verified.

## Phase 4: Treat Location As A First-Class Flow

Goal: make location feel like one simple pickup flow while preserving its full safety role.

Visible choices:

- Use current location
- Search address
- Saved places
- Recent places
- Enter manually

Implemented static pass:

- Confirmed `LOCATION_INTENT` is the single sheet owner for pickup selection, search, manual entry, saved places, recents, candidate confirmation, pin adjust, and save flows.
- Confirmed ambulance decision, bed decision, and payment open Location Intent with `sourcePhase`, `sourceSnapState`, and `sourcePayload` instead of duplicating pickup UI.
- Confirmed mini profile uses `sourcePhase: "miniProfile"` and reopens the profile modal after Location Intent closes.
- Renamed default visible sections from generic `Places` / `Recents` / `Can't find it?` to `Saved places` / `Recent places` / `Enter manually`.
- Reducer modes, manual coordinate validation flow, saved place handlers, and return payload contracts were not changed.

Runtime responsibilities to preserve:

- source-return from ambulance decision
- source-return from bed decision
- source-return from payment
- source-return from mini profile
- coordinate validation
- candidate confirmation
- Android keyboard hardening
- saved/recent place integrity

Gate:

- Manual address cannot commit without valid coordinates.
- Location unavailable has a clear fallback.
- MiniProfile -> Address & Location -> close returns to MiniProfile.
- Payment -> change pickup -> return preserves payment method/cost.
- Large/old GPS accuracy warnings do not block unnecessarily.

Rollback:

- Revert only Location Intent presentation changes.
- Do not remove validation or source payload contracts.

## Phase 5: Explore Care Data Hardening

Goal: keep Explore Care UX simple and make provider results globally trustworthy.

UX stays:

```text
Category -> Provider List -> Provider Detail
```

Hardening focus:

- provider autoselect
- global coverage
- category cleanliness
- Google cost guardrails
- provider/hospital separation
- fallback data when live provider APIs are weak
- no blank provider list when fallback data exists

Implemented audit pass:

- Provider list/detail identity was repaired earlier in Phase 0 so auto-select, card selection, marker selection, and map focus can use provider fallback identity (`id`, `placeId`, then `name`).
- The global edge smoke matrix passed with Google + Mapbox enabled across 9 locations and 9 categories: Hemet, Festac, London, Nairobi, Dubai, Delhi, Tokyo, Sao Paulo, and Sydney.
- The no-Google smoke matrix failed `tokyo/radiology` with 0 results and showed thin fallback counts in several categories, confirming Google is required for real and rich global Explore Care.
- Decision: Google Places stays enabled for Explore Care provider discovery, gated by environment flags and query keys; Mapbox/database remain cost-safe fallback lanes.
- Emergency hospital discovery must remain separated from Explore Care provider discovery; Explore Care provider results must not become emergency dispatch candidates unless they pass emergency eligibility rules.

Known global smoke locations:

- Hemet, United States
- Festac, Lagos, Nigeria
- London, United Kingdom
- Nairobi, Kenya
- Dubai, United Arab Emirates
- Delhi, India
- Tokyo, Japan
- Sao Paulo, Brazil
- Sydney, Australia

Gate:

- `npm run hardening:edge-smoke`
- Provider category switching autoselects nearest valid provider.
- Providers and hospitals do not coexist as active marker sets.
- Google on/off behavior is understood.
- Cost-sensitive APIs stay flag-gated.

Rollback:

- Disable Google Places via env flag if cost or failure risk appears.
- Preserve Mapbox/database fallback path.

## Phase 6: Make Commit Feel Like One Guided Request

Goal: make contact, triage, and payment feel like one coherent request-preparation flow.

Visible story:

```text
Contact -> Health details -> Payment
```

Runtime phases remain:

- `COMMIT_DETAILS`
- `COMMIT_TRIAGE`
- `COMMIT_PAYMENT`

Implementation focus:

- progress language
- continuity between phases
- back behavior
- payment finalizing feedback
- tracking handoff clarity

Implemented static pass:

- Contact steps now read as contact surfaces: `Contact email`, `Contact code`, and `Contact phone`.
- Triage now reads as `Health details` instead of a generic quick check.
- Payment CTA now reads as `Confirm request`, so bed-only and combined flows are not forced into ambulance-only dispatch language.
- Payment finalizing copy now says the request is being confirmed, not only dispatch.
- Commit controllers, persistence, payment validation, and tracking handoff logic were not changed.

Do not:

- Merge controllers.
- Remove contact skip.
- Change payment mutation order without payment tests.
- Let tracking depend on remount.

Gate:

- Valid email/phone can skip details.
- Triage update from tracking does not create a new request.
- Payment success always opens tracking.
- App reload/app kill preserves active trip progress.
- Realtime approval/reassignment still syncs.

Rollback:

- Revert presentation files first.
- If payment behavior changes, rollback using edge/payment verification and deployment runbook.

## Phase 7: Book Visit Integration

Goal: make Book Visit feel like part of iVisit without destabilizing emergency/location/explore.

Current state:

- Choose Care routes to `/(user)/(stacks)/book-visit`.
- This is acceptable until map-sheet booking is designed.

Future target:

```text
Choose Care -> Book Visit -> Provider List -> Provider Detail -> Schedule -> Confirm
```

Phase 7 should begin only after:

- emergency storytelling is stable
- location return contracts are stable
- Explore Care provider list/detail are stable
- commit flow presentation is stable

Gate:

- Existing route bridge still closes Choose Care before route push.
- Book Visit does not steal emergency/provider state.
- Any sheet design has a separate baseline and rollback path.

Rollback:

- Keep legacy route bridge as the fallback.
- Feature flag any new sheet integration until verified.

## Verification Bundle

At minimum after each behavior-changing phase:

```bash
git diff --check
```

For provider/backend-sensitive changes:

```bash
npm run hardening:edge-smoke
npm run hardening:chat-rls
npm run hardening:emergency
```

For payment-sensitive changes:

```bash
npm run hardening:edge-payments
```

For broad runtime confidence:

```bash
npm run hardening:emergency-runtime-confidence
npm run hardening:visits-runtime-confidence
```

If a check is blocked by existing project issues, record the blocker and run the most targeted available script.

## Relationship To Phase 8

Phase 8 architecture consolidation comes after Phase 0 to Phase 7 have stabilized the product flows. Phase 8 is backend/internal architecture work and should not be used to hide unfinished product-flow decisions.

Provider discovery is the bridge between Phase 5 and Phase 8. It should only enter Phase 8 modularization after Phase 5 Explore Care hardening is green.
