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

## Local Coverage Reuse Rule (2026-04-11)
- Persisted demo coverage must not be treated as sufficient just because a city already has `5` demo hospitals somewhere inside the full nearby window.
- Reuse now has a stricter local rule:
  - at least `5` dispatchable demo hospitals inside `0-15 km`
  - and at least `5` of those inside a tighter `0-8 km` local window
- If the local `0-8 km` window is thin, bootstrap should run again even when the broader city already has a healthy demo inventory.
- This rule is generic and exists to stop one citywide bootstrap pack from masking neighborhood-level thin coverage in any metro, not only Lagos.

## Metro Catalog Rule (2026-04-11)
- Demo bootstrap may maintain a shared metro-level fallback catalog for dense cities when a single neighborhood pack would be too brittle.
- A metro catalog is stored once under a shared demo scope (for example `city_lagos`) and contains many real hospital identities distributed across the city.
- The app should still render hospitals by the user's coordinates, not by the full catalog:
  - bootstrap maintains the metro pool
  - `nearby_hospitals` and app discovery choose the location-relevant subset
- Two users in the same city may therefore share the same backing catalog while still seeing different nearby hospital sets if they are far enough apart.
- Legacy per-bucket demo rows that are replaced by a metro catalog should be retired out of active coverage rather than left available beside the new catalog rows.

## Public Discovery Rule (2026-04-11)
- `discover-hospitals` is part of the public `/map` path and must stay guest-callable.
- The function must be deployed with JWT verification disabled so sponsor/tester sessions can discover real nearby hospitals before any auth wall.
- If the function becomes auth-protected again, public `/map` silently degrades into RPC-only discovery and uncovered regions lose provider-backed expansion.

## Hospital Media Rule (2026-04-12)
- Emergency and `/map` hospital surfaces should consume the existing `hospital.image` field seamlessly; image delivery must therefore be normalized at the data layer, not solved with special-case UI logic.
- The canonical runtime delivery path is the public [`hospital-media`](../supabase/functions/hospital-media/index.ts) edge function. Hospital rows should point `image` to that proxy whenever the selected source is app-governed media rather than a raw static URL.
- Source priority is:
  1. `hospital_upload`
  2. `official_website_image`
  3. `provider_photo`
  4. `domain_logo`
  5. `deterministic_fallback`
- `discover-hospitals` and `bootstrap-demo-ecosystem` must use Google Places API (New), not legacy Places endpoints, when they need provider-backed photo-capable hospital metadata.
- New provider-backed hospitals should not require a later manual cleanup before they can render a real image. The `hospital-media` proxy may resolve a raw provider `place_id` directly for that purpose.
- Existing hospital rows should be normalized through [`backfill_hospital_media.js`](../supabase/scripts/backfill_hospital_media.js), which:
  - creates active primary `hospital_media` rows
  - updates `hospitals.image` to the proxy URL
  - persists `image_source`, `image_confidence`, and `image_attribution_text`
- Controlled fallback is still valid. If there is no trustworthy provider photo or official website image, the system must prefer a deterministic fallback over pretending a random image is the facility.

## Discovery Ordering Rule (2026-04-11)
- The discovery function may read a mix of real dispatchable hospitals and non-dispatchable provider-shadow rows from `nearby_hospitals`.
- Dispatchable hospitals must be ordered ahead of shadow/provider rows before the function applies its response limit.
- "Database is sufficient" should be decided from **dispatchable nearby hospitals**, not from raw row count.
- For `/map` nearby mode, the current comfort target is **5 dispatchable hospitals**; once that target is met, provider discovery can be skipped.
- Shadow rows must never crowd real nearby hospitals out of the top slice sent back to the app.

## Audit Script Rule (2026-04-11)
- Use [`supabase/scripts/audit_demo_coverage.js`](../supabase/scripts/audit_demo_coverage.js) for live coverage audits.
- The script intentionally splits responsibilities:
  - service-role client for `nearby_hospitals`
  - public anon client for `discover-hospitals`
- This mirrors the real runtime more accurately than a single privileged client.

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
- Provider-backed real-name coverage is still provider-dependent; if both DB and provider discovery return nothing for a region, the system must still fall back to synthetic coverage rather than pretending real hospital data exists.
- Bootstrap seed inspection must hydrate metadata from the `hospitals` table before deciding whether a nearby row is a reusable real seed or an old demo row.
- Raw `nearby_hospitals` output alone is not sufficient for that decision because it does not expose every demo-identifying field needed to reject stale demo rows.

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
13. Public `/map` can invoke `discover-hospitals` without requiring an authenticated session.
14. `discover-hospitals` returns at least the dispatchable nearby comfort target before any shadow/provider rows consume the response limit.
15. In a dense metro with a shared city catalog, two probes kilometers apart should still produce materially different nearby hospital subsets from the same backing demo inventory.
16. Existing hospital rows can be backfilled into canonical `hospital_media` records without requiring UI changes in emergency/map flows.
17. A hospital with `image_source = provider_photo` or `official_website_image` should expose a `hospital.image` proxy URL and return a valid `302` image redirect.
18. A raw provider `place_id` passed to `hospital-media` should return a valid image redirect even before a dedicated `hospital_media` row exists.
19. Emergency/map hospital cards continue to read from `hospital.image` after hydration and therefore pick up the normalized proxy automatically.
20. When no trustworthy real image exists, the hospital still renders via deterministic fallback rather than blank media.

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
