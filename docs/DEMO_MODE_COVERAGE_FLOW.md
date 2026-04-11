# Demo Coverage Flow: Task Verification Guide

## Goal
When a user has poor/no **verified** nearby coverage, let them switch to a deterministic demo ecosystem without breaking core emergency flows.

## Deterministic Phases
1. `prepare`
2. `hospitals`
3. `staff`
4. `pricing`
5. `summary`

Source of truth: Edge Function `bootstrap-demo-ecosystem` (idempotent, phase-based, no schema migration).

## Data Rules
- Demo entities are tagged and traceable:
  - `hospitals.place_id` starts with `demo:`
  - `hospitals.verified = true` and `hospitals.verification_status = verified` for experience continuity
  - `hospitals.features` contains `demo_seed`, `demo_verified`, `ivisit_demo`
- Demo rows are safe to distinguish from live production rows.
- Demo mode is user-level via `preferences.demo_mode_enabled`.

## UX Rules
- Coverage modal shows `Switch To Demo Experience` when live verified coverage is poor/none.
- Demo bootstrap modal is non-dismissible while phases run.
- Phase progress is explicit (`pending`, `running`, `completed`, `failed`).
- Completion should only be treated as success when the final summary reports `clean_cycle_ready = true`.
- Banner reminder appears when demo mode is active.
- User can toggle demo mode in **More > Demo Mode**.

## Coverage Threshold Rule (2026-04-09)
- `COVERAGE_POOR_THRESHOLD` is currently **3** verified nearby live hospitals.
- `0` verified nearby live hospitals = `none` coverage.
- `1–2` verified nearby live hospitals = `poor` coverage.
- Only `3+` verified nearby live hospitals should count as `good` coverage for the emergency UX.
- Below that threshold, the app should keep `hybrid` / demo support eligible so the nearby-care UI does not feel under-filled or brittle.
- Bootstrap/backfill should continue while the nearby verified experience is still below that cutoff.

## Nearby Radius Rule (2026-04-10)
- `0-5 km` = `immediate`.
- `>5-15 km` = `nearby support`.
- `>15-50 km` = `extended browse`.
- Coverage quality is measured only from the combined `0-15 km` nearby-support window.
- The `/map` sheet should feel comfortably scrollable, not barely populated.
- The current UI comfort target is **5 nearby hospitals** inside the `0-15 km` window.
- Extended browse hospitals may still render, but they must not suppress demo bootstrap or make live coverage count as healthy.
- A single demo hospital is not sufficient coverage.
- Demo bootstrap is only considered sufficient when there are at least **5** demo hospitals inside the `0-15 km` window for preview-rich states like `/map`.
- Any demo hospital that only appears in the `15-50 km` band should be treated as browse-only, not as proof that nearby support is already filled.

## Demo Bootstrap Volume Rule (2026-04-10)
- The demo edge function should target **at least 5 nearby hospitals** per coverage scope.
- The current cap is **5-6** hospitals so the map rail and hospital list can feel full without becoming noisy.
- A bootstrap target of `2-3` hospitals is considered backend-minimum only and is not sufficient for the current map/sheet UI.

## Demo Hospital Identity Rule (2026-04-10)
- Demo bootstrap may create demo-owned hospitals, but it must preserve real hospital `name` and `address` whenever a database or provider seed exists.
- Synthetic identities such as `Emergency Care Center 1` are valid only for true no-seed fallback slots.
- Provider seed fallback order is:
  1. nearby database hospitals
  2. Mapbox provider discovery
  3. Google provider discovery
  4. synthetic fallback
- When identity rules change, the client bootstrap state key should be versioned so devices rerun provisioning instead of reusing stale placeholder output.
- Legacy synthetic demo rows should be hidden when a real-named replacement exists at the same coordinates.

## Acceptance Checks
1. No-coverage user sees coverage apology + demo switch CTA.
2. Tapping demo switch runs all phases successfully.
3. Demo hospitals become visible and are marked verified for experience continuity.
4. Demo mode toggle off hides demo hospitals.
5. Demo mode toggle on restores demo hospitals.
6. Coverage reminder opt-out still suppresses repeated reminder UX.
7. No destructive DB operations are used.
8. Previously affected locations no longer show `Emergency Care Center X` when seed hospitals exist.
9. Placeholder hospital names appear only in true no-seed regions.
10. One demo hospital inside `50 km` but outside `15 km` no longer suppresses bootstrap.
11. Mixed live/demo results still rank `0-15 km` hospitals ahead of `15-50 km` browse results.
12. Demo bootstrap fills to at least `5` nearby hospitals for the `/map` sheet when live nearby coverage is still thin.

## Failure Handling
- Any phase error:
  - active phase marked `failed`
  - clear toast surfaced to user
  - modal remains closable after run stops
- Partial success:
  - rerunning is safe; edge function upserts and reuses deterministic identifiers.

## Console Subscriber 400 Fix Verification
Problem: console create payload wrote columns not present in `public.subscribers`.

Checks:
1. Create subscriber from console succeeds (HTTP 200/201).
2. Update subscriber succeeds without unknown-column errors.
3. `markWelcomeEmailSent` succeeds and sets:
   - `welcome_email_sent = true`
   - `new_user = false`
   - `status = active`
