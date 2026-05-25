---
status: living
owner: product
last_updated: 2026-05-17
---

# Explore Care Feature Dossier V1

Status: Implemented, runtime verification pending
Documented: 2026-05-16
Scope: map screen explore mode — non-emergency nearby provider discovery

## Product Goal

When a user is on the map but does not have an active emergency, they can discover nearby non-emergency care providers (pharmacies, labs, clinics, dentists, optometrists, specialist centers) by tapping a category chip inside the Choose Care modal.

The product goal is simple:

- no new navigation route — user stays on `/map`
- category chip tap → sheet of nearby providers + colored map pins
- tapping a pin highlights it; tapping a card in the sheet highlights the matching pin
- closing the sheet resets the map to its default state
- emergency flow is completely unaffected

Primary use case:

After an emergency resolves, or during a non-urgent situation, the user needs to find a pharmacy, lab, or specialist without calling anyone or leaving the app.

## Source Audit

### Local iVisit References

- `docs/REFACTORING_GUARDRAILS.md`
  - five-layer rule: Supabase/Realtime → TanStack Query → Zustand → XState → Jotai
  - useEffect rule: effects only for real side effects
- `docs/flows/emergency/MAP_SCREEN_IMPLEMENTATION_RULES_V1.md`
  - MapScreen must stay thin
  - map screen owns lifted modals that must survive sheet phase transitions
- `docs/architecture/map/MAP_EXPLORE_FLOW_MODULARIZATION.md`
  - explore flow is already modular; explore care must not bloat MapScreen
- `components/map/MapCareHistoryModal.jsx`
  - Choose Care modal — owns entry chips
- `components/emergency/intake/EmergencyLocationPreviewMap.jsx`
  - map surface — `extraMarkers` prop now available for additional marker layers
- `services/hospitalsService.js`
  - `discoverNearbyProviders` — category-aware Places fetch

### Supabase References

- `nearby_hospitals` RPC — emergency path, strict `provider_type='hospital' AND emergency_eligible=true` filter
- `nearby_providers` RPC — explore path, category-scoped, no emergency filter

## Product Definition

Feature name: Explore Care

Domain meaning:
- non-emergency nearby provider discovery from the map screen
- provider list scoped to one category at a time
- map pins scoped to the same category, rendered via `ProviderMarkers`
- lifecycle is ephemeral: reset on close, no persistence

Out of scope for v1:
- provider detail screen (deep-link into directions/booking)
- multiple simultaneous categories
- saved/favorited providers
- provider reviews or ratings UI
- realtime availability of non-hospital providers
- any emergency-flow interaction

## User Experience Contract

### Entry

Choose Care modal (`MapCareHistoryModal`):
- "Explore Nearby Care" section with category chips
- categories defined in `EXPLORE_CATEGORIES` constant
- tapping a chip closes the modal and opens the provider list sheet for that category

### Provider List Sheet

`MapProviderListSheet`:
- title = category label (e.g. "Nearby Pharmacies")
- skeleton loading — never blank
- bucket sections by travel time: < 5 min Â· 5–10 min Â· 10–20 min Â· 20+ min
- filter strip: Nearest / Featured / Sponsored
- empty state with category icon and copy
- close button → resets explore state, dismisses sheet and map pins

### Map Markers

`ProviderMarkers`:
- colored circular callout markers, color per `EXPLORE_CATEGORY_META[providerType].markerTint`
- only rendered when `exploreProviderCategory` is active and providers have loaded
- tapping a pin calls `handleSelectExploreProvider` → highlights selected pin
- provider list sheet card tap → also highlights pin via `exploreProviderIdAtom`

## Five-Layer State Architecture

### Layer 1: Supabase

Owns:
- canonical provider rows (from `hospitals` table + Google/Mapbox Places results)
- `nearby_providers` RPC for category-scoped queries

No new tables needed for v1.

### Layer 2: TanStack Query

Query key: `["providers", providerCategory, lat, lng, radius]`

Consumer facade:
- `useNearbyProviders({ providerCategory, location, enabled, radius, limit, includeGoogle })`

Zero-extra-request rule:
- `MapScreen` and `MapProviderListSheet` both call `useNearbyProviders` with the same default params → single cache entry, no duplicate fetches

### Layer 3: Zustand

Nothing new. Explore care state is ephemeral — Jotai only.

### Layer 4: XState

Nothing new. No lifecycle machine needed — open/close is boolean.

### Layer 5: Jotai

Atoms in `atoms/mapFlowAtoms.js`:
- `exploreProviderCategoryAtom` — which category chip is active (null = closed)
- `exploreProviderIdAtom` — which provider pin is selected (null = none)

Rules:
- atoms do not duplicate provider rows (those live in TanStack Query)
- atoms reset on close
- atoms survive sheet collapse without losing selection

## Database Design

No new tables. Uses existing `hospitals` table with `provider_type` discriminator column and `nearby_providers` RPC added in `supabase/migrations/20260219010000_core_rpcs.sql`.

## RPC Contract

### nearby_providers

Added to `supabase/migrations/20260219010000_core_rpcs.sql`.

Inputs:
- `p_lat FLOAT`
- `p_lng FLOAT`
- `p_provider_type TEXT`
- `p_radius_m INT DEFAULT 20000`
- `p_limit INT DEFAULT 15`

Behavior:
- no emergency filter
- returns providers within radius matching `provider_type`
- ordered by distance

## Frontend File Plan

### Constants

- `constants/providerTypes.js` — `PROVIDER_TYPES`, `EXPLORE_CATEGORIES`, `EXPLORE_CATEGORY_META`

### Service

`hospitalsService.js`:
- `discoverNearbyProviders(lat, lng, providerCategory, radius, options)`

### Query

- `hooks/emergency/useNearbyProviders.js`

### State

- `atoms/mapFlowAtoms.js` — `exploreProviderCategoryAtom`, `exploreProviderIdAtom`

### UI

- `components/map/MapCareHistoryModal.jsx` — Explore section + category chips
- `components/map/views/providerList/MapProviderListSheet.jsx` — bucketed provider list
- `components/map/ProviderMarkers.jsx` — category-colored map pins

### Map Integration

- `components/emergency/intake/EmergencyLocationPreviewMap.jsx` — `extraMarkers` prop
- `screens/MapScreen.jsx` — wiring: atoms, handlers, `useNearbyProviders`, `extraMarkers`, `MapProviderListSheet` mount
- `components/map/MapModalOrchestrator.jsx` — `handleExploreCare` prop passthrough

## Data Implementation Notes

**Critical Gap Identified:** The `hospitals` table schema contains hospital-specific fields (bed counts, ambulance counts, emergency level) that are **inapplicable to non-hospital providers** (pharmacy, lab, clinic, etc.). This results in sparse provider detail views.

### Short-Term Solution (No Schema Changes)

Use existing fields with **structured naming conventions** to encode provider-specific data:

**`specialties` array:**
- Pharmacy: `["prescription_services", "vaccination_services"]`
- Lab: `["blood_work", "urine_tests", "genetic_testing"]`
- Radiology: `["x_ray", "ct_scan", "mri", "ultrasound"]`
- Clinic: `["primary_care", "dermatology", "cardiology"]`
- Mental Health: `["individual_therapy", "group_therapy", "cbt"]`
- Women's Care: `["ob_gyn", "prenatal_care", "mammograms"]`
- Pediatrics: `["well_child_visits", "specialized_care"]`

**`service_types` array:**
- Pharmacy: `["prescription_filling", "vaccinations", "delivery"]`
- Lab: `["blood_draw", "urine_collection", "genetic_testing"]`
- Radiology: `["x_ray", "ct", "mri", "ultrasound"]`
- Urgent Care: `["minor_injuries", "illnesses", "x_ray", "lab"]`
- Clinic: `["checkups", "vaccinations", "minor_procedures"]`
- Mental Health: `["therapy", "counseling", "crisis_intervention"]`
- Women's Care: `["ob_gyn", "prenatal", "mammograms"]`
- Pediatrics: `["vaccinations", "well_child", "specialized_care"]`

**`features` flags:**
- `"24_hour"` - 24-hour availability
- `"telehealth"` - Telehealth available
- `"appointment_required"` - Walk-ins not accepted
- `"walkins_accepted"` - Walk-ins accepted
- `"delivery_available"` - Delivery services available
- `"crisis_line"` - Crisis line available
- `"midwife_services"` - Midwife care available
- `"pediatric_specialists"` - Pediatric specialists on staff

**`description` field:** Use for unstructured provider-specific info (insurance accepted, report turnaround, age range, doctors/providers list).

### UI Conditional Rendering

Hide hospital-specific fields for non-hospital providers:
```javascript
const isHospital = providerType === PROVIDER_TYPES.HOSPITAL;
// Show only if hospital:
// - availableBeds, totalBeds, icuBedsAvailable
// - ambulances, ambulancesCount
// - emergencyLevel, emergencyEligible, dispatchEligible
// - emergencyWaitTimeMinutes
```

### Fallback Images (Category-Specific)

✅ **Implemented:** Edge function now supports category-specific fallback images.
- 12 hospital images (expanded from 4)
- 8 images per category: pharmacy, lab, radiology, urgent_care, clinic, mental_health, womens_care, pediatrics

### Long-Term Solution (Schema Changes - Deferred)

After short-term solution is tested, consider creating separate `providers` table with provider-specific fields (`provider_services`, `provider_specialties`, `insurance_accepted`, `structured_hours`, `appointment_required`, etc.).

---

## Pass Plan

### Pass EXP-0: Architecture Review

Owner: CTO / System Architect

Goal: Confirm explore care is a non-emergency ephemeral query feature, not a new navigation domain.

### Pass EXP-1: Provider Taxonomy Constants

Owner: App Data

Goal: Define `PROVIDER_TYPES`, `EXPLORE_CATEGORIES`, and `EXPLORE_CATEGORY_META`.

### Pass EXP-2: Edge Function — Category-Aware Places Fetch

Owner: Backend

Goal: Extend `discover-hospitals` edge function to support category-scoped provider discovery.

### Pass EXP-3: Schema — Discriminator Columns + nearby_providers RPC

Owner: Backend

Goal: Add `provider_type` and `emergency_eligible` discriminator columns to `hospitals`; add `nearby_providers` RPC.

### Pass EXP-4: Service Adapter — Emergency Strict Filter

Owner: App Data

Goal: Add `discoverNearbyProviders` to `hospitalsService.js` and ensure `nearby_hospitals` RPC still filters `emergency_eligible=true`.

### Pass EXP-5: Choose Care Modal — Explore Section

Owner: UI / UX

Goal: Add "Explore Nearby Care" section with category chips to `MapCareHistoryModal`.

### Pass EXP-6: Provider List Sheet

Owner: UI / UX

Goal: Build `MapProviderListSheet` with time-bucket sections, filter strip, skeleton, and empty state.

### Pass EXP-7: Provider Markers

Owner: UI / UX

Goal: Build `ProviderMarkers` with tintColor per category for non-emergency map pins.

### Pass EXP-8: Provider Detail Views (deferred)

Owner: UI / UX

Goal: Shared provider detail shell + category CTAs. Deferred to v1.1.

### Pass EXP-9: Book Ride CTA

Owner: App Flow

Goal: Uber deep-link from provider card for navigation-to-provider.

### Pass EXP-10: Monetization Hooks

Owner: Product

Goal: Featured/sponsored flags on provider results.

### Pass EXP-DB: DB Migration Push + Docs Update

Owner: Backend

Goal: Apply `provider_type` discriminator and `nearby_providers` RPC to remote; update `MODULE_SCHEMA_BIBLE.md`.

### Pass EXP-NEARBY-UI: Nearby UI Polish

Owner: UI / UX

Goal: Time-bucket sections, skeleton, filter strip polish pass.

### Pass EXP-WIRE: MapScreen Wiring

Owner: Map Flow

Goal: Wire all Explore Care components into `MapScreen` — atoms, handlers, `useNearbyProviders`, `extraMarkers`, `MapProviderListSheet`.

## Regression Guardrails

Do not:
- affect the `nearby_hospitals` RPC emergency filter
- put explore provider query in `EmergencyContext`
- store provider rows in Jotai or Zustand
- create a new navigation route for explore care
- subscribe to realtime for explore providers (L1 is not needed for explore cache)
- add Supabase calls directly inside `MapScreen`
- show explore markers during an active emergency
- create a fix migration (edit pillar migrations only)

Must:
- keep emergency flow unaffected
- share the TanStack Query cache between `MapScreen` and `MapProviderListSheet`
- reset atoms on close
- use skeleton loading (no spinner, no blank)
- document every pass result before marking complete

## Acceptance Criteria

Product:
- category chip tap opens a provider list for the correct category
- provider list shows providers within 20km bucketed by travel time
- tapping a provider card highlights the matching pin
- tapping a pin highlights the matching card (via atom)
- close button resets all state and removes markers from the map
- emergency flow is unaffected

Architecture:
- TanStack Query owns all provider data (L2)
- Jotai owns category selection and selected provider id (L5)
- MapScreen stays thin — wiring only, no chat/query logic inline
- Zero extra network requests when sheet and map both show providers

## Rollback Plan

If query causes regressions:
- set `enabled={false}` on `useNearbyProviders` in MapScreen
- markers disappear; sheet still works independently

If markers cause map regressions:
- set `extraMarkers={null}` in MapScreen
- sheet still functional

If sheet causes regressions:
- remove conditional `MapProviderListSheet` mount from MapScreen
- atoms and markers can remain inert

If taxonomy columns cause RPC issues:
- `nearby_hospitals` RPC has its own strict filter; explore columns are additive and inert to emergency path
