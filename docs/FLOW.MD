> Latest context-enriched audit: `docs/audit/ARCHITECTURE_AUDIT_2026-04-08_CONTEXT_ENRICHED.md`

I'll audit the current emergency/map flow across app, Supabase, and docs, then return a concrete plan before any coding.

Created 5 todos

Searched codebase for "demo bootstrap hospitals emergency request help map location name reverse geocoding mapbox verified hospitals bed availability organization hospital ambulance driver doctor Supabase", no results

Thorough emergency audit

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/docs/flows/emergency/MASTER_REFERENCE_FLOW_V1.md#1-1), lines 1 to 100

Searched for files matching `**/*.md`, 50 matches

Searched for regex `demo|bootstrap|seed|fallback` (`ivisit-app`), 30 results

Read memory

Searched for regex `request.*help|emergency|map|hospital` (`ivisit-app` · `app/**`), 20 results

Searched for files matching `ivisit-app` · `screens/**`, 20 matches

Read memory [](file:///c%3A/Users/Dyrane/AppData/Roaming/Code/User/workspaceStorage/7cab7a50ed5c63a7c49cf7db420ec5d2/GitHub.copilot-chat/memory-tool/memories/repo/emergency_architecture_baseline_2026-04-07.md)

Read memory [](file:///c%3A/Users/Dyrane/AppData/Roaming/Code/User/workspaceStorage/7cab7a50ed5c63a7c49cf7db420ec5d2/GitHub.copilot-chat/memory-tool/memories/repo/demo_coverage_readiness.md)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/screens/WelcomeScreen.jsx)

Searched for regex `getHospitals|fetchHospitals|hospital.*map|marker` (`ivisit-app`), 30 results

Searched for regex `EmergencyMap|MapView|MapMarker` (`ivisit-app` · `components/**`), 25 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/screens/EmergencyScreen.jsx#1-1), lines 1 to 80

Searched for regex `useEmergency|useFetch|useHospital|useLocation` (`ivisit-app` · `hooks/**`), 25 results

Searched for regex `hospital|location|geocod|reverse|demo` (`ivisit-app` · `services/**`), 20 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/HospitalMarkers.jsx#1-1), lines 1 to 60

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/components/emergency/BottomSheetController.jsx#1-1), lines 1 to 80

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services)

Searched for regex `useHospitals|getHospitals|fetchHospitals|bootstrap` (`ivisit-app` · `hooks/**`), 13 results

Searched for regex `EmergencyContext|GlobalLocation|useLocation` (`ivisit-app` · `contexts/**`), 20 results

Searched for files matching `ivisit-app` · `supabase/**`, 20 matches

Searched for regex `geocod|reverse|placeId|placeName|locationName` (`ivisit-app` · `services/**`), 15 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/demoEcosystemService.js#1-1), lines 1 to 100

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/emergency/useHospitals.js#1-1), lines 1 to 100

Searched for files matching `ivisit-app` · `**request-help**`, no matches

Searched for files matching `ivisit-app` · `components/emergency/**`, 20 matches

Searched for regex `RequestAmbulance|EmergencyRequest|dispatch|hospital` (`ivisit-app` · `screens/**`), 15 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/components/emergency/EmergencyRequestModal.jsx#1-1), lines 1 to 120

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/screens/RequestAmbulanceScreen.jsx#1-1), lines 1 to 100

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js#1-1), lines 1 to 80

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/supabase)

Searched for regex `hospital|ambulance|organization|bed` (`ivisit-app` · `supabase/migrations/**`), 20 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/seed.sql#1-1), lines 1 to 100

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions)

Searched for regex `setAllHospitals|setHospitals|hospital|location|coordinates` (`ivisit-app` · `contexts/**`), 20 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/contexts/GlobalLocationContext.jsx#1-1), lines 1 to 150

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/hospitalsService.js#80-80), lines 80 to 150

Searched for regex `reverse|geocode|place|location` (`ivisit-app` · `services/mapboxService.js`), 25 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/docs/EMERGENCY_INTEGRATION_AUDIT.md#1-1), lines 1 to 60

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/FullScreenEmergencyMap.jsx#1-1), lines 1 to 100

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/demoEcosystemService.js#100-100), lines 100 to 200

Searched for regex `setAllHospitals|effectiveDemoMode|hospitals|bootstrap` (`ivisit-app` · `contexts/EmergencyContext.jsx`), 30 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/coverageModeService.js#1-1), lines 1 to 100

Searched for regex `reverseGeocode|place.*name|location.*name|address` (`ivisit-app`), 20 results

Read memory [](file:///c%3A/Users/Dyrane/AppData/Roaming/Code/User/workspaceStorage/7cab7a50ed5c63a7c49cf7db420ec5d2/GitHub.copilot-chat/memory-tool/memories/repo/welcome_native_doctrine.md)

Read memory [](file:///c%3A/Users/Dyrane/AppData/Roaming/Code/User/workspaceStorage/7cab7a50ed5c63a7c49cf7db420ec5d2/GitHub.copilot-chat/memory-tool/memories/repo/emergency_ux_doctrine.md)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/emergency/useHospitals.js#95-95), lines 95 to 250

Searched for regex `effectiveDemoMode|demoModeEnabled|allHospitals` (`ivisit-app` · `contexts/EmergencyContext.jsx`), 15 results

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/contexts/EmergencyContext.jsx#1-1), lines 1 to 80

Read [](file:///c%3A/Users/Dyrane/AppData/Roaming/Code/User/workspaceStorage/7cab7a50ed5c63a7c49cf7db420ec5d2/GitHub.copilot-chat/chat-session-resources/1766a708-afa6-40a8-ba0f-69a0d4a4340d/call_P24bepsM7v5XHedBPGABMXhF__vscode-1775558328976/content.txt#1-1), lines 1 to 400

Read [](file:///c%3A/Users/Dyrane/AppData/Roaming/Code/User/workspaceStorage/7cab7a50ed5c63a7c49cf7db420ec5d2/GitHub.copilot-chat/chat-session-resources/1766a708-afa6-40a8-ba0f-69a0d4a4340d/call_P24bepsM7v5XHedBPGABMXhF__vscode-1775558328976/content.txt#401-401), lines 401 to 561

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/screens/WelcomeScreen.jsx)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/contexts/GlobalLocationContext.jsx)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/hooks/emergency/useHospitals.js)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/mapboxService.js)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/demoEcosystemService.js#1-1), lines 1 to 260

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/services/coverageModeService.js)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/components/map/HospitalMarkers.jsx)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/components/emergency/BottomSheetController.jsx)

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/migrations/20260219000100_identity.sql#1-1), lines 1 to 260

Read [](file:///c%3A/Users/Dyrane/Documents/GitHub/ivisit-app/supabase/functions/bootstrap-demo-ecosystem/index.ts#1-1), lines 1 to 280

Searched for text `mapbox|place_id|upsert|verified|verification_status|hospital_rooms|available_beds|ambulances|drivers` (`ivisit-app` · `supabase/functions/bootstrap-demo-ecosystem/**`), 72 results

Searched for text `hospital_rooms|available_beds|bed_availability|organization_id|ambulances|drivers|doctors` (`ivisit-app` · `supabase/migrations/**`), 200 results

Completed: *Audit welcome-to-map flow* (1/5)

The audit is complete: the main issues are bootstrap race conditions, missing place-name normalization, and non-deterministic hospital loading before the map opens.



## Audit complete — no coding started

I cross-checked the current app flow, legacy emergency surfaces, the new request-help path, the Supabase edge bootstrap logic, and the database readiness layer.

---

## Executive verdict

You are **not missing the core system**.  
You are mostly missing **determinism, orchestration, and one unified map-first runtime**.

The biggest issues are:

1. **`Continue` still routes into auth/request-help glue**, not directly into the stable map-first runtime.
2. **Hospital bootstrap is not deterministic enough** and can race.
3. **Location naming is not normalized through one backend-grade path**, so web can lag behind native.
4. **The map UI architecture is already close**, but marker design + sheet state management need to be locked to one Apple Maps-style model.

---

## What I verified in the codebase

### App / flow
- WelcomeScreen.jsx
  - `Continue` currently does:
    ```js
    router.push("/(auth)/request-help");
    ```
  - So the welcome still enters via the auth/request-help route, not a true direct map dashboard.

- useHospitals.js
  - hospitals are fetched here
  - demo/bootstrap runs inline here
  - there is a **module-level `globalHospitalCache`**
  - location re-fetch threshold is currently:
    ```js
    > 0.005
    ```
    which is roughly small enough to retrigger under movement/pan scenarios

- demoEcosystemService.js
  - bootstrap is phased:
    - `prepare`
    - `hospitals`
    - `staff`
    - `pricing`
    - `summary`
  - it calls the Supabase edge function:
    ```js
    supabase.functions.invoke("bootstrap-demo-ecosystem")
    ```

- mapboxService.js
  - Mapbox reverse geocoding already exists:
    ```js
    reverseGeocode(lat, lng)
    ```
  - but it is **not wired into** the global location flow

- GlobalLocationContext.jsx
  - currently stores only:
    - `latitude`
    - `longitude`
  - no normalized place-name layer is attached there

### Map UI
- HospitalMarkers.jsx
  - current marker UI still uses static pin images:
    - `hospital.png`
    - `selected_hospital.png`
  - this is **not yet** the modern Apple/Uber/Snapchat “places bubble” style you described

- BottomSheetController.jsx
  - this is already the right orchestration point for the **Apple Maps-like sheet**
  - it should become the single state machine for the post-continue dashboard

### Supabase / backend
- index.ts
  - important finding: it already contains a **Mapbox-based hospital discovery path**
  - it also does **upsert by `place_id`**
  - this is good
  - but it still also carries **demo feature flags / demo provenance**, and the current path is not fully aligned with your “backend-only demo term, UI should not know” doctrine

- 20260219000100_identity.sql
- 20260219000200_org_structure.sql
- 20260219000900_automations.sql
- 20260219010000_core_rpcs.sql

These confirm the backend already has substantial readiness for:
- `organization -> hospital`
- `ambulances`
- `drivers`
- `doctors`
- `available_beds`
- RPC/update automation

So your statement is correct:

> the backend/legacy flow already solved much of the hard infrastructure; the main flaw is UX and orchestration.

---

## Why the bootstrap glitch likely happens

### Primary root cause: **more than one bootstrap/fetch path can overlap**

This is the most likely reason for the flicker between newly bootstrapped hospitals and fallback states.

### Evidence
In useHospitals.js:
- `globalHospitalCache` is shared at module scope
- bootstrap is triggered **inside the fetch flow**
- fetches can re-run when location shifts enough

That means this kind of failure can happen:

1. welcome/request flow opens
2. location resolves
3. hospital fetch starts
4. bootstrap starts
5. another location update / coverage recalculation / refetch fires
6. a second path re-runs discovery/bootstrap logic
7. UI briefly shows one hospital set, then falls back/re-sorts/replaces it

### Secondary contributor: coverage mode re-resolution
coverageModeService.js can also change how nearby coverage is interpreted while the rest of the bootstrap pipeline is still in motion.

So yes — your intuition about:

> “more than 1 edge function running”

is directionally right.  
More precisely: **more than one bootstrap/fetch cycle is allowed to affect UI state before a single deterministic result is locked.**

---

## The correct product rule going forward

You stated the right doctrine:

> “Demo” is a **backend term**, not a UI term.

I agree.

### The UI should never say:
- demo hospital
- fake emergency center
- seeded provider

### The product behavior should be:
- fetch real nearby hospitals
- if verified live coverage is too thin, silently bootstrap **real Mapbox-discovered hospitals**
- persist them
- render them as nearby hospitals
- keep provenance internal (`source`, `coverage_origin`, `verification_status`, internal flags)

---

## 10-point audit response

### 1. Plan to ensure proper location details
**Target:** all platforms get the same human-readable location name.

#### Decision
Use **one normalized reverse-geocode path** for all platforms.

#### Recommended model
- GlobalLocationContext.jsx should store:
  - `latitude`
  - `longitude`
  - `displayName`
  - `geocodeSource`
  - `resolvedAt`

#### Source of truth
- use **Mapbox reverse geocoding** through:
  - existing mapboxService.js
- preferably via an **edge function / backend wrapper**
  - so web, iOS, and Android all get the same place naming behavior

> This avoids relying on native map SDK naming differences.

---

### 2. Bootstrap flow and why it fails today
**Why it fails today:**
- bootstrap is triggered inline from useHospitals.js
- fetch + bootstrap + coverage recalculation can overlap
- location sensitivity is too eager for a bootstrap-critical path
- shared module cache makes state contamination easier

#### Correct rule
Bootstrap should be:
- **idempotent**
- **single-flight**
- **keyed by coverage zone**
- **not allowed to update UI from stale runs**

---

### 3. Plan for deterministic hospital render
**Goal:** once the user enters the map, the hospital set should feel stable and intentional.

#### Deterministic plan
1. derive a **coverage key / geo bucket**
2. check existing hospitals already persisted for that zone
3. if verified hospitals `< 3`, bootstrap real nearby Mapbox hospitals
4. upsert by **`place_id`**
5. do not render the live map until the hospital set is **ready**
6. show a simple **Apple-style skeleton loading state** meanwhile

#### Important
No duplicate creation if they already exist:
- `place_id` must remain the idempotent key
- if rows already exist, just fetch and render them

---

### 4. Full hospital ecosystem readiness
Your target is correct:

> `organization -> hospital -> ambulance -> driver -> doctor -> bed space`

The schema already supports much of this.

#### What should define “ready”
A hospital should only be considered **dispatchable** when it has:

- organization linkage
- hospital row
- pricing row(s)
- at least one ambulance if ambulance service is offered
- driver assignment if ambulance is operable
- doctor/provider coverage if clinical routing depends on it
- bed count / availability if bed reservation is offered

#### Product rule
Do **not** expose a hospital to the user-facing emergency dashboard as “available” unless its service surface is actually ready enough for the action being shown.

---

### 5. Bottom sheet architecture plan
This should become a single Apple Maps-style shell:

## Desired structure
1. **full-page map always mounted**
2. **collapsible bottom sheet always mounted**
3. top row:
   - search
   - avatar/profile
4. action row:
   - **Book ambulance**
   - **Reserve bed**
5. tapping an action opens the appropriate service list in the same sheet

#### Visual direction
Exactly as you described from the Apple Maps reference:
- big circular place/service icons
- label underneath
- persistent map underneath
- one sheet that expands/collapses through all states

#### Existing anchor to reuse
- BottomSheetController.jsx

This is the right place to unify the state machine.

---

### 6. Flows must align with legacy code
Agreed.

### What to preserve from legacy
- backend contracts
- emergency request orchestration
- hospital fetch logic
- provider readiness logic
- payment plumbing

### What to replace
- presentation hierarchy
- loading choreography
- map marker system
- welcome-to-map transition

> So the work is mostly **UX and state orchestration**, not rebuilding the operational core.

---

### 7. Kick off flow from landing page before `Continue`
Yes — this is the right move.

#### Before the user taps `Continue`, the app should already:
- warm up location permission / fallback logic
- reverse geocode the user location
- begin hospital discovery for the current coverage zone
- decide whether bootstrap is required
- prepare the first deterministic map payload

Then `Continue` simply:
- opens the map
- reveals the already-prepared sheet
- feels instant

---

### 8. Range-based bootstrap sensitivity
You explicitly do **not** want bootstrap to rerun because the user moved one building over.

Correct.

#### Recommended rule
Bootstrap sensitivity should use:

- **distance threshold**: e.g. `2–3 km`
- **time threshold / TTL**: e.g. `10–30 minutes`
- **coverage zone bucket** rather than raw every-frame lat/lng

#### Meaning
Small location drift should:
- update the user dot
- maybe reorder hospitals
- **not** re-bootstrap the ecosystem

---

### 9. Perfect map-based dashboard after `Continue`
This is the intended target state:

## After `Continue`
- full-page map appears immediately
- hospitals already ready
- markers feel modern and legible
- sheet is already in place
- actions are obvious:
  - `Book ambulance`
  - `Reserve bed`

#### Marker direction
Current HospitalMarkers.jsx is still legacy-pin style.

You want:
- Apple Places / Uber / Snapchat map bubbles
- cleaner circular icon treatment
- label readability
- better selection state
- more modern hospital presence on the map

That is the correct visual direction.

---

### 10. Audit task created and completed
I did the requested no-code audit across:
- `ivisit-app` flow/runtime
- map/hospital UI
- request-help/legacy emergency flow
- Supabase edge bootstrap path
- migrations/readiness model
- current master flow docs

---

## Recommended implementation order

### Phase 1 — determinism first
- single-flight bootstrap orchestration
- zone-based idempotency
- no stale UI updates from overlapping runs

### Phase 2 — location truth
- unified reverse geocode path via backend/Mapbox
- same place name behavior on web, iOS, Android

### Phase 3 — welcome to map handoff
- prewarm everything before `Continue`
- render skeleton until hospital set is stable
- then open map + sheet instantly

### Phase 4 — Apple Maps dashboard shell
- persistent map
- one sheet controller
- search + avatar row
- circular service actions
- service list expansion in-place

### Phase 5 — readiness contract
- hospital visibility tied to real service readiness
- org/hospital/ambulance/driver/doctor/bed model enforced

---

## Hard recommendation

> Do **not** start by redesigning the markers first.

Start with:
1. **deterministic bootstrap**
2. **location naming normalization**
3. **stable map payload before render**

Because until those are fixed, the UI will keep feeling glitchy no matter how polished it looks.

---

## Bottom line

You were right on the core thesis:

- the system should feel **map-first**
- demo should stay **backend-only**
- the user should get the **full product experience**
- the current gap is mostly **orchestration and determinism**, not missing backend capability

If you want, the next step can be a **formal implementation spec** broken into:
- `Phase 1: data/bootstrap`
- `Phase 2: map dashboard UI`
- `Phase 3: backend readiness contract`

with explicit file-by-file execution order.

Compacted conversationI'll turn the audit into a concrete, phased execution plan now.## Plan to achieve it

The work should be done in **this order**, so the UX becomes stable before it becomes polished.

### 1) Stabilize the data layer first
**Goal:** stop hospital flicker, duplicate bootstraps, and inconsistent rendering.

**Changes**
- Refactor useHospitals.js
  - remove race-prone fetch overlap
  - dedupe requests
  - ignore stale responses
  - replace the weak movement trigger with a **zone/radius-based threshold**
- Tighten demoEcosystemService.js
  - only bootstrap when **verified live coverage is too thin**
  - keep “demo” as **backend-only language**, never UI copy

**Result**
- One authoritative hospital list
- No fake-looking churn when location changes slightly

---

### 2) Normalize location naming across web/iOS/Android
**Goal:** the app should show the same place name everywhere.

**Changes**
- Promote a canonical place label from:
  - mapboxService.js
  - into GlobalLocationContext.jsx
- Use reverse geocoding once per settled location and cache it
- Make the backend/Mapbox result the source of truth for UI labels

**Result**
- Consistent city/area naming
- Better trust and less platform drift

---

### 3) Re-route `Continue` into the real map-first dashboard
**Goal:** the welcome CTA should open the emergency system, not feel like a detour.

**Changes**
- Update WelcomeScreen.jsx
- Route `Continue` into the persistent emergency dashboard flow instead of the current auth-heavy step

**Result**
- Welcome becomes a true **activation surface**
- Faster path to ambulance / hospital intent

---

### 4) Build the Apple Maps-style shell
**Goal:** make the map the truth layer and the sheet the control layer.

**Changes**
- Use BottomSheetController.jsx as the main state shell
- Keep the map always visible
- Add a compact collapsed sheet and expandable action/dashboard states

**Primary actions**
- `Book ambulance`
- `Reserve bed`

**Result**
- Calm, spatial, native emergency flow
- Better continuity during booking and tracking

---

### 5) Upgrade markers and hospital cards
**Goal:** move from static pins to modern live-place presentation.

**Changes**
- Redesign HospitalMarkers.jsx
- Use cleaner Apple/Uber-style markers and selected states
- Show real nearby hospitals first, with clearer ranking and verification cues

**Result**
- More confidence
- Less “demo app” feeling

---

### 6) Verify end-to-end and then update docs
**Goal:** lock behavior after proof, not assumption.

**Verification**
- test `Continue → map → hospitals → ambulance/bed action`
- verify sparse-coverage fallback
- verify naming parity on **web, iOS, Android**
- run fresh build checks before claiming done

**Docs to update after implementation**
- FLOW.MD
- MASTER_REFERENCE_FLOW_V1.md

---

## Execution priority

| Priority | Area | Why first |
|---|---|---|
| 1 | `useHospitals` + bootstrap logic | root cause of instability |
| 2 | location normalization | trust and cross-platform consistency |
| 3 | map-first routing | aligns welcome with product intent |
| 4 | dashboard/sheet shell | core UX structure |
| 5 | marker polish | visual refinement after stability |

---

## In one line

> **First make hospital data deterministic, then normalize location truth, then route into a persistent map-first dashboard, and only after that polish the visual layer.**

If wanted, the next step can be a **file-by-file implementation checklist** for Phase 1.Continued with AutopilotI'll close this properly now.



## ✅ Done