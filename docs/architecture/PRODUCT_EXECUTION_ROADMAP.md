# iVisit Product Execution Roadmap (2026)

**Goal:** Ship a cohesive iVisit MVP where Emergency, Visits, Auth, Profile, and More screens share consistent UX patterns and run on a real backend (Supabase) with seeded domain data.

**Principles**
- Keep UI stable; swap backend underneath via the existing layers (UI → Context → Hook → Service → Database/API).
- Always make routes navigable first (stubs beat missing screens).
- Enforce a single “profile completeness” gate so all downstream features have reliable user data.
- Migrate from local (AsyncStorage) to Supabase by updating the API/service layer, not screen code.
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

## Phase 4 — Supabase integration (auth first, then data) (2–4 days)

**Outcome:** Real authentication + real persisted data, without rewriting screens.

**Subplan A — Environment + client**
- Add Expo env vars (you will provide keys when we get here):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Initialize Supabase client inside [client.js](file:///c:/Users/Dyrane/Documents/GitHub/ivisit-app/api/client.js)
  - Use AsyncStorage for session persistence
  - Keep `detectSessionInUrl: false` for native

**Subplan B — Auth migration**
- Keep the same public interface for:
  - `authService.*`
  - `api/auth.*`
  - `AuthContext` consumer APIs
- Replace local userStore logic with Supabase auth:
  - signUp / signIn
  - session restore
  - logout
- Preserve existing UI flows (OTP vs password) as much as possible; if OTP is out-of-scope for initial Supabase pass, keep it stubbed until after password auth is stable.

**Subplan C — Profile table**
- Add a `profiles` table keyed by `auth.users.id`
- On signup/login, upsert minimal profile record
- Update `getCurrentUser` to merge auth + profile fields

**Acceptance**
- Sign up / login / logout works on-device.
- Session persists across app restart.
- Profile completion writes to `profiles` in Supabase.

---

## Phase 5 — Seed domain data (hospitals, beds, ambulances, visits) (2–4 days)

**Outcome:** Emergency + Visits run on the same real data model.

**Subplan**
- Define tables (first pass):
  - `hospitals`
  - `hospital_beds` (or `beds`)
  - `ambulances`
  - `ambulance_trips` (or `requests`)
  - `visits`
- Add seed scripts (or SQL) to populate:
  - Hospitals and baseline availability
  - A handful of ambulances
  - Sample visits per test user
- Create query hooks:
  - `useHospitals`, `useBeds`, `useAmbulances`, `useVisits`
- Replace static `data/*.js` usage gradually:
  - Start by reading Supabase first, fallback to local mocks in dev if needed

**Acceptance**
- Emergency and Visits can run using Supabase data.
- Demo data can be toggled off without breaking screens.

---

## Phase 6 — Emergency screen hardening (after backend) (2–3 days)

**Outcome:** Emergency becomes production-ready, not only a demo.

**Subplan**
- Replace “mock request” with a real trip/request record:
  - Create ambulance trip in Supabase
  - Subscribe to updates (optional) or poll
- Make trip state robust:
  - Resume active trip after app restart
  - Cancel request persists server-side
- Validate availability rules:
  - Ambulance available count
  - Bed availability and reservation windows

**Acceptance**
- A user can request ambulance / reserve bed and see persisted status.
- App recovers the active state after restart.

---

## Execution checkpoints (what we commit at each milestone)

- **Checkpoint A:** All routes exist and are reachable (Phase 1).
- **Checkpoint B:** Visits UX parity and details page (Phase 2).
- **Checkpoint C:** Profile completion gate enforced (Phase 3).
- **Checkpoint D:** Supabase auth + profile table working (Phase 4).
- **Checkpoint E:** Seed data + queries powering Emergency/Visits (Phase 5).

---

## Progress tracking (how we’ll work)

- Start each phase with a short task list.
- Land small commits frequently (screen stubs, then wiring, then polish).
- Run typecheck after meaningful changes.
- When we reach Phase 4, you provide keys and we add them via Expo env workflow (no keys committed).

