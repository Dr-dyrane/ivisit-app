# EXP-4 Service Adapter — Emergency Strict Filter

Status: Complete
Owner: App Data
Layer impact: Layer 1 adapter, no UI

## Goal

Add `discoverNearbyProviders` to `hospitalsService.js` for explore mode, and confirm the existing emergency path (`isDispatchableHospital`, `getNearbyHospitals`) is still correctly filtered.

## Files

- `services/hospitalsService.js`

## Reference Files

- `services/emergencyContactsApiService.js`
- `constants/providerTypes.js`

## Guardrails

- No Supabase calls in UI components.
- Emergency path functions must not change behavior.
- `discoverNearbyProviders` calls the `discover-hospitals` edge function with a `providerType` parameter.
- Service owns normalization from edge function response to app shape.

## Exports

New export on `hospitalsService`:
- `discoverNearbyProviders(lat, lng, providerCategory, radius, options)`
  - `options.limit` — default 15
  - `options.includeGooglePlaces` — default false
  - `options.includeMapboxPlaces` — default true

## Checklist

- Add `discoverNearbyProviders` method to `hospitalsService`.
- Confirm `getNearbyHospitals` / `isDispatchableHospital` are unchanged.
- Normalize response array to app camelCase shape.
- Return empty array on null/undefined response.
- Add basic input validation (lat/lng finite, providerCategory non-empty).

## Acceptance

- `discoverNearbyProviders('pharmacy', ...)` returns pharmacy results.
- Emergency-path calls (`getNearbyHospitals`, etc.) are unchanged.
- No Supabase calls added to any component file.

## Changed Files

- `services/hospitalsService.js` (modified)

## Verification

- `discoverNearbyProviders` added and returns normalized array.
- Existing emergency service methods unchanged.
- Empty/null response guarded — returns `[]`.
- Input validation: finite lat/lng, non-empty `providerCategory`.

## Rollback Notes

- Remove `discoverNearbyProviders` from `hospitalsService.js`.
- No emergency behavior changes to revert.
