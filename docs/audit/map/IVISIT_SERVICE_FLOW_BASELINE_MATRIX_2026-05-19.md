# iVisit Service Flow Baseline Matrix

Date: 2026-05-19
Status: Active baseline
Parent: `IVISIT_SERVICE_SHEET_SIMPLIFICATION_AUDIT_2026-05-19.md`

## Purpose

This matrix records the current runtime flow before simplification work begins. The goal is to keep future UX passes grounded in the real iVisit map runtime: sheet phases, modal overlays, location source-return contracts, profile/auth overlays, provider marker gates, and commit/payment handoffs.

This is not a redesign document. It is the baseline that later passes must preserve unless a pass explicitly changes an invariant.

## Runtime Owners

| Area | Primary files | Role |
| --- | --- | --- |
| Welcome entry | `components/welcome/welcomeContent.js` | One primary new-user entry into help |
| Map orchestration | `screens/MapScreen.jsx`, `hooks/map/exploreFlow/useMapExploreFlow.js` | Composes sheet, modals, map focus, provider state, top-left control |
| Primary callbacks | `hooks/map/exploreFlow/useMapCallbacks.js` | Owns choose-care, profile, featured hospital, map readiness callbacks |
| Sheet phases | `components/map/core/MapSheetOrchestrator.jsx`, `components/map/core/mapSheet.constants.js` | Renders each sheet phase |
| Sheet navigation | `hooks/map/exploreFlow/useMapSheetNavigation.js` | Opens/closes search, hospital, provider, decision, detail, visit phases |
| Decision/commit bridges | `hooks/map/decision/useMapDecisionHandlers.js`, `hooks/map/exploreFlow/useMapCommitFlow.js` | Bridges ambulance/bed decisions into details/payment/tracking |
| Location truth | `hooks/map/exploreFlow/useMapLocation.js`, `hooks/map/exploreFlow/useMapLocationIntent.js` | Resolves pickup, location unavailable flow, return contracts, billing country sync |
| Location sheet | `components/map/views/locationIntent/*`, `hooks/map/locationIntent/*` | Search/manual/saved/recents/candidate/save management |
| Profile/auth overlays | `components/map/MapModalOrchestrator.jsx`, `components/emergency/MiniProfileModal.jsx`, `components/map/MapGuestProfileModal.jsx`, `components/map/views/shared/MapTopLeftControl.jsx` | Signed-in profile, guest auth, top-left control semantics |
| Explore Care | `screens/MapScreen.jsx`, `components/map/views/providerList/*`, `components/map/views/providerDetail/*`, `hooks/emergency/useNearbyProviders.js` | Provider category list/detail, map markers, autoselect |
| Book Visit bridge | `hooks/map/useMapRouteHandlers.js` | Temporary route bridge to `/(user)/(stacks)/book-visit` |

## Product Lanes

iVisit currently presents four user-facing lanes after Welcome:

1. Emergency Now
   - Ambulance
   - Bed space
   - Ambulance + bed

2. Explore Care
   - Pharmacies
   - Urgent care
   - Clinics
   - Labs
   - Radiology
   - Mental health
   - Women's care
   - Pediatrics

3. Location
   - Device location
   - Address/place search
   - Saved places
   - Recent places
   - Manual address

4. Account
   - Guest OTP/Google sign-in
   - Mini profile
   - History/recent visits
   - Payment/profile/settings shortcuts
   - Sign out

## Flow Matrix

| Flow | Entry | Runtime path | State touched | Return/exit | Must preserve |
| --- | --- | --- | --- | --- | --- |
| Welcome to map | Welcome `Continue` | Auth/map route entry into `/map`/user surface | Route state, auth shell | Map Explore Intent | Welcome stays one-action and emergency-clear |
| Explore ambulance | Explore Intent ambulance orb or Choose Care ambulance blade | `handleChooseCare("ambulance") -> openAmbulanceDecision() -> AMBULANCE_DECISION` | `selectedCare=ambulance`, hospital promotion | Close returns to tracking if source tracking, otherwise Explore | Ambulance opens decision sheet, not legacy route |
| Explore bed | Explore Intent bed orb or Choose Care bed blade | `handleChooseCare("bed") -> openBedDecision(null, "bed") -> BED_DECISION` | `selectedCare=bed`, hospital promotion | Close returns to tracking if source tracking, otherwise Explore | Bed selection remains room/service-aware |
| Explore ambulance + bed | Explore Intent compare orb or Choose Care ambulance + bed blade | `handleChooseCare("both") -> openAmbulanceDecision() -> confirm -> openBedDecision(..., "both", savedTransport)` | `selectedCare=both`, `savedTransport`, hospital-scoped service selection | Payment/tracking after bed decision and commit | Saved transport and hospital invalidation behavior remain intact |
| Hospital browse | Explore Intent search/hospital list or decision "other hospitals" | `HOSPITAL_LIST -> HOSPITAL_DETAIL` or return to source phase | selected hospital atoms, featured hospital | Back returns through source payload or Explore | Hospital list/detail never mix provider categories |
| Hospital detail primary CTA | Hospital detail "use hospital" | `handleUseHospital()` chooses ambulance/bed/both based on `selectedCare` | selected care, selected hospital | Decision phase | Detail should not jump directly to payment/auth |
| Service detail | Decision/detail service card | `SERVICE_DETAIL` with `serviceType=ambulance|room` | `serviceSelectionsByHospital` | Returns to source phase | Service detail is upstream browse/select, not commit |
| Contact skip | Confirm ambulance/bed with user email + valid phone | Decision handler opens `COMMIT_PAYMENT` directly | `draft.email`, `draft.phone`, source payload | Payment | Valid user identity should not force contact step |
| Contact details | Confirm ambulance/bed without complete contact | Decision handler opens `COMMIT_DETAILS` | commitFlow atom, contact memory, OTP/phone state | Payment after details | OTP/phone flow persists across remount |
| Triage | Commit or tracking info update | `COMMIT_TRIAGE` | triage draft/snapshot, active trip/pending approval patches | Payment or tracking return | Triage update from tracking must not create new request |
| Payment | Commit payment | `COMMIT_PAYMENT` creates/settles request through payment/request flow | payment atoms, emergency request, trips, visits, pending approval | `finishCommitPayment -> openTracking()` | Payment success always opens tracking |
| Tracking | Payment success or active trip restore | `TRACKING` | active trip/bed booking, route sync, rating state | Explore or visit detail | Tracking does not depend on remount to refresh |
| Add bed from tracking | Tracking action | `TRACKING -> BED_DECISION` with sourcePhase tracking | active trip, source payload | Back to tracking | Companion bed does not erase active ambulance |
| Add ambulance from tracking | Tracking action | `TRACKING -> AMBULANCE_DECISION` with sourcePhase tracking | active bed booking, source payload | Back to tracking | Companion transport does not erase active bed booking |
| Explore Care category | Choose Care category card | `handleExploreCare -> openProviderList(category, null) -> PROVIDER_LIST` | `exploreProviderCategory`, `exploreProviderId`, provider query | Close clears category/id and returns Explore | Category opens list inside map-sheet runtime |
| Provider autoselect | Provider list query resolves | First nearest provider selected if selected id missing/stale | `exploreProviderId`, sheet payload selected id | Stays in Provider List | Autoselect nearest unless user-selected id still exists |
| Provider detail | Provider card or marker tap | `PROVIDER_DETAIL` with provider payload and sourcePhase Provider List | selected provider id, provider payload, detail enrichment | Close returns Provider List | Provider markers remain alive during detail |
| Provider close list | Provider List close | Clear category/id/payload and set Explore | provider atoms, sheet payload | Explore Intent | Providers and hospitals do not coexist after close |
| Location unavailable | Location off or no valid pickup | `useMapLocationIntent -> LOCATION_INTENT` | prompt ref, sheet phase | User selects device/search/manual/saved or closes | Prompt only once until location resolves |
| Open location from map | Map location chrome/user-location press | `handleOpenLocationSheet -> LOCATION_INTENT` | sheet phase/payload | Explore by default | Does not wipe unrelated service state unless location changes |
| Change pickup from ambulance | Ambulance decision pickup action | `LOCATION_INTENT` with sourcePhase `AMBULANCE_DECISION` | source payload, location candidate, billing country | Return to Ambulance Decision | Decision context preserved |
| Change pickup from bed | Bed decision pickup action | `LOCATION_INTENT` with sourcePhase `BED_DECISION` | source payload, location candidate, billing country | Return to Bed Decision | Saved transport context preserved where valid |
| Change pickup from payment | Payment location action | `LOCATION_INTENT` with sourcePhase `COMMIT_PAYMENT` | payment source payload, candidate, billing country | Return to Payment | Payment state should not reset unnecessarily |
| Location search | Location sheet search | `ADDRESS_SEARCH -> CANDIDATE_DECISION -> commitLocation` | candidate atom, recents, manual location, user location | Source-return or Explore | Invalid coordinates are rejected |
| Manual location | Location sheet manual entry | `MANUAL_STEP` across country/region/city/area/address/unit/note | manual draft, manual drop query, candidate, recents | Candidate decision then source-return | Manual cannot commit without valid coordinates |
| Saved place use | Location sheet Places Hub | `PLACES_HUB -> SAVED_MANAGE -> pickup` | saved location usage, candidate, recents | Source-return | Saved place must map to valid coordinates |
| Recent place use | Location sheet Recents Hub | `RECENTS_HUB -> CANDIDATE_DECISION -> commit` | candidate, recents usage | Source-return | Recent source stays valid and auditable |
| Mini profile location | MiniProfileModal Address & Location | Close profile, then `LOCATION_INTENT` with sourcePhase `miniProfile` | modal visible, sheet payload | Closing Location Intent reopens MiniProfileModal | Mini profile is modal-owned, not a sheet phase |
| Signed-in profile | Top-left avatar or Explore profile trigger | `handleOpenProfile -> MiniProfileModal` | profileModalVisible | Close returns map | Profile is support overlay, not service flow |
| Guest profile | Guest profile trigger | `MapGuestProfileModal` email OTP or Google OAuth | guestProfileVisible, auth session, contact memory | Return to map after auth | Profile completion remains deferred |
| Top-left back unauthenticated | Top-left control on Explore | `router.replace("/(auth)/")` | route | Welcome/auth | Guest map has obvious escape |
| Top-left back decision | Signed-in decision phase top-left | `handleTopLeftBack -> closeDecisionPhase` delegates to `useMapSheetNavigation` | sheet phase | Explore/tracking return | Ambulance, bed, hospital list, and hospital detail must each use their own navigation-owned close contract |
| Recent visits | Explore or MiniProfile history | `MapHistoryModal -> VISIT_DETAIL` | recentVisitsVisible, selected history visit | Return to recents/explore/tracking by sourceSurface | History stays separate from Choose Care |
| Book Visit | Choose Care Book a visit | `handleBookVisitFromCare -> router.push("/(user)/(stacks)/book-visit")` | route, care modal close | Book Visit stack | Current bridge remains until sheet design exists |

## Core Invariants

- Welcome remains narrow and does not expose the full service catalog.
- Explore Intent keeps emergency actions visible before broader care discovery.
- Choose Care is a service picker, despite the current `MapCareHistoryModal` name.
- Location Intent is a first-class subsystem and cannot be flattened without replacing its source-return, saved-place, manual-entry, and keyboard contracts.
- Mini profile and guest profile are modal overlays, not service sheets.
- Emergency hospital discovery and Explore Care provider discovery must stay separate.
- Providers and hospitals must not render as active map marker sets at the same time.
- Provider list autoselect should select nearest provider only when no valid selected provider exists.
- Contact details may be skipped only when email and phone are valid.
- Payment success must always hand off to tracking.
- Book Visit remains a route bridge until a map-sheet booking design is complete.

## Immediate Follow-Up Checks

1. Top-left back ownership: statically checked. `MapTopLeftControl` has one render site and delegates signed-in decision back to `closeDecisionPhase`.
2. Provider autoselect: fixed identity fallback so provider sheet selection, map focus, and provider markers all use `id ?? placeId ?? name`.
3. MiniProfile -> Address & Location -> close: statically checked. `sourcePhase: "miniProfile"` reopens `MiniProfileModal`.
4. Location Intent return from `COMMIT_PAYMENT`: statically checked. Payment passes current `sheetPayload` as `sourcePayload`, then restores it on close.
5. Book Visit bridge: statically checked. `handleBookVisitFromCare` closes Choose Care before route push.

Runtime device/browser verification is still required before Phase 1 is considered fully release-ready.
