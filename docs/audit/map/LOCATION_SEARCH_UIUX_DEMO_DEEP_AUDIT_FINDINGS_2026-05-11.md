---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Location, Search, UI/UX, And Demo Hospital Deep Audit Findings

**Date:** 2026-05-11  
**Branch audited:** `feature/ux-fixes`  
**Baseline:** `main` at `ad04cc5 docs: add UX Issues pass plan and Demo Bootstrap audit docs`  
**Audit type:** static implementation audit of committed branch work plus current unstaged docs/location changes  
**Runtime status:** not device-tested in this pass

---

## Executive Verdict

The last 24 hour work moved the product in the right direction visually and architecturally, but the implementation is not yet production-tight.

The LocationSheet is now closer to the intended iVisit model: one location owner, a candidate decision loop, manual guided input, saved places, recents, and the mini-profile entry point. The UX-A through UX-E passes also corrected important hierarchy issues in payment, room, transport, location, and demo flows.

However, the branch has crossed from UI repair into core product architecture. That means the next step must be stabilization, not more surface work. The largest risks are:

- saved address persistence can appear successful while never reaching the server,
- saved location bootstrap is not safely keyed to the active authenticated user,
- demo hospital owner filtering may reject the user's own demo rows because the query omits the owner field,
- manual address fallback still blocks instead of naturally moving to confirm-pin recovery,
- search and manual search now use different data-fetch patterns,
- LocationSheet orchestration is concentrated in very large files,
- stale demo docs still mark implemented passes as planned,
- several comments still violate the repo's ASCII default.

The UI is improved. The implementation needs a hardening pass before more feature expansion.

---

## 2026-05-11 Fix Status Update

This audit remains useful as the baseline risk map, but several critical findings have now been addressed in the follow-up Codex/Cascade stabilization pass:

- Finding 1 addressed: saved address save/update/remove actions now await `forceSyncSavedLocations()` before final success, and server sync now merges existing `view_preferences` through an upsert path.
- Finding 2 addressed: saved location bootstrap is keyed by authenticated `user.id`; runtime sync state resets on auth changes and saved locations are cleared on logout.
- Finding 3 addressed: `matchesDemoOwner()` now accepts camelCase, snake_case, feature tags, and `demo:<ownerSlug>:` place_id ownership hints.
- Finding 4 addressed: manual no-exact-match now attempts a low-confidence geography fallback before blocking the user.
- Finding 7 partially addressed: `docs/audit/demo/README.md` now marks the client coverage gate as implemented and keeps server/DB remediation as planned.
- Finding 8 addressed in touched files: mojibake and non-ASCII artifacts were removed from the coordination doc and touched location hook/sheet files.

Remaining open items from this audit:

- Search unification remains open: `SearchContext.jsx` still has its own Mapbox debounce path.
- `MapLocationIntentStageBase.jsx` is now under 700 lines after manual and candidate handler extraction; remaining reduction work should focus on render-only decomposition and search unification.
- Runtime/device testing is still required by the user-owned QA pass.

---

## Scope Inventory

### Branch Size

`main..feature/ux-fixes` changes 73 files with roughly 9,045 insertions and 997 deletions across location, search, emergency UX, payment, demo bootstrap, saved locations, and docs.

Largest location-related files after the pass:

| File | Lines | Risk |
| --- | ---: | --- |
| `components/map/views/locationIntent/MapLocationIntentStageBase.jsx` | 1091 | Too much orchestration in one render owner |
| `components/map/views/locationIntent/MapLocationIntentStageParts.jsx` | 850 | Large mixed presentation/data-composition component |
| `components/map/views/locationIntent/mapLocationIntent.styles.js` | 546 | Style surface becoming hard to reason about |
| `components/map/views/locationIntent/ManualStepActiveField.jsx` | 457 | Borderline large for one field component |
| `components/map/views/locationIntent/mapLocationIntent.helpers.js` | 429 | Decision trees and formatting mixed together |
| `components/map/views/locationIntent/MapLocationIntentCandidatePanel.jsx` | 361 | Acceptable only if it does not grow further |

### Current Unstaged Changes

At audit time, the working tree also had one code file modified:

- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx`

Docs updated in the previous documentation pass were also unstaged.

---

## Critical Findings

### 1. Saved Address Persistence Can Report Success Before Server Persistence

**Severity:** Critical  
**Area:** saved address CRUD, user identity, rollback safety

**Evidence**

- `hooks/map/locationIntent/useSavedAddressActions.js:78-128`
- `services/savedLocationsSyncService.js:46-63`
- `services/savedLocationsSyncService.js:198-200`

`useSavedAddressActions.save()` calls Zustand `addSavedLocation` or `updateSavedLocation`, dispatches `SAVE_SUCCESS`, and sets feedback immediately. It does not await `forceSyncSavedLocations()`, does not inspect sync status, and does not surface remote persistence errors.

`syncToServer()` uses:

```js
supabase.from("preferences").update(...).eq("user_id", user.id)
```

This silently depends on an existing `preferences` row. If the row does not exist, the update can affect no rows and still leave the UI believing the save succeeded.

**User Impact**

A user can save Home, Work, or a responder note, see success, return later, and lose it. In emergency context, this is a trust break.

**Psychological Impact**

Address management is identity-level data. If the app says "Saved" and later forgets the address, the user stops trusting the entire emergency flow.

**Root Cause**

The architecture says L2/TanStack/server persistence matters, but the action path is still local-first Zustand with a debounced side effect. The UI feedback is tied to local mutation, not persistence truth.

**Apple/iVisit Correction**

- Convert save/update/remove into explicit mutation states:
  - optimistic local update
  - pending sync
  - synced
  - failed with retry
- Use Supabase `upsert` for `preferences` or guarantee row creation before update.
- Call a persistence mutation from `useSavedAddressActions`, or expose `sync.status` in the candidate/save UI.
- Never show final success unless the app has either confirmed server persistence or clearly labels it as "Saved on this device".

---

### 2. Saved Location Bootstrap Is Not Auth-User Safe

**Severity:** Critical  
**Area:** user identity, saved address hydration

**Evidence**

- `hooks/map/useSavedLocationsBootstrap.js:16-33`
- `services/savedLocationsSyncService.js:155-184`

The hook uses a module-level `initialized` boolean. Once any authenticated user initializes saved locations, future users in the same runtime cannot rehydrate saved locations because `initialized` remains true.

The service also subscribes to the store at `services/savedLocationsSyncService.js:175` but does not keep or call the unsubscribe function.

**User Impact**

On logout/login, test account switch, or shared device, one user's saved addresses can remain in memory while another user's server addresses do not hydrate.

**Psychological Impact**

For emergency pickup, showing the wrong Home or Work is worse than showing none. It makes the app feel unsafe.

**Root Cause**

Runtime bootstrap is keyed to "has initialized" rather than "which authenticated user owns this state".

**Apple/iVisit Correction**

- Replace `initialized` with `initializedUserId`.
- Reset on logout/user change.
- Store the Zustand unsubscribe handle and clean it before re-subscribing.
- Clear saved locations or rehydrate them when `user.id` changes.
- Add an audit guard: no user-owned location data should survive auth identity changes unless explicitly migrated.

---

### 3. Demo Coverage Owner Check May Reject The User's Own Demo Hospitals

**Severity:** Critical  
**Area:** demo hospital bootstrap, persisted coverage gate

**Evidence**

- `services/demoEcosystemService.js:208-225`
- `services/demoEcosystemService.js:273-281`
- `services/demoEcosystemService.js:304-305`

`matchesDemoOwner()` requires `hospital.demoOwner` to match `ownerSlug`, unless the row is `demo_shared`.

But `getPersistedDemoCoverageForLocation()` selects:

```txt
id,name,address,place_id,latitude,longitude,verified,verification_status,features,status
```

It does not select `demo_owner`, `demoOwner`, or any owner field. That means direct Supabase rows passed into `matchesDemoOwner()` have no owner value, so owner matching can fail for the user's own rows.

**User Impact**

The app may keep thinking persisted demo coverage is insufficient and repeatedly bootstrap or show unstable demo readiness even when the database already has the right hospitals.

**Psychological Impact**

Demo mode is supposed to be confidence scaffolding. Repeated provisioning or missing hospitals makes the product look unreliable during the exact phase where a user is trying to evaluate it.

**Root Cause**

The ownership predicate was tightened, but the query shape was not updated to carry the ownership field required by that predicate.

**Apple/iVisit Correction**

- Include the persisted owner field in the select.
- Normalize Supabase snake_case to the shape expected by `matchesDemoOwner()`, or make `matchesDemoOwner()` accept both `demoOwner` and `demo_owner`.
- Add a regression check for:
  - same user, existing demo rows -> persisted coverage sufficient
  - different user, nearby demo rows -> ignored unless `demo_shared`

---

### 4. Manual Address No-Match Recovery Still Blocks Instead Of Moving To Confirm Pin

**Severity:** High  
**Area:** manual address emergency UX

**Evidence**

- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:497-518`
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:534-541`

When `resolveManualDraft()` returns no geocode, the flow sends the user back to the place/address step with:

```txt
We couldn't pinpoint that location yet. Try a street number, landmark, or nearby place.
```

This is better than fabricating GPS, but it still fails the planned Apple-standard fallback: unresolved manual input should degrade into a low-confidence confirm-pin flow, ideally centered on the strongest known geography.

**User Impact**

A user who knows the area but cannot find a provider match gets stuck in text entry. They may keep editing the same phrase with no sense of progress.

**Psychological Impact**

In stress, "try again" feels like blame. The app should say, in behavior, "we can still work with this".

**Root Cause**

The flow treats geocode failure as validation failure. The architecture requires confidence-building, not perfect address validation.

**Apple/iVisit Correction**

- If street/place geocode fails, build a low-confidence manual candidate from the strongest selected geography.
- Move to a confirm-pin or map-adjust state.
- Copy should be minimal:
  - "Place the pin near the pickup."
- Do not require an exact street address before the user can continue.

---

### 5. Header Back Behavior Conflicts With Manual Step Back Behavior

**Severity:** High  
**Area:** navigation consistency

**Evidence**

- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:342-349`
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:853-861`

In manual mode, the top-left header back handler is `navigateToDefaultAndClearSearch`, while the sticky footer back handler uses `handlePrevManualStep()`.

This creates two different meanings for "Back":

- header back exits manual mode,
- footer back moves to the previous manual step.

**User Impact**

A distracted user coming back to the sheet can press the standard top-left back and lose their place instead of moving one step back.

**Psychological Impact**

Back navigation must feel safe. When two back controls do different things in the same state, users become cautious and slower.

**Root Cause**

Manual step navigation is partly modeled as a local `manualStepIndex`, not as first-class sheet navigation stack state.

**Apple/iVisit Correction**

- In manual mode, top-left back should call the same semantic handler as the step back control.
- If the product needs "Cancel manual entry", expose it as a secondary text action or close button behavior, not the primary back affordance.
- Model manual substeps as navigable child states or route the header through `handlePrevManualStep()`.

---

### 6. Search Architecture Has Diverged From Manual Search Architecture

**Severity:** High  
**Area:** search, data fetching, duplication

**Evidence**

- `components/map/views/locationIntent/useAddressSearchController.js:20-45`
- `components/map/surfaces/search/useMapSearchSheetModel.js:139-180`
- `hooks/map/locationIntent/useManualDropController.js:41-63`
- `services/addressAssistService.js:17-76`

Manual input now uses a dedicated service and TanStack query. Address search still uses manual `useEffect`, timers, request refs, and direct `mapboxService.suggestAddresses()` calls. The older SearchSheet model does the same.

**User Impact**

Search loading, cache behavior, debounce timing, context appending, and provider errors will differ depending on which sheet state the user entered from.

**Psychological Impact**

Users do not understand architectural boundaries. If search feels responsive in one phase and sticky in another, it feels random.

**Root Cause**

Manual search got a cleaner pipeline, but the general address search path was not migrated to the same service/query layer.

**Apple/iVisit Correction**

- Create one address/place suggestion query hook for:
  - LocationSheet address search
  - manual admin/place drops
  - legacy SearchSheet location suggestions
- Keep provider concerns in `addressAssistService`.
- Make search loading and empty states share the same behavior contract.

---

### 7. Recents Are Being Stored Through Saved Location CRUD

**Severity:** High  
**Area:** data ownership, recents/saved separation

**Evidence**

- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:378-404`
- `stores/locationStore.js:118-143`

`commitLocation()` writes recent pickups via `addSavedLocation` with `category: "recent"`. That means ephemeral recents share the same validation, persistence, sync, max-count, and dedupe behavior as durable saved addresses.

The store rejects low-quality addresses at `stores/locationStore.js:132-139`. A recent pickup from a landmark or weak manual fallback may be rejected even though recents do not require perfect address quality.

**User Impact**

Recent locations can disappear or pollute saved-location persistence. A user expects "recent" and "saved place" to behave differently.

**Psychological Impact**

Recents are recall aids. If they feel unpredictable, the user must search again under pressure.

**Root Cause**

The architecture has not fully separated durable identity addresses from ephemeral activity history.

**Apple/iVisit Correction**

- Split `recentLocations` from `savedLocations`.
- Use a permissive quality policy for recents.
- Persist recents separately with a shorter cap and independent cleanup.
- Do not sync recents as user-declared saved addresses unless explicitly promoted.

---

## Major Findings

### 8. LocationSheet Has Become A Large Orchestrator Instead Of A Thin State Owner

**Severity:** Major  
**Area:** maintainability, DRY, state ownership

**Evidence**

- `MapLocationIntentStageBase.jsx`: 1091 lines
- `MapLocationIntentStageParts.jsx`: 850 lines
- `mapLocationIntent.styles.js`: 546 lines
- `mapLocationIntent.helpers.js`: 429 lines

`MapLocationIntentStageBase.jsx` now owns:

- sheet navigation,
- header behavior,
- candidate creation,
- manual draft mutation,
- manual validation,
- geocode fallback,
- search selection,
- recents writes,
- save category flow,
- save details flow,
- saved manage flow,
- snap state coordination.

**User Impact**

This does not directly show in UI until regressions appear. Then regressions become harder to fix without causing another one.

**Root Cause**

The implementation followed the product flow top to bottom, but several decision machines stayed in the render component after the first pass.

**Apple/iVisit Correction**

Extract these next:

- `useManualAddressFlowMachine`
- `useLocationCandidateFlow`
- `useLocationHeaderModel`
- `useLocationRecentsWriter`
- `useLocationSheetFooterModel`

Keep `MapLocationIntentStageBase` as composition only.

---

### 9. Candidate Summary Row Is Rendered As A Button Without A Selection Action

**Severity:** Major  
**Area:** accessibility, web semantics

**Evidence**

- `components/map/views/locationIntent/MapLocationIntentCandidatePanel.jsx:144-160`
- `components/map/surfaces/search/MapSearchSheetSections.jsx:39-126`

`MapLocationIntentCandidatePanel` renders the selected address through `SearchResultRow`, which is always a `Pressable`/button. In this use case no `onPress` is passed.

**User Impact**

On web and assistive tech, the selected address can appear as an actionable button even though pressing it does nothing.

**Psychological Impact**

Dead actions create hesitation. In a decision tree, every row that looks tappable should do something.

**Root Cause**

The SearchSheet row component is being reused for summary display without a non-interactive variant.

**Apple/iVisit Correction**

- Add a non-interactive `SearchResultSummaryRow` or `interactive={false}` prop.
- If the row remains pressable, make it edit/refine the selected address.

---

### 10. Save Details Is A Form-Like Block Inside The Decision Loop

**Severity:** Major  
**Area:** UI hierarchy, emergency UX

**Evidence**

- `components/map/views/locationIntent/MapLocationIntentCandidatePanel.jsx:243-314`

The save-details state renders three text inputs plus an inline primary button. It may be acceptable for saved-place management, but it violates the same rule we applied to manual entry: avoid a visible multi-field form where progressive disclosure would reduce load.

**User Impact**

After selecting a location, the user can fall into a mini-form that competes with the pickup decision.

**Root Cause**

Saved-place CRUD was added inside the candidate decision panel rather than reusing the manual step pattern or a small managed subflow.

**Apple/iVisit Correction**

- Make save details a progressive step:
  - name,
  - apartment/unit,
  - responder note.
- Or keep optional fields collapsed behind "Add details".
- Keep "Use as pickup" separate and always easy to return to.

---

### 11. Demo Audit Docs Are Stale Relative To Implemented Commits

**Severity:** Major  
**Area:** rollback docs, branch truth

**Evidence**

- `docs/audit/demo/README.md:39-43`
- Commits exist:
  - `1197657 demo(bootstrap): fix duplicate hospital bug via user-slug scope key + cross-org sweep [Pass 1+2+5]`
  - `55cb882 demo(client): owner-scope coverage gate + EC-5 matchesDemoOwner tighten [Pass 4]`

The README still marks Pass 1, Pass 2, Pass 4, and Pass 5 as `PLANNED`.

**User Impact**

Rollback and review become unreliable. A future engineer cannot tell what was planned versus shipped.

**Root Cause**

Docs were used as planning docs but not reconciled after code landed.

**Apple/iVisit Correction**

- Change pass statuses to:
  - implemented,
  - implemented but audit-needed,
  - pending,
  - blocked.
- Link each implemented pass to the commit or file owner.
- Mark Pass 3 separately as post-deploy/maintenance if not executed.

---

### 12. Non-ASCII Comments Were Introduced In Code

**Severity:** Medium  
**Area:** repo hygiene, encoding safety

**Evidence**

Examples:

- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:503`
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx:885`
- `components/map/views/locationIntent/MapLocationIntentCandidatePanel.jsx:2`
- `services/addressAssistService.js:90`
- `services/savedLocationsSyncService.js:7-8`

The repo instructions prefer ASCII unless there is a clear reason. Several comments use em dashes, bullets, middle dots, and arrows. They are readable now, but this is the same path that previously produced mojibake in docs and console output.

**User Impact**

No direct UI impact, but it increases cross-platform encoding risk.

**Root Cause**

Rollback comments were written in rich prose rather than plain ASCII.

**Apple/iVisit Correction**

- Convert code comments to ASCII:
  - `-` instead of em dash
  - `->` instead of arrow
  - `Step x of y` instead of middle dot
- Keep user-facing copy Unicode only when product language truly needs it.

---

## Search And Manual Flow Findings

### Search Is Better, But Not Closed Loop Yet

Improved:

- focusing search expands the sheet,
- address search has a candidate decision state,
- recent searches render in the search state,
- selected search results now route into a unified candidate panel.

Remaining gaps:

- search is not powered by the same query/service layer as manual drops,
- there is no typed search fallback equivalent for top-level address search,
- search candidate map camera behavior needs runtime validation,
- "find nearby hospital" and "use as pickup" share the candidate surface but are not yet validated as separate downstream flows.

### Manual Is Better, But Still Has A Hard Stop

Improved:

- country search is inline,
- region label adapts by country,
- Nigeria-specific order is now country -> state -> city -> LGA/area -> place,
- search context includes previous geography fields,
- typed fallback lets users continue without exact provider results,
- sticky footer exists,
- header now labels manual subphase.

Remaining gaps:

- unresolved geocode does not naturally enter confirm-pin recovery,
- top-left back and footer back disagree,
- final candidate confidence is not explained to the user,
- save details can become a form inside the location decision flow,
- code still needs modularization before more manual country cases.

---

## iVisit Way Violations

### State-Layer Violations

The intended five-layer model is partially followed but not fully clean:

- Jotai is correctly used for candidate/save-flow ephemeral UI state.
- Zustand is correctly used for durable location store state.
- TanStack Query is used for manual drop search.
- But saved-address remote persistence is not a proper mutation layer yet.
- Search still uses direct provider calls in component hooks.
- Recents and saved places share the same durable store path.

### UI/UX Violations

- Some decision surfaces still have multiple competing CTAs.
- Save details reintroduces multi-field form energy.
- Back behavior is not consistent in manual mode.
- Candidate summary is semantically interactive without an action.
- Demo docs do not match code state, weakening rollback confidence.

### Code Quality Violations

- Core location files exceed comfortable review size.
- Flow logic, data normalization, navigation, and UI composition are still too coupled.
- Some direct provider calls remain outside service/query hooks.
- Comments use non-ASCII despite encoding sensitivity in this codebase.

---

## Required Stabilization Passes

### Pass 1 - Persistence Truth

Fix saved address persistence before adding new saved-place UI.

Acceptance:

- save/update/remove expose pending/synced/failed,
- Supabase persistence uses upsert or guaranteed row creation,
- local "Saved" feedback does not lie,
- auth user switch hydrates the correct saved places.

### Pass 2 - Demo Owner Coverage Gate

Fix and verify demo owner filtering.

Acceptance:

- owner field is selected from Supabase,
- matcher accepts the actual row shape,
- same-user coverage is sufficient,
- cross-user coverage is ignored,
- docs statuses match implementation.

### Pass 3 - Manual Recovery

Finish no-match recovery.

Acceptance:

- no exact geocode moves to confirm-pin, not a hard error,
- candidate confidence is low but usable,
- user can continue without typing a perfect postal address.

### Pass 4 - Search Query Unification

Move top-level address search and SearchSheet location suggestions to the same service/query pattern as manual drops.

Acceptance:

- one provider gateway,
- one debounce/loading contract,
- one empty-state/fallback contract,
- consistent context passing.

### Pass 5 - LocationSheet Decomposition

Split the large files before adding more feature logic.

Acceptance:

- `MapLocationIntentStageBase.jsx` drops below roughly 650 lines,
- manual flow logic is in its own hook/machine,
- candidate/save flow logic is in its own hook/machine,
- header/footer models are derived, not handwritten inline.

### Pass 6 - UI Semantics And Copy

Polish the decision surfaces after state is safe.

Acceptance:

- non-interactive rows are not buttons,
- manual back behavior is consistent,
- save details are progressive or collapsed,
- helper copy stays minimal,
- code comments are ASCII.

---

## Suggested Fix Order

1. Demo owner field bug, because it can cause repeated bootstrap behavior.
2. Saved address persistence/auth bootstrap, because it affects user identity.
3. Manual confirm-pin fallback, because it affects emergency completion.
4. Header/back semantics and candidate summary semantics.
5. Search query unification.
6. File decomposition and ASCII cleanup.
7. Demo docs status reconciliation.

---

## Audit Status

This audit is static and code-based. It intentionally did not claim runtime pass/fail.

Before production confidence, run:

- manual address flow on mobile web with keyboard open,
- manual address flow on native device,
- search result selection with map camera movement,
- saved Home/Work save/update/remove across logout/login,
- demo bootstrap twice for same user with GPS drift,
- demo bootstrap near another user's existing demo rows.
