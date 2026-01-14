# iVisit Product Execution Roadmap (2026)

**Goal:** Ship a cohesive iVisit MVP where Emergency, Visits, Auth, Profile, and More screens share consistent UX patterns and run fully local-first (AsyncStorage) with seeded domain data.

**Principles**
- Keep UI stable; swap backend underneath via the existing layers (UI → Context → Hook → Service → Database/API).
- Always make routes navigable first (stubs beat missing screens).
- Enforce a single “profile completeness” gate so all downstream features have reliable user data.
- Migrate from local (AsyncStorage) to Supabase later by updating the API/service layer, not screen code.
- Treat seed data as part of the product: hospitals, beds, ambulances, visits.

**Current assets in repo**
- Layered auth refactor plan and structure: [AUTH_REFACTOR_PLAN.md](file:///c:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/architecture/AUTH_REFACTOR_PLAN.md)
- Supabase integration point placeholder: [client.js](file:///c:/Users/Dyrane/Documents/GitHub/ivisit-app/api/client.js)
- Provider wiring and app structure summary: [repo.md](file:///c:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/repo.md)

---

## Phase 0 — Baseline & guardrails (0.5–1 day)

**Outcome:** We can move fast without breaking flows.

**Subplan**
- Add/confirm a single “commands we always run” checklist (typecheck/lint/test) in a tracked doc.
- Ensure navigation is predictable (all stack routes load, even if stub).
- Define the canonical domain types (User/Profile, Visit, Hospital, Bed, Ambulance, Booking/Trip).

**Acceptance**
- A clean build/typecheck after each phase milestone.
- No feature work blocked by missing routes.

---

## Phase 1 — App skeleton catch-up (navigation + missing stack pages) (1–2 days)

**Outcome:** The whole app feels “complete” from a navigation standpoint.

**Subplan**
- Inventory “More screens” and any mentioned stack pages in docs and code.
- Implement the missing routes as minimal screens:
  - Title + short description + placeholder sections
  - Back button support
  - Scroll-aware header where the app uses it
- Wire them into the existing “More” list (or equivalent) so every screen is reachable.
- Ensure tab bar + header behavior is consistent across all main screens.

**Acceptance**
- Every referenced page exists and can be opened from the UI.
- No dead taps / missing route errors.

---

## Phase 2 — Visits screen catch-up (UX parity) (1–2 days)

**Outcome:** Visits experience matches the design quality of Emergency.

**Subplan**
- Align Visits screen layout with the new design language:
  - Consistent cards (status, hospital, doctor/specialty, time)
  - Empty states (no visits), loading state, error state
  - Search/filter (optional first pass)
- Decide what is “real” vs “demo”:
  - Keep existing mock visit data for now
  - Make the component structure mirror the future data shape
- Add a “Visit details” stack screen if not present (tap a visit → details page).

**Acceptance**
- Visits list works end-to-end with consistent UI states.
- Visit detail route exists and renders.

---

## Phase 3 — Post-register profile completion gate (1–2 days)

**Outcome:** Every authenticated user ends up with a complete, usable profile.

**Subplan**
- Define “required profile fields” (minimum viable):
  - Full name
  - Username (or handle)
  - Phone or email verified (depending on auth path)
  - Optional: emergency contact, medical history (can be step 2+)
- Implement a single gate:
  - If authenticated AND profile incomplete → route to completion flow
  - If complete → allow access to main tabs
- Make completion flow resilient:
  - Can resume if app restarts
  - Can skip optional steps but not required fields
- Update profile writing through service/hook (no direct storage calls from UI).

**Acceptance**
- A new user cannot reach main app tabs without required profile fields.
- Completion state persists across reloads.

---

## Phase 4 — Local-first feature completion (preferences + profile subpages + visits) (3–6 days)

**Outcome:** The app is “complete” without a backend: every screen is functional using local data services.

**Subplan A — Preferences**
- Move all preferences behind a `preferencesService` and `api/preferences`.
- Persist:
  - Theme mode using `StorageKeys.THEME`
  - App preferences using `StorageKeys.PREFERENCES`
- Fill out Settings screen so it is not a stub.

**Subplan B — Profile subpages**
- Implement:
  - Emergency Contacts CRUD + persistence via `StorageKeys.EMERGENCY_CONTACTS`
  - Medical Profile CRUD + persistence (add a new StorageKeys entry + service)
- Replace “coming soon” toasts with real navigation + functionality.

**Subplan C — Visits end-to-end**
- Ensure the entire Visits journey is functional locally:
  - Create/book visit
  - Persist visits to `StorageKeys.VISITS`
  - Visit details reads from persisted data
  - Emergency requests create visits consistently

**Acceptance**
- Settings reflects persisted user preferences after restart.
- Emergency contacts and medical profile persist and are editable.
- Visits works end-to-end with persisted local data.

---

## Phase 5 — Patient POV emergency flow completion (2–4 days)

**Outcome:** From a patient POV, the SOS experience feels complete and trustworthy.

**Subplan**
- Tighten Emergency flow states:
  - Select hospital → request ambulance/bed → confirmation → active trip/booking state
  - Resume active state after restart (local persistence)
  - Clear/cancel states are consistent and user-controlled
- Use patient profile data where relevant:
  - Emergency contacts available from the flow
  - Medical profile summary available from the flow
- Ensure Emergency produces Visits consistently (single source of truth)

**Acceptance**
- A user can complete SOS flow without dead ends.
- Active trip/booking survives app restart.
- Post-action record appears in Visits.

---

## Phase 6 — Data model + seed polishing (local-first) (1–2 days)

**Outcome:** Local data feels “real” and coherent across the app.

**Subplan**
- Normalize mock domain data and persistence shapes:
  - Hospitals, ambulances, beds, requests/trips, visits
- Provide consistent IDs and relationships (hospitalId, requestId, visitId)
- Add lightweight migration/backfill where needed

**Acceptance**
- Demo data + user generated data work together without weird edge cases.
- Data survives app restart and upgrades.

---

## Phase 7 — Provider/clinic discovery + booking realism (local-first) (3–6 days)

**Outcome:** Finding care and booking feels realistic and useful (even on seed/local data).

**Subplan**
- Model “providers” and “clinics” separately from hospitals:
  - Provider profiles (name, specialty, credentials, languages, rating)
  - Clinic locations (address, geo, hours, contact)
  - Relationships (providerId ↔ clinicId / hospitalId)
- Improve discovery UX:
  - Specialty-first discovery and filtering
  - Nearby clinics/hospitals list with consistent distance/ETA formatting
  - Clear “what can you book here?” (visit types, availability)
- Make booking realistic:
  - Appointment slot selection (seeded schedule)
  - Confirmation state + cancellation/reschedule flows
  - Booking writes to Visits with stable IDs and correct status
- Tighten “details” views:
  - Clinic detail view (services, hours, location)
  - Provider detail view (bio, specialties, next slots)

**Acceptance**
- Search/discovery reliably finds clinics/providers by specialty and name.
- Booking produces consistent Visits data and survives restart.
- No duplicate/contradictory “available” states across screens.

---

## Phase 8 — Supabase integration (when ready) (3–7 days)

**Outcome:** Replace local persistence with Supabase using the same service interfaces.

**Subplan**
- Add Expo env vars (you provide keys when we get here):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Implement Supabase-backed services behind the same API contracts.
- Migrate Auth + Profiles first, then domain tables.

**Acceptance**
- Auth/session restore works on-device.
- Profile completion and core domain flows work without rewriting screens.

---

## Execution checkpoints (what we commit at each milestone)
- **Checkpoint A:** All routes exist and are reachable (Phase 1).
- **Checkpoint B:** Visits UX parity and details page (Phase 2).
- **Checkpoint C:** Profile completion gate enforced (Phase 3).
- **Checkpoint D:** Local-first “all pages functional” milestone (Phase 4).
- **Checkpoint E:** Patient POV Emergency flow complete (Phase 5).
- **Checkpoint F:** Provider discovery + booking realism milestone (Phase 7).
- **Checkpoint G:** Supabase integration milestone (Phase 8).
- **Checkpoint H:** App Store Production Readiness (2026-01-13).

## Progress tracking (how we’ll work)

- Start each phase with a short task list.
- Land small commits frequently (screen stubs, then wiring, then polish).
- Run typecheck after meaningful changes.
- When we reach Phase 8, you provide keys and we add them via Expo env workflow (no keys committed).
