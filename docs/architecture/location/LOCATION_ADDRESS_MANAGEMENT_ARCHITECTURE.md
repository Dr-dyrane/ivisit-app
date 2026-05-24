---
status: living
owner: architecture
last_updated: 2026-05-13
---

# Location And Address Management Architecture

**Date:** 2026-05-10
**Owner:** `/map` location management
**Status:** Canonical plan for the LocationSheet saved-address/search/manual/recents pass

---

## Executive Summary

iVisit location management has two different jobs that must stay separate:

1. **Pickup truth** - the location used right now for emergency routing, nearby hospitals, pricing, and regular visit context.
2. **Saved address identity** - reusable user-owned addresses such as Home, Work, Family, School, Pharmacy, or Other.

The LocationSheet is the management surface that connects them. Search, manual entry, saved places, and recents all produce the same temporary **address candidate**. Only an explicit CTA commits that candidate as pickup or saves it as an address.

Do not let selecting a search result mutate pickup immediately. Selection creates a candidate and renders a decision tree.

UX guardrail companion:

- [`../ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md`](../ux/IVISIT_UX_ISSUE_MAPPING_AND_LOCATION_GUARDRAILS_2026-05-10.md)
- [`../ux/APP_WIDE_SURFACE_AUDIT_FOR_LOCATION_2026-05-10.md`](../ux/APP_WIDE_SURFACE_AUDIT_FOR_LOCATION_2026-05-10.md)

---

## Current Audit Findings

### 2026-05-11 Current Implementation Checkpoint

Rapid implementation passes have moved this plan from pure architecture into partial working code.

Current app state:

- LocationSheet now owns location selection phases instead of SearchSheet owning pickup address selection.
- Search result selection creates an address candidate and renders a decision tree instead of directly committing pickup.
- Candidate decision, save category, save details, saved manage, manual step, and default states are wired through `MapLocationIntentStageBase.jsx`.
- Address candidate state is backed by `useAddressCandidateController`.
- Saved address actions are routed through `useSavedAddressActions`.
- Manual provider search is routed through `useManualDropController` and `addressAssistService`.
- Manual geocoding now passes selected `countryCode` into Mapbox and OSM fallback.
- Manual typed fallback exists so weak provider suggestions do not block progress.
- Manual administrative order now supports `country -> state/region -> city -> LGA/area -> place`.

Audit required before further expansion:

- `MapLocationIntentStageBase.jsx` is now over the documented 1000-line violation threshold.
- `MapLocationIntentStageParts.jsx` is above 800 lines and should be decomposed before more UI states are added.
- Candidate, saved-address, manual, and search logic now touch multiple state layers and require a state-ownership audit.
- Search/LocationSheet reuse must be audited so a second search architecture does not emerge.

Deep audit companion:

- [`../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md`](../../audit/map/LOCATION_SEARCH_UIUX_DEMO_LAST_24H_DEEP_AUDIT_PLAN_2026-05-11.md)

### What Exists

- `stores/locationStore.js`
  - Owns `userLocation`, `userLocationSource`, permission cache, and local `savedLocations`.
  - Persists through `StorageKeys.LOCATION_CACHE`.
  - Has basic CRUD: `addSavedLocation`, `updateSavedLocation`, `removeSavedLocation`, `clearSavedLocations`.
  - Rejects low-quality address text through `calculateAddressQuality`.

- `contexts/SearchContext.jsx`
  - Owns `recentQueries`.
  - Persists through `StorageKeys.SEARCH_HISTORY`.

- `hooks/map/exploreFlow/mapPickupLocationTruth.js`
  - Resolves live pickup truth in strict priority:
    1. session manual pickup
    2. live device location
    3. saved manual fallback
    4. saved device fallback
    5. missing pickup

- `hooks/map/exploreFlow/useMapLocation.js`
  - Commits selected pickup to shared location truth.
  - Updates billing country when a selected location carries `countryCode`.
  - Resets map/hospital scoped state when pickup changes.

- `profiles.address`
  - One legacy text field on the Supabase `profiles` table.
  - No coordinates.
  - Useful as a profile/home text fallback, not a full saved-address system.

### Gaps

- Saved addresses are not identity-scoped in local storage.
- Saved addresses already have a preference-sync path, but the current saved-address shape is too thin for product-grade CRUD/status UI.
- There is no canonical saved-address shape with category, icon/color family, verification, metadata, and sync state.
- Current saved-location add/update actions do not expose enough status for product-grade UI.
- Search/manual/recent flows do not yet share one complete candidate decision tree.

---

## Existing Implementation Reuse Audit

Before adding any new location-management code, use the existing app-owned implementation as the base layer.

### Reuse Directly

- `stores/locationStore.js`
  - Keep it as the owner of device location, pickup fallback memory, and saved locations.
  - Evolve `savedLocations` in place instead of creating a second saved-address store.
  - Preserve its existing local persistence at `StorageKeys.LOCATION_CACHE`.

- `services/savedLocationsSyncService.js`
  - Keep the current `preferences.view_preferences.savedLocations` sync path for this pass.
  - Add status/normalization around it before considering a new database table.
  - Do not introduce a parallel cloud write path until the `saved_addresses` schema pass is approved.

- `hooks/map/useSavedLocationsBootstrap.js`
  - Keep it as the app-start sync bootstrap.
  - Any new sync behavior should attach here rather than adding another root initializer.

- `components/map/surfaces/search/MapSearchSheetSections.jsx`
  - Reuse `SearchResultRow`, `ResultsSection`, and grouped search-row language for LocationSheet search state.
  - LocationSheet can own the decision tree after selection, but it should not invent a new search-result visual family.

- `components/map/surfaces/search/mapSearchSheet.helpers.js`
  - Reuse `mapSuggestionToLocation` as the current canonical suggestion mapper.
  - If a deeper mapper is needed, migrate this helper into the new service instead of duplicating it again.

- `utils/locationHelpers.js`
  - Reuse coordinate normalization and place-model helpers.
  - Manual, saved, recent, and search candidates should normalize through the same coordinate truth rules.

- `utils/addressQualityValidator.js`
  - Reuse the quality scoring entry point.
  - Extend or wrap it for POI, landmark, international, and manual-step contexts; do not create a disconnected validator.

- `hooks/search/useLocationSearchQuery.js`
  - Prefer this TanStack Query hook for new search surfaces.
  - LocationSheet search should move toward this hook instead of adding another debounce/useEffect search loop.

### Refactor, Do Not Duplicate

- `mapboxService.suggestAddresses`
  - Keep one provider adapter.
  - Normalize call sites so they pass the same argument shape.
  - Existing mismatch: `SearchContext.jsx` passes `{ query }`, while the service expects a string.

- `mapboxService.reverseGeocode`
  - Keep one reverse-geocode contract.
  - Existing mismatch: `useSavedLocationRefresh` passes an object and expects `{ address }`, while the service currently accepts `(lat, lng)` and returns a string.

- Location suggestion mappers
  - Existing duplicate mappers live in:
    - `components/map/surfaces/search/mapSearchSheet.helpers.js`
    - `components/map/surfaces/search/MapLocationModal.jsx`
    - `components/emergency/intake/EmergencyLocationSearchSheet.jsx`
  - New work should consolidate around one mapper rather than adding a fourth.

- Search hooks
  - Existing JS and TS `useLocationSearchQuery` variants differ in cache keys/stale times.
  - Pick one canonical app path before expanding search behavior.

### Add Only Where Missing

- Add a small `locationAddressService` only as a domain adapter over the existing store/helpers/search service.
- The service should normalize candidates, saved-address payloads, CTA state, and pickup payloads.
- It should not own React state, fetch directly from UI, or create new persistence.

### Immediate Guardrail

Any new LocationSheet pass must answer:

1. Which existing store/service/helper owns this already?
2. Are we extending that owner or creating a duplicate?
3. If creating a new module, what duplicate call sites will it replace?

---

## Product Roles

### Pickup Location

The pickup location is operational truth. It answers:

- Where should responders go?
- Which hospitals are nearby?
- Which country/pricing rules apply?
- What route should the map frame?

Pickup may come from:

- device GPS
- search result
- saved address
- manual entry
- recent location
- future pin adjustment

### Saved Address

A saved address is user memory. It answers:

- Where does this user often request care?
- What friendly label/category should be shown?
- Should this address appear as Home, Work, Family, etc.?

Saved addresses do not become pickup until the user chooses them.

### Recent Location

A recent location is lightweight memory. It answers:

- What did the user search, pick, manually enter, or visit recently?

Recents can become candidates and may be promoted to saved addresses.

---

## Canonical Data Shapes

### Address Candidate

Every source produces this shape before any commit:

```ts
type AddressCandidate = {
  id?: string;
  source: "device" | "search" | "manual" | "saved" | "recent" | "visit" | "pin";
  label: string;
  address: string;
  coords: {
    latitude: number;
    longitude: number;
  };
  countryCode?: string | null;
  confidence: "high" | "medium" | "low";
  unit?: string | null;
  responderNote?: string | null;
  placeId?: string | null;
  provider?: "mapbox" | "google" | "openstreetmap" | "device" | "local" | "visit";
  pendingSaveCategory?: SavedAddressCategory | null;
};
```

Rules:

- Candidates must have finite coordinates before they can be used as pickup or saved.
- Manual candidates must never fall back to stale/current GPS if geocoding fails.
- Selecting a search result creates a candidate; it does not commit pickup by itself.

### Saved Address

```ts
type SavedAddressCategory =
  | "home"
  | "work"
  | "family"
  | "school"
  | "pharmacy"
  | "care"
  | "other";

type SavedAddress = {
  id: string;
  ownerUserId: string | "guest";
  category: SavedAddressCategory;
  label: string;
  address: string;
  coords: {
    latitude: number;
    longitude: number;
  };
  countryCode?: string | null;
  unit?: string | null;
  responderNote?: string | null;
  colorKey: SavedAddressCategory;
  iconName: string;
  provider?: AddressCandidate["provider"];
  placeId?: string | null;
  quality: {
    score: number;
    isValid: boolean;
    issues: string[];
  };
  usage: {
    lastUsedAt?: number | null;
    useCount: number;
  };
  sync: {
    status: "local" | "pendingCreate" | "pendingUpdate" | "pendingDelete" | "synced" | "failed";
    error?: string | null;
    remoteId?: string | null;
  };
  createdAt: number;
  updatedAt: number;
};
```

Compatibility:

- Current `locationStore.savedLocations` can be migrated into this shape.
- Legacy `label: "home"` maps to `category: "home"`, `label: "Home"`.
- Existing `latitude` / `longitude` can be normalized into `coords`.

### Pickup Commit Payload

`LocationSheet` emits the existing `onSelectLocation` shape:

```ts
type PickupCommitPayload = {
  primaryText: string;
  secondaryText: string;
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  countryCode?: string | null;
  source: AddressCandidate["source"];
  confidence?: AddressCandidate["confidence"];
  unit?: string | null;
  responderNote?: string | null;
  savedAddressId?: string | null;
};
```

---

## Five-Layer State Architecture

### Layer 1 - Persistence And Identity

Owns raw storage.

- Local: `locationStore` persisted at `StorageKeys.LOCATION_CACHE`.
- Search history: `SearchContext` persisted at `StorageKeys.SEARCH_HISTORY`.
- Auth identity: `AuthContext.user.id`.
- Profile fallback: `profiles.address`.
- Future cloud table: `saved_addresses`.

Responsibilities:

- Store saved addresses by `ownerUserId`.
- Keep guest addresses separate from authenticated addresses.
- Preserve local-first offline availability.
- Prepare sync metadata without requiring DB work immediately.

### Layer 2 - Domain Services

Owns normalization and business rules.

Planned modules:

- `services/locationAddressService.js`
  - normalize candidate
  - normalize saved address
  - validate coordinate truth
  - score address quality
  - map candidate to pickup payload
  - map candidate to saved address payload

- `services/savedAddressSyncService.js` later
  - local-to-cloud sync
  - guest-to-user migration after login
  - conflict resolution

Responsibilities:

- No UI state.
- No sheet phase knowledge.
- No map camera behavior.

### Layer 3 - Store And Selectors

Owns app-wide address memory.

Planned `locationStore` selectors/actions:

- selectors:
  - `selectSavedAddressesForUser(ownerUserId)`
  - `selectSavedAddressByCategory(category)`
  - `selectPinnedSavedAddresses()` for orb row
  - `selectRecentAddressCandidates()` from saved usage plus search/manual history

- actions:
  - `upsertSavedAddress(address)`
  - `removeSavedAddress(id)`
  - `markSavedAddressUsed(id)`
  - `migrateGuestAddressesToUser(userId)`
  - `setSavedAddressSyncStatus(id, syncPatch)`

Responsibilities:

- CRUD status must be explicit.
- Existing Home/Work entries update in place.
- Other categories can have multiple entries, but each entry has a stable id.

### Layer 4 - Map Orchestration

Owns operational pickup truth.

Existing owner:

- `useMapLocation`
- `mapPickupLocationTruth`

Responsibilities:

- Commit candidate as pickup only from explicit CTA.
- Update billing-country override when country truth exists.
- Reset route/hospital state when pickup coordinates meaningfully change.
- Return to the originating sheet phase after commit when editing pickup mid-flow.

### Layer 5 - LocationSheet UI State

Owns in-sheet states and back stack.

```ts
type LocationSheetMode =
  | "default"
  | "addressSearch"
  | "candidateDecision"
  | "saveCategory"
  | "saveDetails"
  | "savedManage"
  | "manualStep"
  | "confirm";
```

Back stack rules:

- Every mode after `default` passes a left-header back action.
- In wide sidebar, left-header back still appears; sidebar layout must not suppress state back.
- Close in nested modes returns to previous/default sheet mode unless the user is at default.
- Closing at default closes the LocationSheet.

### Five-Layer Guardrails

Every implementation pass must declare which layer it is touching. A change that crosses layers should do so through an explicit function boundary, not by reaching into another layer's state directly.

Layer ownership:

- Layer 1 persistence owns storage reads/writes and user identity keys.
- Layer 2 domain services own normalization, validation, quality scoring, and payload mapping.
- Layer 3 stores/selectors own app memory and reusable state.
- Layer 4 map orchestration owns pickup commits, hospital reset behavior, and map camera side effects.
- Layer 5 sheet UI owns local modes, active candidate, back stack, and rendering.

Rules:

- UI components do not read raw storage directly.
- UI components do not decide Home/Work conflict behavior.
- Store actions do not know sheet modes.
- Domain services do not dispatch navigation or map updates.
- Map orchestration does not know saved-address category UI.
- Search/manual/saved/recent sources all enter the same candidate pipeline.

### Effect And Hook Guardrails

Effects should synchronize with external systems, not drive the main decision tree.

Use effects for:

- debounced search requests
- permission/location subscription cleanup
- syncing profile fallback after authenticated user changes
- hydrating persisted saved-address state
- map camera preview after `activeCandidate` changes

Avoid effects for:

- deciding which CTA action should run
- mutating saved addresses after render because a mode changed
- committing pickup because a candidate exists
- resetting navigation stack as a side effect of unrelated state

Hook boundaries:

- `useLocationSheetNavigation`
  - owns mode stack, Back, Close, Cancel, and parent return rules.
- `useAddressSearchController`
  - owns query, debounce, result loading, empty/error states, and recent search handoff.
- `useAddressCandidateController`
  - owns active candidate, candidate source, and preview lifecycle.
- `useSavedAddressActions`
  - owns save/update/remove/refresh actions and CRUD status.
- `useLocationCommitActions`
  - owns candidate-to-pickup commit and source-context return behavior.

Implementation style:

- Prefer pure builders for CTA rows and section models.
- Prefer reducer/state-machine style transitions for nested sheet modes.
- Keep each hook small enough that its dependencies are obvious.
- Do not let a `useEffect` become the hidden owner of a product decision.
- Match existing map flow patterns where possible:
  - `useMapLocation` remains pickup truth commit owner.
  - `locationStore` remains local address/location memory owner.
  - `SearchContext` remains recent query owner unless promoted into a shared address selector.

---

## Location UI Surface Decision Matrix

Location must reuse existing app surface families. Do not invent a new visual system for this feature.

| Location state | User job | Reuse family | CTA placement |
|---|---|---|---|
| `default` | choose location entry point | Explore Intent hierarchy, current hero, places orb row | no sticky footer |
| `addressSearch` empty | restart or select recent | Search sheet grouped rows | no terminal footer |
| `addressSearch` loading | wait for predictions | result-shaped skeleton rows | no terminal footer |
| `addressSearch` results | choose address candidate | `SearchResultRow` / `ResultsSection` | no terminal footer |
| `candidateDecision` | decide what to do with address | selected address group + grouped action rows | sticky primary footer when scrollable |
| `saveCategory` | choose saved-place family | solid saved-place/category orbs | footer only on tight viewports |
| `saveDetails` | confirm label/unit/note | address group + compact editable rows | sticky footer |
| `manualStep` | answer one guided field | commit-details one-question rhythm + assisted input | sticky step footer when scrollable |
| `manualResolving` | geocode draft | preserved manual/review body | sticky pending footer |
| `savedManage` | use/edit/refresh/remove saved place | mini profile/settings grouped rows | sticky destructive confirmation only |
| `deviceRecovery` | recover current location | current-location hero + grouped recovery rows | sticky footer for emergency confirmation |
| `pinAdjust` | future map correction | map preview + candidate group | sticky confirm footer |
| mini profile entry | open address management | mini profile `map` tone row | none in mini profile |

Surface rules:

- Address entities use search result rows.
- Saved-address management actions use mini profile/settings-style grouped rows.
- Operational pickup commits use sticky footer CTAs when the body can scroll.
- Category actions use category orb identity.
- Neutral navigation actions stay muted.
- Destructive actions use destructive treatment, never category color.
- The sheet shell remains mounted; body changes use the shared map phase transition language.

---

## Saved Address CRUD State Machine

CRUD should expose five product states:

1. **Idle**
   - No mutation running.
   - Address can be used, edited, deleted, or refreshed.

2. **Draft**
   - User chose a category or is editing label/unit/note.
   - Nothing has been persisted yet.

3. **Validating**
   - Address text and coordinate truth are checked.
   - Failed validation stays in the sheet with recovery actions.

4. **Saving**
   - Local upsert is pending.
   - UI shows immediate pressed/pending feedback.

5. **Saved / Failed**
   - Saved state shows confirmation and allows `Use as pickup`.
   - Failed state shows reason and recovery:
     - `Try another address`
     - `Edit details`
     - `Cancel`

Sync status is separate from CRUD status:

- `local`
- `pendingCreate`
- `pendingUpdate`
- `pendingDelete`
- `synced`
- `failed`

This separation lets local save succeed even if future cloud sync fails.

---

## LocationSheet Decision Trees

### Search Result Selected

```txt
addressSearch
  â†“ user selects address
candidateDecision
  Address group
    selected label
    selected formatted address
  CTA group
    Find nearby hospitals
    Use as pickup
    Set as Home
    Set as Work
    Add to saved places
    Pick another location
```

Notes:

- `Find nearby hospitals` means use this candidate as pickup and return to the normal explore/hospital discovery path.
- `Use as pickup` is the neutral operational commit.
- In explore intent, `Find nearby hospitals` can be the primary label.
- In commit/payment/tracking edit contexts, `Use as pickup` is clearer.

### Add To Saved Places

```txt
candidateDecision
  â†“ Add to saved places
saveCategory
  Solid category orbs
    Home
    Work
    Family
    School
    Pharmacy
    Care
    Other
  â†“ choose category
saveDetails
  Address group
  Optional label / unit / responder note
  CTA group
    Save place
    Save and use as pickup
    Back
```

Category UI:

- Use the same solid orb language as first paint.
- Color coding must be stable per category:
  - Home: violet
  - Work: amber
  - Family: pink
  - School: blue
  - Pharmacy: green
  - Care: red
  - Other: slate/neutral

### CTA Visual Sync Contract

Decision-tree CTAs must reuse the same visual language as the address source they affect.

This prevents the selected-address screen from feeling like a new product surface after the
user has already learned the first-paint places row.

Rules:

- Saved-address CTAs use the saved-place orb system.
  - `Set as Home` uses the Home orb/icon/color.
  - `Set as Work` uses the Work orb/icon/color.
  - `Add to saved places` uses the Add/Saved Place orb treatment.
  - If the category already exists, copy changes to `Update Home` / `Update Work`, but the icon/color does not change.
- Pickup CTAs use pickup-location language.
  - `Find nearby hospitals` and `Use as pickup` use the pickup blue treatment.
  - They must not reuse Home/Work/Saved colors because they commit operational pickup truth, not saved address identity.
- Generic navigation CTAs stay neutral.
  - `Pick another location`, `Back`, `Cancel`, and `Edit details` use muted/neutral row treatment.
- Destructive CTAs are visually separate.
  - `Remove saved place` uses the destructive text/icon treatment, never a category orb color.
- The same action rendered in different modes must keep the same icon/color family.
  - A Home action in search, manual, recent, or saved-place management always looks like Home.
  - A pickup action in search, manual, recent, or saved-place management always looks like pickup.

### Saved Place Selected

```txt
default
  â†“ tap saved orb / row
candidateDecision
  Address group
  CTA group
    Find nearby hospitals / Use as pickup
    Edit saved place
    Refresh address
    Remove saved place
    Pick another location
```

### Manual Address Completed

```txt
manualStep
  â†“ geocode succeeds
candidateDecision
  Address group
  CTA group
    Find nearby hospitals / Use as pickup
    Set as Home
    Set as Work
    Add to saved places
    Edit manual details
```

### Recent Selected

```txt
default/search
  â†“ tap recent
candidateDecision
  Address group
  CTA group
    Find nearby hospitals / Use as pickup
    Set as Home
    Set as Work
    Add to saved places
    Pick another location
```

---

## Emergency And Regular Visit Semantics

### Emergency Flow

Pickup truth is required before emergency operations feel trustworthy.

Rules:

- If pickup is missing, LocationSheet can auto-open.
- If pickup is stale/fallback, the UI must name that state.
- Emergency commit payload must include:
  - coordinates
  - formatted address when available
  - unit/landmark
  - responder note
  - source/confidence
- Saved address selection may reduce typing, but must not hide current operational pickup truth.

### Regular Visit Flow

Regular visits can tolerate more browsing, but still need a pickup/reference area for:

- nearby hospital/service discovery
- availability
- pricing/country rules
- transport add-ons

Rules:

- Search can start as care search, but address results still produce candidates.
- `Find nearby hospitals` should be available for an address candidate.
- Regular visit flows can allow saved address management without emergency urgency copy.

---

## User Identity Rules

### Guest

- `ownerUserId = "guest"`.
- Saved addresses are local only.
- Search recents are local only.
- If the guest signs in, offer silent migration or one-time merge:
  - exact duplicate address/coords are deduped
  - Home/Work conflicts prefer authenticated existing values
  - guest-only categories become local authenticated entries

### Authenticated Patient

- `ownerUserId = user.id`.
- Local saved addresses are available offline.
- `profiles.address` remains a legacy/home-text fallback.
- Future sync can persist to `saved_addresses`.

### Provider / Driver / Admin

- Saved patient addresses are not provider-owned operational truth.
- Provider/driver location is responder telemetry, not saved address memory.
- Admin can inspect operational request locations through emergency request data, not user saved-address CRUD.

---

## Future Cloud Table

Do not add this table for the current LocationSheet UI pass unless cross-device sync becomes required. When needed:

```sql
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('home', 'work', 'family', 'school', 'pharmacy', 'care', 'other')
  ),
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  country_code TEXT,
  unit TEXT,
  responder_note TEXT,
  provider TEXT,
  place_id TEXT,
  quality JSONB DEFAULT '{}',
  usage JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved addresses"
ON public.saved_addresses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Index plan:

- `(user_id, category)`
- `(user_id, updated_at DESC)`
- optional unique partial index for one Home and one Work:
  - `WHERE category IN ('home', 'work')`

---

## Implementation Passes

### Pass 0 - Stabilize Current First Paint

Goal: preserve the current LocationSheet layout while deeper behavior changes land.

- Keep default/mid-snap sections visually stable.
- Keep section headers aligned with Explore Intent section language.
- Keep hero card simple: address surface plus right meta CTA.
- Keep Places and Recents on first paint as read-only entry points until their decision trees are wired.
- Do not add new modal systems; nested work stays inside LocationSheet.

Done when:

- Existing default, search-entry, manual-entry, places, and recents surfaces still render with the current sheet rules.
- Back/close behavior from nested modes does not close the whole LocationSheet unless the user is at `default`.

### Pass 1 - Domain Model And Store Hardening

- Add `locationAddressService` as a thin domain adapter over existing code, not a new persistence owner.
- Keep `locationStore.savedLocations` as the source of truth and migrate its entries into `SavedAddress` compatibility shape.
- Keep `savedLocationsSyncService` as the current cloud/preferences sync path.
- Normalize current saved locations into `SavedAddress` without breaking legacy `latitude` / `longitude` readers.
- Add owner scoping.
- Add category/color/icon metadata.
- Add CRUD result/status fields around the existing actions so UI can show saving, saved, failed, and duplicate states.
- Add stable selectors for:
  - Home
  - Work
  - pinned saved places
  - saved places by category
  - recent address candidates
- Consolidate coordinate and suggestion normalization through existing helpers before adding new mapping code.
- Keep legacy saved-location compatibility so current stored users do not lose data.

Done when:

- Search/manual/recent/saved flows can all ask one service for an `AddressCandidate`.
- Saved Home/Work update in place.
- Other saved categories can create multiple stable-id entries.
- UI can determine whether a CTA should read `Set as Home` or `Update Home`.
- No new duplicate saved-address store, search hook, geocoder wrapper, or suggestion mapper has been introduced.

### Pass 2 - Profile Address Link

Goal: connect saved address identity to user identity without pretending the profile table is a full location system.

- Treat `profiles.address` as a legacy Home text fallback.
- On authenticated hydrate, seed Home only if:
  - no local Home exists for the user
  - profile address is usable
  - coordinates can be resolved or the entry is marked as needing confirmation
- On Home update, optionally update `profiles.address` text only.
- Keep coordinates, unit, responder note, source, quality, and sync metadata in the saved-address model.
- Keep guest saved addresses separate from authenticated saved addresses.

Done when:

- Profile address can help first-run Home setup.
- Profile address never overwrites a stronger local saved Home without an explicit user action.
- The future `saved_addresses` cloud table can be added without changing LocationSheet UI contracts.

### Pass 3 - Search Candidate Decision Tree

- Keep search results, manual success, saved selection, and recent selection unified through `candidateDecision`.
- Render one address group and one CTA group.
- Add `Find nearby hospitals`, `Use as pickup`, `Set Home`, `Set Work`, and `Add to saved places`.
- Match CTA visual sync:
  - pickup actions use pickup blue
  - Home/Work actions use their saved-place orb identities
  - generic actions stay neutral
- Search focus expands the sheet and switches to search mode.
- Selecting a prediction moves to `candidateDecision`, frames the map to the candidate, and does not commit pickup yet.
- Search recents render inside search mode without pushing the whole default layout down.

Done when:

- A selected search address can be used as pickup, used to find nearby hospitals, saved as Home, saved as Work, or sent to the save-category flow.
- Back from the candidate returns to search results.
- Close from candidate returns to default/search parent state according to the current stack, not the whole sheet.
- Search behavior does not introduce a new query cache, provider adapter, or suggestion mapper.

#### Pass 3A - Search Shell State

Goal: entering search changes the sheet state, not the default layout.

- Search input focus:
  - expands the sheet
  - pushes `addressSearch` onto the LocationSheet stack
  - changes the left header icon to Back
  - changes close behavior to return to `default`
- Search shell body:
  - current pickup blade
  - active input
  - recent searches when query is empty
  - predictions/results when query has enough signal
  - compact loading/error/empty states
- No first-paint Places/Recents sections render underneath active search results.

Closed-loop rule:

- `default -> addressSearch -> default` must be possible without changing pickup, saved places, recents, or map route state.

#### Pass 3B - Search Query And Result State

Goal: search results are temporary candidates, not app truth.

Pre-flight consolidation:

- Use `hooks/search/useLocationSearchQuery.js` as the target search query path.
- Do not add another debounce/search hook inside LocationSheet.
- Normalize `mapboxService.suggestAddresses` callers to one signature before expanding search behavior.
- Existing mismatch to resolve: `SearchContext.jsx` passes `{ query }`, while `mapboxService.suggestAddresses` expects a string plus optional proximity.
- Consolidate suggestion mapping around `mapSearchSheet.helpers.mapSuggestionToLocation`; do not add a LocationSheet-only mapper.
- Existing duplicate mappers in `MapLocationModal.jsx` and `EmergencyLocationSearchSheet.jsx` should be migration targets, not patterns to copy.

- Query state owns:
  - typed value
  - debounced value
  - loading state
  - error state
  - prediction list
  - recent query list
- Result selection:
  - normalizes the result into `AddressCandidate`
  - stores it as `activeCandidate`
  - records search history
  - frames the map to candidate coordinates
  - collapses or rests the sheet according to current breakpoint rules
  - moves to `candidateDecision`
- Result selection does not:
  - commit pickup
  - overwrite Home/Work
  - create saved address
  - reset hospital route state

Closed-loop rule:

- `addressSearch -> candidateDecision -> addressSearch` returns to the same query/results when possible.

#### Pass 3C - Candidate Decision Surface

Goal: every selected address uses the same decision surface.

- The surface has exactly two groups:
  - Address group
  - CTA group
- Address group renders:
  - label
  - formatted address
  - source/confidence only when useful
  - unit/note if already present
- CTA group renders action rows from a pure action builder:
  - `findNearbyHospitals`
  - `useAsPickup`
  - `setHome` or `updateHome`
  - `setWork` or `updateWork`
  - `addToSavedPlaces`
  - `pickAnotherLocation`
- CTA labels depend on context, but action ids do not.
- CTA visuals follow the CTA Visual Sync Contract.

Closed-loop rule:

- The UI never decides directly. It emits an action id plus the active candidate.

#### Pass 3D - Pickup Commit Actions

Goal: operational pickup commits happen only through explicit pickup CTAs.

- `findNearbyHospitals`:
  - maps candidate to pickup payload
  - commits pickup
  - resets hospital/route state as required by `useMapLocation`
  - returns to Explore/Hospital discovery context
- `useAsPickup`:
  - maps candidate to pickup payload
  - commits pickup
  - returns to the source context:
    - Explore Intent
    - emergency edit pickup
    - payment/tracking edit pickup
    - regular visit flow
- Neither action creates a saved address unless the user explicitly chooses a save action.

Closed-loop rule:

- Pickup commit exits the search decision loop intentionally. Back should not undo committed pickup; a new edit starts a new loop.

#### Pass 3E - Home And Work Shortcut Actions

Goal: Home/Work CTAs are fast paths into saved-address CRUD, not special UI branches.

- `setHome` / `updateHome`:
  - sets `pendingSaveCategory = "home"`
  - moves through the same validation/save service as the save-category flow
  - updates existing Home in place when one exists
- `setWork` / `updateWork`:
  - sets `pendingSaveCategory = "work"`
  - uses the same validation/save service
  - updates existing Work in place when one exists
- Success state offers:
  - `Use as pickup`
  - `Find nearby hospitals`
  - `Done`
- Failure state offers:
  - `Try another address`
  - `Edit details`
  - `Cancel`

Closed-loop rule:

- Home/Work shortcut actions cannot bypass saved-address status states.

#### Pass 3F - Add To Saved Places Branch

Goal: generic save enters the reusable save sub-flow.

- `addToSavedPlaces` pushes `saveCategory`.
- `saveCategory` chooses category with solid category orbs.
- `saveDetails` confirms label/unit/note.
- Save actions:
  - `Save place`
  - `Save and use as pickup`
- Back path:
  - `saveDetails -> saveCategory`
  - `saveCategory -> candidateDecision`
  - `candidateDecision -> addressSearch`
- Close path:
  - nested save states return to `candidateDecision`
  - candidate close returns to search/default source

Closed-loop rule:

- The selected candidate remains stable through the whole save branch until replaced by explicit search/manual/recent selection.

#### Pass 3G - Recent Search Branch

Goal: recents behave like search results with less typing.

- Empty search state shows recent search/address candidates.
- Tapping a recent:
  - normalizes it to `AddressCandidate`
  - frames map to candidate
  - enters `candidateDecision`
- Recents can be promoted to Home/Work/saved places or used as pickup.

Closed-loop rule:

- Recent selection uses the same candidate decision actions as search predictions.

#### Pass 3H - Navigation And Stack Contract

Goal: every step has a deterministic parent and no modal leakage.

State stack examples:

```txt
default
  -> addressSearch
  -> candidateDecision
  -> saveCategory
  -> saveDetails
```

```txt
default
  -> addressSearch
  -> candidateDecision
  -> savedFeedback
```

Rules:

- Header Back pops one state.
- Close from nested state returns to the nearest stable parent:
  - save states close to `candidateDecision`
  - candidate closes to `addressSearch` when search was the source
  - search closes to `default`
- Close at `default` closes the LocationSheet.
- Wide sidebar uses the same stack; layout breakpoint cannot change navigation semantics.
- Map clicks do not act as hidden close controls for this flow.

Closed-loop rule:

- There is one stack owner for LocationSheet. Child components receive callbacks; they do not mutate sheet mode directly.

#### Pass 3I - Map And Hospital Side Effects

Goal: map movement is preview until pickup commit.

- Search result/recent selection:
  - preview frames the map to the candidate
  - may show candidate marker
  - does not reset hospital route state
- Pickup commit:
  - updates pickup truth
  - recalculates nearby hospitals as needed
  - resets route/polyline state according to existing map flow contracts
- Saved-address save:
  - does not move hospital state unless paired with `Save and use as pickup`

Closed-loop rule:

- Preview side effects and commit side effects are separate functions.

#### Pass 3J - Implementation Boundaries

Goal: prevent UI leakage.

- `locationAddressService` owns normalization and payload mapping.
- `locationSheetNavigation` owns stack transitions.
- `locationSheetActions` builds CTA rows from:
  - active candidate
  - source context
  - existing saved addresses
  - pickup state
- Stage components render rows and emit action ids.
- Store actions own saved-address mutations.
- `useMapLocation` owns pickup commits and map-flow reset.

Closed-loop rule:

- Components do not inspect low-level storage shape or manually decide Home/Work conflict behavior.

### Pass 4 - Guided Manual Address Flow

Manual entry is not a raw multi-field form. It is an assisted fallback for users who cannot find the place through search, and it must still produce the same `AddressCandidate` used by search, recents, and saved places.

The manual flow must support saved-address creation and pickup commit without special cases.

#### Pass 4A - Manual Shell State

Goal: manual entry is a nested LocationSheet state with the same back/close rules as search.

- `default -> manualStep`
- Header left action is Back.
- Close from a manual step returns to the previous stable LocationSheet state.
- Manual step state owns a draft, not pickup truth.
- Manual cannot commit anything until validation/geocode produces finite coordinates.

Closed-loop rule:

- `manualStep -> default` must be possible without changing pickup, saved places, recents, profile address, or map route state.

#### Pass 4B - Assisted Field Strategy

Goal: reduce typing without forcing users into country-code or raw-address knowledge.

Manual steps:

```txt
Country or region
State / province / region
City
Street or place
Apartment, unit, landmark
Responder note
Review on map
```

Input behavior:

- Country is selected from a friendly country picker, not typed as a code.
- State/region is assisted by API suggestions when available, otherwise typed with validation.
- City is assisted by API suggestions constrained by country and state/region when available.
- Street/place is assisted by API suggestions constrained by country, state/region, city, and proximity when available.
- Unit/landmark and responder note remain free text because they often do not exist in public address APIs.

Closed-loop rule:

- Each assisted step returns a partial draft. Only the final review step can create an `AddressCandidate`.

#### Pass 4C - Address API Boundary

Goal: use Mapbox where it helps, but isolate provider details behind an app service.

Planned service:

- `services/addressAssistService.js`

Responsibilities:

- `suggestCountries(query)`
- `suggestRegions({ countryCode, query })`
- `suggestCities({ countryCode, region, query })`
- `suggestStreetsOrPlaces({ countryCode, region, city, query, proximity })`
- `resolveManualDraft(draft)`
- `parseAddressComponents(providerFeature)`

Provider strategy:

- Prefer Mapbox Search Box / Address Autofill style suggest-and-retrieve for interactive address assistance when enabled.
- Use Mapbox Geocoding structured/freeform geocode as the validation fallback.
- Keep OpenStreetMap/Nominatim as a no-token fallback only for geocoding, not primary assisted UX.
- Store provider metadata on the candidate so future revalidation can use the same provider context.
- Reuse `utils/addressQualityValidator.js` as the quality entry point, but wrap it by context.
- Manual validation must support POIs, landmarks, hospitals, apartments, and international formats.
- Street-number/street-type checks are helpful warnings for street addresses, not hard rejection rules for every manual location.

Closed-loop rule:

- LocationSheet never calls provider APIs directly. It asks `addressAssistService` for suggestions or resolution.

#### Pass 4D - Manual Draft To Candidate

Goal: manual output joins the same candidate decision tree as search.

- Draft fields:
  - country label/code
  - region label/code when available
  - city
  - street/place
  - unit/landmark
  - responder note
- On review:
  - build a formatted address string
  - geocode/resolve through `addressAssistService`
  - validate finite coordinates
  - normalize into `AddressCandidate`
  - enter `candidateDecision`
- On failure:
  - keep the draft
  - show recovery actions:
    - edit current step
    - try search instead
    - cancel

Closed-loop rule:

- Manual success does not commit pickup or save address. It only creates `activeCandidate`.

#### Pass 4E - Manual Save And Pickup Reuse

Goal: manual candidates use the same CTA tree as search candidates.

- Candidate from manual renders the same:
  - Address group
  - CTA group
- CTA actions:
  - Find nearby hospitals
  - Use as pickup
  - Set/Update Home
  - Set/Update Work
  - Add to saved places
  - Edit manual details
- `Edit manual details` returns to the relevant manual step with the draft preserved.

Closed-loop rule:

- Manual has no separate save implementation. It uses saved-address actions and pickup commit actions.

### Pass 5 - Save Category Flow

- Add `saveCategory` and `saveDetails` modes.
- Use solid category orbs.
- Add back-stack header behavior for every nested step.
- Reuse the selected address group above the save flow CTAs.
- Category step decides:
  - Home
  - Work
  - Family
  - School
  - Pharmacy
  - Care
  - Other
- Details step edits:
  - label
  - unit/landmark
  - responder note
- Saving exposes:
  - validating
  - saving
  - saved
  - failed

Done when:

- `Add to saved places` can complete without leaving LocationSheet.
- `Save place` and `Save and use as pickup` are both supported.
- Home/Work conflicts become update flows, not duplicates.

### Pass 6 - Manage Saved Place

- Add saved-place manage state:
  - use as pickup
  - edit label/details
  - refresh address
  - remove
- Reuse the same address group and CTA group structure.
- Destructive remove uses destructive styling and confirmation in-sheet.
- Refresh address keeps the existing saved address visible while validation runs.
- Fix the existing refresh contract before exposing refresh broadly:
  - `useSavedLocationRefresh` currently calls `mapboxService.reverseGeocode({ latitude, longitude })`.
  - `mapboxService.reverseGeocode` currently expects `(lat, lng)` and returns a formatted string.
  - Choose one service contract and normalize the hook/service pair before adding UI around refresh.
- Refresh should update address text, parsed parts, quality, `updatedAt`, and sync status without changing category or usage history.

Done when:

- Home/Work/Other saved addresses can be edited and removed from LocationSheet.
- Removing Home/Work updates first paint immediately.
- Failed refresh/remove/edit states are recoverable without closing the sheet.

### Pass 7 - Mini Profile Address Entry

Goal: make address management reachable from the mini profile without creating another location surface.

- Add an address/location CTA to the mini profile CTA group.
- The CTA opens LocationSheet with source metadata:
  - `source: "miniProfile"`
  - optional return target
  - optional preferred mode such as `default` or `savedManage`
- Mini profile does not own saved-address CRUD.
- Mini profile does not render a separate address modal.
- LocationSheet remains the owner of search, saved places, manual entry, candidate decision, and manage flows.

Done when:

- A user can reach address management from mini profile.
- Back/close returns to the expected mini profile/map context.
- Saved address edits update first paint and mini profile summaries through shared state.

### Pass 8 - Cloud Sync Preparation

- Keep local-first behavior as the product default.
- Continue using `savedLocationsSyncService` and `preferences.view_preferences.savedLocations` as the current remote lane.
- Add sync metadata writes without requiring the remote table.
- Prepare guest-to-user migration helpers.
- A future `savedAddressSyncService` boundary may wrap the existing service name/path, but it must not create a second cloud truth.
- Keep the dedicated `saved_addresses` table as a deferred schema pass until cross-device conflict resolution requires stronger semantics.

Done when:

- The app is ready for a `saved_addresses` table later.
- Local UX does not depend on network availability.
- Sync failure cannot block local pickup selection.
- There is still only one active saved-address sync lane.

### Pass 9 - Device Location Failure And Recovery

Goal: make current-location behavior trustworthy in emergency and regular flows.

States:

- `unknown`
- `requestingPermission`
- `permissionDenied`
- `permissionRestricted`
- `locating`
- `available`
- `stale`
- `unavailable`
- `usingLastKnown`

UI rules:

- Current-location cards must name degraded states clearly.
- Do not show stale/last-known pickup as live GPS.
- Retry current location is an explicit CTA.
- `Use last known location` is allowed only when labeled as last known.
- Emergency flow can continue with a lower-confidence location only after visible confirmation.

Data rules:

- Store timestamp and source for device-derived coordinates.
- Store confidence and freshness on pickup candidates.
- Current-location failure never blocks saved address/manual/search alternatives.

Done when:

- Permission denied/restricted/stale/unavailable each has a visible recovery path.
- Device location candidates enter the same `candidateDecision` path when they need confirmation.
- Live current location can still commit directly only when high-confidence and user explicitly chooses it.

### Pass 10 - Pin Adjust And Map Picker

Goal: support future map-based correction without disturbing search/manual/saved architecture.

Modes:

- `pinAdjust`
- `pinResolving`
- `pinCandidate`

Flow:

```txt
candidateDecision / current pickup
  -> Adjust on map
pinAdjust
  -> drag / move map
pinResolving
  -> reverse geocode
pinCandidate
  -> candidateDecision
```

Rules:

- Dragging a pin previews coordinates only.
- Reverse geocode creates a candidate with confidence.
- Low-confidence reverse geocode asks for label/unit/note before commit.
- Pin adjustment never edits saved Home/Work unless the user chooses a saved-address CTA afterward.

Done when:

- Pin adjustment outputs `AddressCandidate`.
- Back returns to the previous candidate/current-location state.
- Cancel leaves pickup and saved addresses unchanged.

### Pass 11 - Address Quality And Confidence UX

Goal: make address safety visible without making the sheet noisy.

Quality signals:

- coordinate validity
- provider accuracy
- address completeness
- unit/landmark presence
- responder note presence
- freshness for device/current-location sources

Confidence:

- `high`
- `medium`
- `low`

UI rules:

- High confidence stays quiet.
- Medium confidence can show a muted inline note.
- Low confidence shows a recovery prompt before emergency commit.
- Emergency copy should be direct and calm:
  - `Add unit or landmark`
  - `Confirm this is where responders should go`
  - `Address may be approximate`
- Regular visit flow can be softer and less blocking.

Done when:

- Candidate decision can render confidence hints without new layout branches.
- Low-confidence emergency pickup requires explicit confirmation.
- Saved-address quality issues can be repaired from Manage Saved Place.

### Pass 12 - Recent Address Memory

Goal: make recents useful across search, manual, pickup, and visits without duplicating saved places.

Recent types:

- `searchResult`
- `manualCandidate`
- `pickupUsed`
- `savedAddressUsed`
- `visitedFacility`

Rules:

- Recents store address candidates, not raw provider responses.
- Saved places and recents dedupe by coordinate/address similarity.
- Saved places win visual priority over duplicate recents.
- Recents can be cleared.
- Recents can expire or be trimmed by count.
- Tapping a recent enters `candidateDecision`.

Done when:

- Search-empty state can show recent address candidates.
- Default recents can mix recent addresses and recent visit destinations without custom row systems.
- A recent can become pickup, Home, Work, or saved place through the same CTA tree.

### Pass 13 - Offline And Poor Network Behavior

Goal: location management remains useful when network is weak.

Rules:

- Saved addresses are available offline.
- Current GPS can produce a coordinate-only candidate if reverse geocode fails.
- Search and assisted manual steps show unavailable states, not blank results.
- Manual draft can be preserved if geocoding fails.
- Local saved-address CRUD succeeds without cloud sync.
- Sync failure is visible only where relevant and never blocks pickup commit.

Done when:

- Offline users can still use saved addresses and current coordinates.
- Search/manual geocode failures keep recovery actions visible.
- No network failure silently closes or resets the sheet.

### Pass 14 - Privacy And Safety

Goal: treat saved addresses and responder notes as sensitive user data.

Rules:

- Do not log full saved addresses, precise coordinates, unit, or responder notes in analytics.
- Debug logs should redact address text outside local development.
- Sign-out behavior must define whether authenticated saved addresses remain cached or are cleared.
- Guest saved addresses remain local and separate.
- Remove saved place deletes local record and future sync tombstone when cloud sync exists.
- Responder note copy should imply operational use, not broad profile visibility.

Done when:

- Analytics payloads use coarse event names and source/category only.
- Deletion semantics are documented and implemented locally.
- User identity transitions do not expose one user's saved address to another user on the same device.

### Pass 15 - Accessibility And Input Ergonomics

Goal: make the LocationSheet usable with screen readers, keyboard, large text, and touch.

Rules:

- Every orb/action row has a clear accessibility label and role.
- Header Back and Close labels change with mode.
- Loading, saving, and failure states announce status.
- Manual step transitions move focus to the next meaningful input.
- Large text cannot hide CTAs below unreachable scroll areas.
- Web keyboard users can tab through search, candidates, save flow, and back/close controls.
- Terminal CTAs live in a sticky footer when the sheet body can scroll.
- Expanded sheet states can reveal more context, but they must not bury the current decision CTA beneath scroll content.

Done when:

- Search, candidate decision, save flow, manual flow, and manage saved place have accessibility labels.
- Manual select/typeahead controls are keyboard reachable on web.
- Primary CTAs remain reachable in mid-snap and expanded sheet states.
- Users never need to discover hidden scrolling to finish the active location decision.

### Pass 16 - Sheet Transition And Loading State Contract

Goal: make LocationSheet mode changes feel like one graceful surface refocusing, never a blank or glitchy swap.

Transition states:

- `idle`
- `transitioning`
- `loading`
- `ready`
- `recover`
- `failed`

Rules:

- Keep the sheet shell mounted during mode changes.
- Use `MapPhaseTransitionView` or a shared equivalent for phase body changes.
- Preserve the previous stable surface until the next surface has a renderable shell.
- Search loading renders result-shaped rows.
- Manual geocoding preserves the current manual/review body and shows inline progress.
- Save/update/remove preserves the address group and shows CTA pending state.
- Candidate decision never renders a blank body while action rows are being derived.
- Expanded sheet states must not flash white between phase changes on web.
- Mobile phase swaps should use short opacity/translate transitions, not uncontrolled hard swaps.

Done when:

- `default -> addressSearch -> candidateDecision -> saveCategory -> saveDetails` has no blank intermediate frame.
- Loading states match the final layout shape.
- Failed states recover in place without closing the sheet.
- Transition animation never delays accepted side effects like search, geocode, save, or pickup commit.

### Pass 17 - Test And Observability Harness

Goal: protect the decision tree from regressions.

Tests:

- domain normalization tests
- saved-address CRUD tests
- Home/Work update-in-place tests
- profile fallback tests
- navigation stack tests
- search result to candidate tests
- manual draft to candidate tests
- pickup commit boundary tests
- recents dedupe tests

Privacy-safe events:

- `location_search_started`
- `location_candidate_selected`
- `location_pickup_committed`
- `saved_address_created`
- `saved_address_updated`
- `manual_location_started`
- `manual_location_resolved`
- `location_permission_denied`
- `location_resolution_failed`

Event rules:

- No full address text.
- No unit/landmark.
- No responder note.
- No precise coordinates.

Done when:

- Core reducers/services are covered by focused tests.
- Navigation stack behavior is covered without relying only on manual QA.
- Analytics events can explain failure/drop-off without exposing sensitive location data.

---

## Non-Negotiables

- No search result commits pickup immediately.
- No manual location commits without finite coordinates.
- No stale GPS disguised as live pickup.
- No separate saved-address modal system; reuse LocationSheet states.
- Every nested state has top-left Back and a clear Cancel/close behavior.
- Saved address CRUD must be local-first and offline-safe.
- Home/Work update in place; they do not duplicate.
- Category orbs remain visually stable across first paint and save flows.

---

## Feasibility Cross-Check

The plan is feasible with the current app architecture. The app already has the right foundations:

- Zustand stores for persisted cross-surface state.
- Local database storage through `StorageKeys`.
- Existing `locationStore` ownership for user location and saved locations.
- Existing `useMapLocation` ownership for pickup commits, billing country updates, and map/hospital reset behavior.
- Existing `SearchContext` for recent query memory.
- Existing `preferences.view_preferences` saved-location sync lane.
- Existing map sheet surfaces, grouped rows, orb buttons, header controls, and stage shells.

### Feasible Now

These passes can be implemented without schema changes:

- Pass 0: stabilize first paint.
- Pass 1: domain model and store hardening.
- Pass 3: search candidate decision tree.
- Pass 4: guided manual address flow.
- Pass 5: save category flow.
- Pass 6: manage saved place.
- Pass 7: mini profile address entry.
- Pass 9: device location failure and recovery.
- Pass 11: address quality and confidence UX.
- Pass 12: recent address memory.
- Pass 13: offline and poor network behavior.
- Pass 15: accessibility and input ergonomics.
- Pass 16: sheet transition and loading state contract.
- Pass 17: test and observability harness.

### Feasible With Small Refactors

These are feasible, but should be done behind clean boundaries before UI wiring:

- `locationAddressService`
  - needed so current saved-location shape can migrate safely into `SavedAddress`.
- `addressAssistService`
  - needed so manual entry can use Mapbox Search Box / Autofill style assistance without sheet components calling provider APIs directly.
- `useLocationSheetNavigation`
  - needed because current LocationIntent uses direct `setMode` calls; the closed-loop model needs one stack owner.
- `useSavedAddressActions`
  - needed because current UI calls `addSavedLocation` / `updateSavedLocation` directly.
- `useAddressCandidateController`
  - needed to separate preview candidate state from committed pickup truth.
- Saved-location refresh cleanup
  - current refresh hook should align with `mapboxService.reverseGeocode(lat, lng)` or the service should accept an object shape consistently.
- SearchContext suggestion cleanup
  - current SearchContext should call the same address-search service boundary as LocationSheet so search suggestions do not fork by surface.

### Existing Constraints To Respect

- `locationStore.savedLocations` is already persisted locally and synced to `preferences.view_preferences`.
  - Do not create a competing persistence path for the first implementation pass.
  - Evolve this lane first, then add a dedicated `saved_addresses` table later if cross-device location identity needs stronger semantics.
- `profiles.address` is only text.
  - It can seed or mirror Home text.
  - It cannot own coordinates, unit, responder note, quality, usage, or sync state.
- Current manual flow already geocodes through Mapbox and falls back to OpenStreetMap.
  - Keep that safety rule.
  - Add assisted state/city/street suggestions through `addressAssistService`.
- Current search result selection creates a candidate object.
  - Keep candidate branching unified through `candidateDecision`, not another parallel state.

### Deferred Or Optional For First Production Pass

These are feasible but should not block search/saved/manual completion:

- Dedicated `saved_addresses` Supabase table.
- Full cloud conflict resolution.
- True draggable pin map picker.
- Exhaustive state/city/street dropdown datasets for every country.
- Permanent geocoding storage changes beyond the app's existing saved-location sync behavior.

### Risk Assessment

- **Low risk:** candidate decision UI, CTA visual sync, Home/Work update-in-place, local CRUD status, recents promotion.
- **Medium risk:** owner-scoped migration of existing saved locations, profile Home seeding, manual address assistance, navigation stack replacement.
- **High risk if rushed:** cloud sync conflict resolution, schema migration, pin-adjust map picker, privacy-sensitive analytics.

Implementation recommendation:

1. Harden local saved-address model and services first.
2. Add navigation/action builders before adding more UI states.
3. Wire search candidate decisions.
4. Wire manual candidate decisions.
5. Wire save/manage flows.
6. Leave cloud table and pin drag for later controlled passes.
