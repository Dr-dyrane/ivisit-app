---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Enterprise Map Architecture Revamp (Pass Plan)

Date: 2026-04-25
Status: APPROVED / IN_PROGRESS

**Goal:** Establish a pristine, zero-cost, highly performant map architecture using Jotai, TanStack Query, and Mapbox. This plan completely eradicates legacy Google dependencies, duplicate UI logic, and prop-drilling anti-patterns in favor of atomic state management and mathematical optimization (Haversine Deadbanding).

## Execution Directives
Per our Global Architecture Rules:
- All logic is pushed down into specialized hooks (TanStack for server, Jotai for UI).
- `MapScreen` remains a pure orchestrator.
- Duplicate logic across search modals is collapsed into a single source of truth.

---

## Pass 1: Google Places Purge & Search Unification
**Objective:** Eradicate `googlePlacesService.js` and eliminate ~150 lines of duplicate `useState`/`useEffect` debouncing logic across the 3 search components.

1. **Create `hooks/search/useLocationSearchQuery.ts`**
   - Implement TanStack Query to wrap `mapboxService.suggestAddresses`.
   - Consume `searchAtoms.ts` for search query state.
2. **Refactor Search Modals**
   - `EmergencyLocationSearchSheet.jsx`
   - `MapLocationModal.jsx`
   - `useMapSearchSheetModel.js`
   - Replace manual `useEffect` timeouts and `requestIdRef` logic with the new hook.
3. **Delete Legacy Proxies**
   - Delete `services/googlePlacesService.js`.
   - Update `hospitalImportService.js` to call Mapbox natively (remove fallback).
   - Update `GlobalLocationContext.jsx` to remove the Google fallback branch.

---

## Pass 2: Algorithmic Routing Optimization (Haversine Deadbanding)
**Objective:** Replace string-truncation hacks with true mathematical distance thresholds to prevent redundant Mapbox Directions API calls.

1. **Refactor `hooks/emergency/useMapRoute.js`**
   - Introduce a `calculateDistance(origin, lastOrigin)` check.
   - Set a strict 15-meter "deadband". If movement < 15m, short-circuit and return cached TanStack polyline.
   - Remove the `toFixed(4)` coordinate key builder in favor of explicit coordinate tracking.

---

## Pass 3: State Drilling Eradication
**Objective:** Prevent render thrashing in the core Map loop by allowing leaf components to read route state natively, rather than passing it up and down via callbacks.

1. **Unify Route State**
   - Modify `useMapRoute.js` to synchronize directly with Jotai (`trackingRouteInfoAtom`) or export its TanStack query.
2. **Clean Orchestration Layer**
   - Remove the `onRouteInfoChange` callback from `EmergencyLocationPreviewMap.jsx`.
   - Remove the bridging state from `MapScreen.jsx`. Let the map render the route atomically.

## Pass 4: We need to upgrade the Supabase Edge Function that resolves hospital media.

Target file:
supabase/functions/hospital-media/index.ts

Goal:
Improve fallback image quality while preserving zero-cost operation and current redirect behavior.

Important:
This is a Supabase Edge Function.
Changes must be handled across:
1. Edge function code
2. Any frontend service/helper that calls hospital-media
3. Supabase function deployment flow

Do not introduce paid image APIs.
Do not re-enable Google Places photo fetching.
Do not break current hospital_id/place_id behavior.

Required changes:

1. Replace flat FALLBACK_IMAGES array with a categorized image library.

Use categories such as:
- hospital
- clinic
- emergency
- fallback

Each category should contain curated Unsplash image URLs with consistent medical/clinical tone.

2. Add deterministic category selection.

Keep the current hash-based deterministic behavior, but update it to support:

pickFallback(seed, category)

Same hospital/place should keep getting the same fallback image.

3. Add hospital type derivation.

Create a helper like:

deriveImageCategory(hospital)

Use available fields such as:
- hospital.name
- hospital.metadata if available
- hospital.type if available
- hospital.category if available

Default to "hospital".

Examples:
- name includes "clinic" -> clinic
- name includes "urgent" or "emergency" -> emergency
- otherwise -> hospital

4. Preserve current priority order:

Priority:
1. active hospital_media.remote_url if absolute URL
2. hospital.image if absolute URL and not pointing back to this function
3. categorized deterministic fallback

5. Preserve response behavior:
- Still return 302 redirect
- Still support GET and HEAD
- Still support CORS
- Still return 400 if neither hospital_id nor place_id is provided
- Still return fallback if hospital not found
- Still preserve cache headers

6. Improve cache handling:
- provider_photo source_type should remain no-store
- fallback/static images can remain public cached
- hospital_media remote URLs can remain cached unless provider_photo

7. Frontend/service check:
Search for all calls to the hospital-media function.
Verify no caller expects JSON.
Confirm callers expect a redirect/image URL behavior.
If any service hardcodes assumptions, update it safely.

8. Deployment:
After code changes:
- run type/lint check if available
- deploy/update Supabase function using the project-s existing command
- do not deploy blindly if local env/project ref is missing
- report the exact command used or the exact command I should run

Validation:
- hospital_id existing with active media redirects to media URL
- hospital_id existing without media redirects to categorized fallback
- place_id fallback works
- missing hospital_id/place_id returns 400
- method other than GET/HEAD/OPTIONS returns 405
- no Google Places API call exists
- no paid external API call exists

Report:
A. Files changed
B. Edge function changes
C. Frontend/service changes, if any
D. Validation performed
E. Supabase deploy command used or recommended
F. Any risks remaining
