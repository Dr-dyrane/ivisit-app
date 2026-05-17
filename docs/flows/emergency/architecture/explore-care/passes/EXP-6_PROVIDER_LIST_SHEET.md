# EXP-6 Provider List Sheet

Status: Complete
Owner: UI / UX
Layer impact: L2 query consumption, L5 UI

## Goal

Build `MapProviderListSheet` — a bucketed, filterable provider list sheet for the selected explore category.

**Data Gap Note:** Provider data uses `hospitals` table schema with hospital-specific fields that are null for non-hospital providers. See [Data Implementation Notes](../EXPLORE_CARE_DOSSIER_V1.md#data-implementation-notes) for structured conventions to encode provider-specific data in `specialties`, `service_types`, `features` arrays.

## Files

- `components/map/views/providerList/MapProviderListSheet.jsx`

## Reference Files

- `components/map/surfaces/MapModalShell.jsx`
- `hooks/emergency/useNearbyProviders.js`
- `constants/providerTypes.js`

## Guardrails

- Use `MapModalShell` for the sheet surface.
- No Supabase calls directly in this component.
- Provider rows stay in TanStack Query — do not copy to state.
- Skeleton loading only — no blank state, no spinner.
- `visible` prop must be passed `true` when conditionally mounted so `useNearbyProviders` `enabled` guard works.

## Props

- `visible` — boolean; pass `true` when conditionally mounted
- `providerCategory` — one of `PROVIDER_TYPES` values
- `location` — `{ latitude, longitude }`
- `onClose` — called when sheet is closed
- `onSelectProvider(provider)` — called when a card is tapped

## UI Structure

```txt
MapModalShell
  FilterStrip (Nearest / Featured / Sponsored)
  ScrollView
    [bucket] < 5 min
      SectionHeader
      ProviderCard[]
    [bucket] 5–10 min
      ...
    [bucket] 10–20 min
      ...
    [bucket] 20+ min
      ...
    FooterNote (N providers within 20 km)
  [if loading] SkeletonList
  [if empty] EmptyState
```

## Provider Card Data Display

**Conditional Rendering by Provider Type:**

```javascript
const isHospital = provider.providerType === PROVIDER_TYPES.HOSPITAL;

// Show for all provider types:
// - image (category-specific fallback)
// - name, rating, reviewsCount
// - distance, eta
// - status, verification badge
// - provider type badge

// Show only for hospitals:
// - availableBeds, totalBeds
// - ambulances
// - emergencyLevel badge

// Show for specific provider types (using features/service_types):
// - Pharmacy: "24_hour" flag from features
// - Lab: test types from service_types
// - Clinic: specialties from specialties array
// - Mental Health: "telehealth" flag from features
// - Pediatrics: age range from description
```

**Fallback Images:** Category-specific images are now supported in the edge function (12 hospital + 8 per category).

## Buckets

Travel-time buckets based on `provider.travelMinutes` (estimated from distance):
- `< 5 min`
- `5–10 min`
- `10–20 min`
- `20+ min`

## Deferred Reason

- v1 establishes list + map pins. Provider detail depth is a v1.1 milestone.
- Book Ride CTA (EXP-9) covers the primary navigation-to-provider action.
- **Data richness gap:** Provider details need more structured data (see [Data Implementation Notes](../EXPLORE_CARE_DOSSIER_V1.md#data-implementation-notes)). Short-term solution uses existing fields with structured conventions; long-term solution requires schema changes.

## Acceptance

- Sheet opens for the correct category.
- Skeleton shows immediately while loading.
- Providers appear in time buckets once loaded.
- Filter strip switches between Nearest / Featured / Sponsored sort.
- Empty state shows category icon and copy.
- Tapping a card calls `onSelectProvider`.
- Closing calls `onClose`.

## Changed Files

- `components/map/views/providerList/MapProviderListSheet.jsx` (created)

## Verification

- `useNearbyProviders` called with `enabled: visible && !!providerCategory`.
- Skeleton renders while `isLoading`.
- Empty state renders when `providers.length === 0` and not loading.
- Bucket sections render in correct time order.
- FilterStrip sort changes applied via `useMemo`.
- `onSelectProvider` called with full provider object on card press.

## Rollback Notes

- Remove `MapProviderListSheet` import and conditional mount from `MapScreen`.
- `exploreProviderCategoryAtom` becomes unused — leave atoms inert.
