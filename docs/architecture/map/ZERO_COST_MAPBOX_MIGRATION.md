---
status: living
owner: architecture
last_updated: 2026-05-02
---

# Zero-Cost Mapbox Migration Strategy

## Context
As of April 2026, the application incurred unexpected costs from the Google Maps Platform, specifically driven by the "Directions Advanced" API and "Places API Place Details Photos". To achieve a zero-cost architecture, the Google billing account was closed, necessitating an immediate migration of the data layers to Mapbox and custom fallbacks.

## Migration Goals
1. **Routing:** Transition from Google Directions API to Mapbox Directions API (100,000 free requests/month).
2. **Search & Geocoding:** Replace Google Places API calls with Mapbox Search Box and Geocoding APIs (100,000 free requests/month).
3. **Photos:** Remove the `places.googleapis.com` dependency completely. Hospital photos will rely on the internal `hospital_media` Supabase table and deterministic high-quality Unsplash fallbacks.

## Execution Plan

### 1. Route Calculation (`useMapRoute.js` & `mapConfig.js`)
- Set `PRIMARY_ROUTE_API` to `"MAPBOX"`.
- Implement `getMapboxRoute` calling the Mapbox v5 driving directions endpoint.
- Adjust `routeOrder` to prioritize `["MAPBOX", "OSRM"]`.
- The Google routing mechanism will be decoupled so it cannot incur charges.
- **Optimization (GPS Jitter Mitigation):** Reduced the routing cache key precision from `6` to `4` decimal places (~11 meters) to prevent micro-movements (GPS jitter) while stationary from triggering redundant routing requests, drastically reducing total API volume.
- **Optimization (TanStack Query):** Upgraded `useMapRoute` to leverage `queryClient.fetchQuery` for automatic cross-component request deduplication and global caching (`staleTime: Infinity`), completely eliminating race conditions and redundant network calls.

### 2. Search Layer (`googlePlacesService.js`)
- Refactor `googlePlacesService.js` to act as a proxy wrapping `mapboxService.js`.
- This ensures all existing UI components (like `useMapSearchSheetModel.js`) seamlessly switch to Mapbox without needing sweeping frontend changes.

### 3. Media Resolution (`supabase/functions/hospital-media/index.ts`)
- Strip out `fetchGoogleProviderPhotoUrl`.
- Expand `FALLBACK_IMAGES` to provide a wider variety of premium Unsplash images.
- Ensure the resolution strictly prioritizes: `hospital_media` database -> `hospital.image` -> Unsplash Fallbacks.

## Conclusion
This migration ensures the iVisit app retains premium functionality (routing, predictive search, beautiful imagery) while permanently bringing the API operating costs down to $0.00. The visual rendering layer remains untouched (Apple Maps on iOS, Google SDK on Android without billed requests).
