# EXP-9 Book Ride CTA

Status: Complete
Owner: App Flow
Layer impact: utility only

## Goal

Expose a "Get there" CTA on provider cards that deep-links to Uber (or falls back to Maps) for navigation to the provider.

## Files

- `utils/bookRideUtils.js`

## Reference Files

- `components/map/views/providerList/MapProviderListSheet.jsx` — ProviderCard CTA
- `constants/providerTypes.js`

## Guardrails

- No Supabase calls.
- Deep-link only — do not embed a ride booking flow inside the app.
- Graceful fallback: if Uber is not installed, open Apple Maps / Google Maps.
- Do not show the CTA for provider types where navigation is irrelevant (e.g., telemedicine — not in v1).

## Exports

- `openRideToProvider(provider)` — builds deep-link URL and calls `Linking.openURL`

## Behavior

1. Build Uber deep-link with provider `latitude` / `longitude` and `name` as destination.
2. Attempt `Linking.canOpenURL('uber://')`.
3. If Uber available → open Uber deep-link.
4. If not → open platform Maps URL (`maps://` on iOS, `geo:` on Android, `https://maps.google.com` on web).

## Checklist

- Build Uber deep-link string correctly.
- Platform-aware Maps fallback.
- Handle missing lat/lng gracefully (log warning, no crash).
- Export `buildProviderMapsUrl(provider)` for use in directions-only flows.

## Acceptance

- Tapping "Get there" on a provider card opens Uber (if installed) or Maps.
- Correct destination coordinates sent.
- No crash when Uber is not installed.
- No crash when provider has no coordinates.

## Changed Files

- `utils/bookRideUtils.js` (created or modified)

## Verification

- `openRideToProvider` builds correct Uber deep-link.
- Fallback to Maps URL when Uber unavailable.
- Null coordinate guard in place.
- Used in `ProviderCard` inside `MapProviderListSheet`.

## Rollback Notes

- Remove `openRideToProvider` import from `ProviderCard`.
- No state or schema changes to revert.
