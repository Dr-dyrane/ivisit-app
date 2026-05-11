# Location Sheet Architecture Plan

**Date:** 2026-05-08
**Status:** Pass 1 & 2 COMPLETE - Baseline uplift COMPLETE - Full management pass IN PROGRESS
**Objective:** Unified location sheet architecture with chrome affordance from explore intent

**Canonical saved-address/data-flow companion:** [`LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md`](./LOCATION_ADDRESS_MANAGEMENT_ARCHITECTURE.md)

---

## Executive Summary

Replace inline location fallback in explore intent with a unified location sheet. Add a chrome (window) above mid-phase sheet for location change affordance. This decongests explore intent code and provides a consistent location selection pattern across the app.

**Inspiration:** Apple Maps (icon-only FAB), Google Maps (compass icon), Uber/Lyft (white bar with text)
**Choice:** Icon + minimal text (Apple/Google pattern, not Uber/Lyft text bar)

---

## Architecture Overview

### Current State

**Explore Intent Location Fallback** (`MapExploreIntentHospitalSummaryCard.jsx`):
- When `requiresLocationSelection` = true, shows inline location setup card
- Actions: "Use device location" → `onUseCurrentLocation`, "Enter address manually" → `onOpenLocationSearch`
- This is the "location warning fallback" to be decongested

**Location Truth** (`mapPickupLocationTruth.js`):
- Priority: SESSION_MANUAL → DEVICE → SAVED_*_FALLBACK → MISSING
- Sets `requiresLocationSelection: true` when no trusted pickup exists

**Location Control** (`useMapLocation.js`):
- Exports `locationControl` object with location state
- Used by explore intent to show location setup card

### Proposed State

**Unified Location Sheet:**
- Reuse existing map sheet (no new component)
- Add location state to handle everything location-related
- Apple-style UI: Places, Home/Work, Choose location, progressive accuracy phases

**Chrome Affordance:**
- Icon + location text above mid-phase sheet
- Left-aligned with left margins
- Tap → opens location sheet
- Minimalist copy (current location address or "Set location")

**Explore Intent Decongestion:**
- Remove inline location card
- When location-off → show location sheet instead of explore intent
- When location-set → chrome above sheet for change affordance

---

## Implementation Plan

### Pass 1: Chrome Affordance (Window to Location Sheet)

**Objective:** Add chrome above mid-phase sheet for location change

**Files:**
- `components/map/views/exploreIntent/LocationChrome.jsx` (new)
- `components/map/views/exploreIntent/MapExploreIntentStageBase.jsx` (modify)
- `components/map/views/exploreIntent/mapExploreIntent.styles.js` (modify)

**Chrome Design (Option A):**
```
[📍] San Francisco, CA
```

**Spec:**
- Icon: `location-outline`, 18px, brandPrimary color
- Text: Current location address (e.g., "San Francisco, CA"), 13px, weight 400, muted color
- Fallback: "Set location" when no location
- Padding: 8px left, 8px right, 4px top, 4px bottom
- Background: Transparent (no background, just chrome)
- Placement: 12px from left, 12px from top of mid-phase sheet
- Tap target: 44px minimum (expand touch area invisibly)

**Component:**
```jsx
// components/map/views/exploreIntent/LocationChrome.jsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerPress } from "../../../../services/hapticService";
import styles from "./mapExploreIntent.styles";

export function LocationChrome({
  currentLocation = null,
  onPress,
  tokens,
}) {
  const locationText = currentLocation?.primaryText || "Set location";
  
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => triggerPress("light")}
      style={({ pressed }) => [
        styles.locationChrome,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name="location-outline"
        size={18}
        color={tokens.brandPrimary}
      />
      <Text style={[styles.locationChromeText, { color: tokens.mutedText }]}>
        {locationText}
      </Text>
    </Pressable>
  );
}
```

**Integration:**
```jsx
// MapExploreIntentStageBase.jsx
import { LocationChrome } from "./LocationChrome";

// Add above mid-phase sheet sections
{currentLocation ? (
  <LocationChrome
    currentLocation={currentLocation}
    onPress={onOpenLocationSheet} // TODO: add this prop
    tokens={tokens}
  />
) : null}
```

**Styles:**
```jsx
// mapExploreIntent.styles.js
locationChrome: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 8,
  paddingVertical: 4,
  gap: 6,
  marginTop: 12,
  marginLeft: 12,
  borderRadius: 8,
  borderCurve: "continuous",
},
locationChromeText: {
  fontSize: 13,
  fontWeight: "400",
  letterSpacing: -0.2,
},
```

**Pass 1 Checklist:**
- [x] Create LocationChrome component
- [x] Add styles to mapExploreIntent.styles.js
- [x] Integrate into EmergencyLocationPreviewMap (not MapExploreIntentStageBase)
- [x] Add onOpenLocationSheet prop to MapScreen
- [x] Test chrome tap affordance
- [x] Test chrome with/without location
- [x] Test chrome alignment with left margins

---

### Pass 2: Location Sheet Phase

**Objective:** Create location sheet phase (Apple-style)

**Files:**
- `components/map/core/mapSheet.constants.js` (modified)
- `components/map/views/locationIntent/MapLocationIntentStageBase.jsx` (new)
- `components/map/views/locationIntent/MapLocationIntentOrchestrator.jsx` (new)
- `components/map/core/MapSheetOrchestrator.jsx` (modified)
- `screens/MapScreen.jsx` (modified)

**Location Sheet UI (Current Implementation):**
```
┌─────────────────────────────┐
│ Location                [✕] │
│                             │
│  Location selection coming   │
│  soon...                    │
│                             │
│  (TODO: Apple-style UI)     │
└─────────────────────────────┘
```

**Actual Implementation:**
- Reused existing map sheet infrastructure (not new components)
- Added LOCATION_INTENT phase to MAP_SHEET_PHASES
- Created MapLocationIntentStageBase following search/hospital detail pattern
- Used MapSheetShell, MapStageBodyScroll, proper hooks
- Added orchestrator layer for consistency

**Progressive Accuracy Phases (Future):**
- Country → State → City → Street → Find nearest lat/long
- Use free API for address if Mapbox is paid

**Component Structure:**
```jsx
// LocationSheet.jsx
import React from "react";
import { View } from "react-native";
import { useLocationSheetModel } from "./useLocationSheetModel";
import LocationSheetSections from "./LocationSheetSections";
import styles from "./locationSheet.styles";

export function LocationSheet({
  visible,
  onClose,
  onSelectLocation,
  tokens,
  isDarkMode,
}) {
  const model = useLocationSheetModel({
    visible,
    onClose,
    onSelectLocation,
    tokens,
    isDarkMode,
  });

  if (!visible) return null;

  return (
    <View style={[styles.sheet, { backgroundColor: tokens.sheetSurface }]}>
      <LocationSheetSections
        model={model}
        tokens={tokens}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}
```

**Model:**
```jsx
// useLocationSheetModel.js
import { useState, useCallback, useMemo } from "react";
import { useLocationStore } from "../../../../stores/locationStore";

export function useLocationSheetModel({
  visible,
  onClose,
  onSelectLocation,
  tokens,
  isDarkMode,
}) {
  const { savedLocations } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectSavedLocation = useCallback((location) => {
    onSelectLocation?.(location);
    onClose?.();
  }, [onSelectLocation, onClose]);

  const handleSearchAddress = useCallback(() => {
    // TODO: Open address search
    console.log("[LocationSheet] Search address");
  }, []);

  const handleChooseOnMap = useCallback(() => {
    // TODO: Open map picker
    console.log("[LocationSheet] Choose on map");
  }, []);

  return {
    savedLocations,
    searchQuery,
    setSearchQuery,
    handleSelectSavedLocation,
    handleSearchAddress,
    handleChooseOnMap,
    // ... tokens, isDarkMode pass-through
  };
}
```

**Sections:**
```jsx
// LocationSheetSections.jsx
import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./locationSheet.styles";

export function LocationSheetSections({ model, tokens, isDarkMode }) {
  const {
    savedLocations,
    handleSelectSavedLocation,
    handleSearchAddress,
    handleChooseOnMap,
  } = model;

  return (
    <View style={styles.sections}>
      {/* Places section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.mutedText }]}>
          Places
        </Text>
        {/* Mapbox suggestions */}
      </View>

      {/* Saved section */}
      {savedLocations.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tokens.mutedText }]}>
            Saved
          </Text>
          {savedLocations.map((loc) => (
            <Pressable
              key={loc.id}
              onPress={() => handleSelectSavedLocation(loc)}
              style={styles.savedItem}
            >
              <Ionicons
                name={loc.label === "home" ? "home" : "briefcase"}
                size={18}
                color={tokens.titleColor}
              />
              <Text style={[styles.savedText, { color: tokens.titleColor }]}>
                {loc.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Choose location section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tokens.mutedText }]}>
          Choose location
        </Text>
        <Pressable onPress={handleSearchAddress} style={styles.actionItem}>
          <Ionicons name="search" size={18} color={tokens.titleColor} />
          <Text style={[styles.actionText, { color: tokens.titleColor }]}>
            Search new address
          </Text>
        </Pressable>
        <Pressable onPress={handleChooseOnMap} style={styles.actionItem}>
          <Ionicons name="map" size={18} color={tokens.titleColor} />
          <Text style={[styles.actionText, { color: tokens.titleColor }]}>
            Choose on map
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

**Pass 2 Checklist:**
- [x] Add LOCATION_INTENT phase to mapSheet.constants.js
- [x] Create MapLocationIntentStageBase following standard pattern
- [x] Create MapLocationIntentOrchestrator layer
- [x] Integrate into MapSheetOrchestrator switch statement
- [x] Add proper prop threading (sheetHeight, snapState, onClose)
- [x] Test location sheet open/close
- [x] Test header with close button
- [x] Verify snap states (COLLAPSED, HALF) work

---

### Pass 3: Explore Intent Decongestion

**Objective:** Remove inline location card, redirect to location sheet

**Files:**
- `components/map/views/exploreIntent/MapExploreIntentHospitalSummaryCard.jsx` (modify)
- `hooks/map/exploreFlow/useMapExploreFlow.js` (modify)

**Changes:**
```jsx
// MapExploreIntentHospitalSummaryCard.jsx
// PULLBACK NOTE: Remove inline location setup card (lines 191-286)
// OLD: When requiresLocationSelection, show location setup card with Use device location + Enter address manually
// NEW: Return null when requiresLocationSelection, let parent redirect to location sheet

if (requiresLocationSelection) {
  return null; // Don't show inline card, parent handles redirect
}
```

```jsx
// useMapExploreFlow.js
// PULLBACK NOTE: Redirect location-off to location sheet instead of explore intent
// OLD: Explore intent shows inline location card
// NEW: When requiresLocationSelection, open location sheet instead of explore intent

useEffect(() => {
  if (locationControl?.requiresLocationSelection && !locationSheetVisible) {
    setLocationSheetVisible(true);
  }
}, [locationControl?.requiresLocationSelection]);
```

**Pass 3 Checklist:**
- [ ] Remove inline location card from MapExploreIntentHospitalSummaryCard
- [ ] Add location sheet visibility state to useMapExploreFlow
- [ ] Redirect location-off to location sheet
- [ ] Test location-off flow opens location sheet
- [ ] Test location-set flow shows chrome
- [ ] Test chrome tap opens location sheet

---

### Pass 4: All Pickup Locations Redirect

**Objective:** Redirect all pickup address locations to location sheet

**Files:**
- `components/map/surfaces/search/MapSearchSheetSections.jsx` (modify)
- `components/map/tracking/MapTrackingSheet.jsx` (modify)
- `components/map/hospital/HospitalDetailSheet.jsx` (modify)
- `components/map/service/ServiceDetailSheet.jsx` (modify)

**Changes:**
```jsx
// MapSearchSheetSections.jsx
// PULLBACK NOTE: Redirect handleChangeLocation to location sheet
// OLD: handleChangeLocation logs to console (TODO)
// NEW: handleChangeLocation opens location sheet

const handleChangeLocation = useCallback(() => {
  // Open location sheet instead of logging
  onOpenLocationSheet?.();
}, [onOpenLocationSheet]);
```

**Pass 4 Checklist:**
- [ ] Update search sheet handleChangeLocation to open location sheet
- [ ] Update tracking sheet pickup address to open location sheet
- [ ] Update hospital detail pickup to open location sheet
- [ ] Update service detail pickup to open location sheet
- [ ] Test all redirects to location sheet
- [ ] Test location sheet consistency across all entry points

---

## Pass Order

1. **Pass 1: Chrome Affordance** - Add window to location sheet (highest priority, visible change)
2. **Pass 2: Location Sheet Phase** - Create location sheet (foundation for other passes)
3. **Pass 3: Explore Intent Decongestion** - Remove inline card, redirect to location sheet
4. **Pass 4: All Pickup Locations Redirect** - Unify all location change affordances

**Rationale:**
- Pass 1 gives immediate visual feedback (chrome above sheet)
- Pass 2 builds foundation (location sheet needs to exist before redirects)
- Pass 3 decongests explore intent (depends on location sheet existing)
- Pass 4 unifies affordances (depends on location sheet being stable)

---

## Success Criteria

**Pass 1 (Chrome):**
- Chrome visible above mid-phase sheet
- Chrome left-aligned with left margins
- Chrome shows current location or "Set location"
- Chrome tap opens location sheet (placeholder for now)

**Pass 2 (Location Sheet):**
- Location sheet opens/closes smoothly
- Saved locations (Home/Work) visible
- Mapbox suggestions work
- Address quality validation applies
- UI matches Apple Maps style

**Pass 3 (Decongestion):**
- Inline location card removed
- Location-off opens location sheet
- Location-set shows chrome
- Explore intent code simplified

**Pass 4 (Redirects):**
- All pickup locations redirect to location sheet
- Consistent location selection pattern
- No location selection logic in individual sheets

---

## Risks & Mitigations

**Risk 1: Location sheet doesn't integrate with existing map sheet**
- Mitigation: Reuse existing map sheet infrastructure, don't create new sheet system

**Risk 2: Chrome alignment breaks on different viewports**
- Mitigation: Test on mobile, tablet, web; use responsive metrics

**Risk 3: Saved locations not populated**
- Mitigation: locationStore already has savedLocations; verify hydration works

**Risk 4: Mapbox API cost**
- Mitigation: Use free API for address if Mapbox paid (future pass)

**Risk 5: Progressive accuracy phases complex**
- Mitigation: Defer to future pass; start with simple address search

---

## Open Questions

1. **Free API for address:** Which free API to use if Mapbox is paid?
2. **Progressive accuracy phases:** When to implement country → state → city → street flow?
3. **Choose on map:** Should this use map picker or drag pin on map?
4. **Location sheet vs map sheet:** Should we reuse existing map sheet or create dedicated location sheet?

---

## Platform Inclusiveness Note

**Location Chrome Platform Status:**
- ✅ **Mobile (iOS/Android)**: LocationChrome implemented and functional
- ❌ **Web**: LocationChrome not yet implemented for web pages
- ❌ **Tablet**: Not yet adapted for tablet layouts

**Reasoning:** Location chrome is primarily a mobile affordance for quick location access while viewing the map. Web platforms typically have different interaction patterns (persistent sidebars, header controls) that don't require floating chrome elements.

**Future Considerations:**
- Web: Could be adapted as a floating panel or integrated into existing web UI
- Tablet: May need positioning adjustments for larger screens
- Desktop: Likely unnecessary due to screen real estate

---

## Related Documentation

### Core Architecture & Guardrails
- `docs/README.md` - Authority hierarchy and repo boundaries
- `docs/architecture/REFACTORING_GUARDRAILS.md` - State management layers, file size rules

### Search & Location Audits
- `docs/audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_AUDIT_2026-05-07.md` - Search sheet Apple HIG alignment (Grade D+ → B+)
- `docs/audit/map/search/SEARCH_SHEET_APPLE_ALIGNMENT_VALIDATION_2026-05-08.md` - Validation report (Grade: A+, 9.9/10)
- `docs/audit/map/search/SEARCH_ARCHITECTURE_DEEP_AUDIT_2026-05-08.md` - Search state flow from context → model → UI
- `docs/audit/map/LOCATION_CONTROL_AND_MANUAL_PICKUP_AUDIT_2026-05-07.md` - Location-off honesty and manual pickup UX
- `docs/audit/map/search/LOCATION_ARCHITECTURE_AUDIT_2026-05-08.md` - 5-layer location flow architecture (GPS → Search → Pickup)

### Implementation References
- `docs/architecture/location/LOCATION_SHEET_ARCHITECTURE_PLAN.md` (this file)
- `docs/ui-rules.json` v2.1 - Apple-level UI standards (referenced in search audit)

### File Structure References
```
components/map/chrome/LocationChrome.jsx                    # Pass 1: Chrome affordance
components/emergency/intake/EmergencyLocationPreviewMap.jsx  # Chrome integration
components/map/core/mapSheet.constants.js                   # LOCATION_INTENT phase
components/map/views/locationIntent/MapLocationIntentStageBase.jsx  # Pass 2: Sheet UI
components/map/views/locationIntent/MapLocationIntentOrchestrator.jsx  # Pass 2: Orchestrator
components/map/views/locationIntent/MapLocationIntentStageParts.jsx   # Baseline shared-surface UI
components/map/views/locationIntent/mapLocationIntent.content.js      # Baseline copy map
components/map/views/locationIntent/mapLocationIntent.model.js        # Baseline derived view model
components/map/views/locationIntent/mapLocationIntent.styles.js       # Baseline styles
components/map/core/MapSheetOrchestrator.jsx                # Sheet orchestration
hooks/map/exploreFlow/useMapExploreFlow.js                   # setSheetPhase fix
screens/MapScreen.jsx                                        # Chrome + sheet wiring
```

---

## Implementation Status

### ✅ Pass 1: Chrome Affordance - COMPLETE

**What was built:**
- LocationChrome component as a progressive pickup chip with neutral compass-outline icon (24px)
- Integrated into EmergencyLocationPreviewMap (left side on bottom-control layouts; right edge of left sidebar on wide/sidebar layouts)
- Haptic feedback and scale animation on press
- Wired to open LOCATION_INTENT sheet phase

**Design decisions:**
- Progressive disclosure: icon-only by default, pickup copy only after hint/intent.
- The default state stays compact to protect explore intent hierarchy.
- First tap expands the pickup chip.
- When expanded, tapping the compass side collapses it; tapping the copy/chevron side opens LocationSheet.
- The expanded chip copy is:

```txt
Pickup
Hemet, CA
›
```

- A one-time gentle peek can expand the chip briefly after map settle, then collapse.
- Bottom-control layouts keep the affordance on the left for balance; wide/sidebar layouts attach it to the right edge of the left sidebar on the same vertical axis as the sidebar search/profile header, so it reads as contextual sheet chrome instead of a competing far-map control.
- Dark/light mode support with proper tokens

### ✅ Map Camera Control Toggle - COMPLETE

**What was built:**
- The nearby-overview map control is a true toggle:
  - first tap frames the user plus nearby hospital candidates
  - second tap restores the normal user-to-hospital route framing
- The locate/user map control is also a toggle:
  - first tap centers the camera on the user
  - second tap restores the normal user-to-hospital route framing
- Route, user, or hospital changes reset these camera toggle states so stale camera intent does not leak across contexts.

**Design decisions:**
- The controls should behave like reversible camera modes, not one-way jumps.
- The canonical resting frame remains the route/user-hospital/polyline fit.
- Nearby overview and user-centered mode stay independent, but either mode returns to the canonical route frame on second tap.

### ✅ Pass 2: Location Sheet Phase - COMPLETE

**What was built:**
- LOCATION_INTENT phase added to MAP_SHEET_PHASES
- MapLocationIntentStageBase following search/hospital detail pattern
- MapLocationIntentOrchestrator for consistency
- Proper MapSheetShell integration with header/close button
- Production-ready placeholder with theme-sensitive UI

**Baseline uplift (current turn):**
- Split location intent into dedicated `content`, `model`, `styles`, and `parts` files
- Replaced placeholder copy block with shared-sheet baseline surfaces:
  top-slot orientation, actual location header, hero card, grouped action rows, support panel
- Wired `locationControl`, `onUseCurrentLocation`, and snap-state toggling into LOCATION_INTENT
- Aligned LOCATION_INTENT with the same transition wrapper used by other map sheet phases
- Reused existing components (MapTrackingTopSlot, TrackingTeamHeroCard, etc.) with existing styles

**Spacing & drag bar fixes (2026-05-08):**
- Fixed drag bar visibility: forced sheet mode (sidebar mode hides drag bar)
- Removed handleFloatsOverContent prop to match explore intent pattern
- Reverted body padding to 6 (matching hospital detail/explore intent patterns)
- Removed unnecessary wrapper View in collapsed state to eliminate double padding
- Body content now uses proper wrapper with minimal padding

**Architecture compliance:**
- ✅ 5-layer architecture (L1-L5)
- ✅ Established orchestrator → stage base → MapSheetShell pattern
- ✅ No layer violations
- ✅ Proper state management

### 🔄 Pass 3: Explore Intent Decongestion - PENDING

### 🔄 Pass 4: All Pickup Locations Redirect - PENDING

### 🔄 Full Location Management Pass - ACTIVE

**Implementation baseline added after `085ba39`:**

- `LOCATION_INTENT` now accepts optional object payloads in `mapFlowContracts`, so source-return metadata and preserved address queries survive normalization.
- LocationIntent owns pickup candidate confirmation for current/device pickup, saved Home/Work places, recent pickups, address-search predictions, and guided manual entry.
- Manual entry now uses a guided sequence with plain-language country selection: country/region, state/province/region, city, street address, apartment/landmark, and responder note.
- Country selection reuses the existing registration `CountryPickerModal` rather than introducing a second picker.
- Manual address confirmation geocodes through Mapbox first and falls back to OpenStreetMap/Nominatim when Mapbox is unavailable.
- Manual confirmation no longer fabricates `0,0` coordinates. If no real coordinate can be resolved, the sheet keeps the user in manual correction instead of committing false pickup truth.
- Search sheet saved-location rows now normalize into the canonical `onSelectLocation` shape.
- Search sheet `Change location` now redirects into LocationIntent instead of logging a TODO.
- Hospital list `Change location` now redirects into LocationIntent with source-return payload.
- Location edits can return to supported source phases through the shared pickup return model.

**Still intentionally deferred:**

- Full saved-place management modal for editing Home/Work/Add labels.
- True map pin-drag UI for `pinAdjust`.
- Tracking pickup mutation; tracking remains read-only unless a backend request-destination mutation path is added.

---

## Commit References

### Pass 1 & 2 Implementation
**Commit Message:** 
```
feat: Location sheet Pass 1 & 2 - Chrome affordance and sheet phase

- Add LocationChrome component with binoculars icon (left of map)
- Integrate chrome into EmergencyLocationPreviewMap with haptic feedback
- Add LOCATION_INTENT phase to map sheet constants
- Create MapLocationIntentStageBase following standard sheet pattern
- Add MapLocationIntentOrchestrator layer for consistency
- Wire up chrome tap to open location sheet
- Implement proper close handler returning to explore intent
- Follow Apple HIG principles and established sheet architecture
- Align with search sheet patterns and 5-layer architecture

Related: #location-sheet-architecture
Refs: LOCATION_SHEET_ARCHITECTURE_PLAN.md
```

**Files Changed:**
- ✅ `components/map/chrome/LocationChrome.jsx` (new)
- ✅ `components/emergency/intake/EmergencyLocationPreviewMap.jsx` (modified)
- ✅ `components/map/core/mapSheet.constants.js` (modified)
- ✅ `components/map/views/locationIntent/MapLocationIntentStageBase.jsx` (new)
- ✅ `components/map/views/locationIntent/MapLocationIntentOrchestrator.jsx` (new)
- ✅ `components/map/core/MapSheetOrchestrator.jsx` (modified)
- ✅ `hooks/map/exploreFlow/useMapExploreFlow.js` (modified)
- ✅ `screens/MapScreen.jsx` (modified)

**Rollback Strategy:**
- Revert commit to remove location sheet infrastructure
- Chrome affordance and LOCATION_INTENT phase cleanly removable
- No breaking changes to existing flows

## Location Sheet Layout

```txt
LocationSheet

1. Grabber and Header.

2. Location input
   [ Search address or place ] || Manual Input Icon to toggle location sheet phase to manual input state.

3. Current location card - Reuse Card in Search sheet phase nothing extra.
   - Current detected address
   - Use current location
   - Change location

4. Places orb row
   - Home
   - Work
   - Add

5. Recents
   - Marked location
   - Recent address
   - Recent hospital/location

6. Manual fallback
   - Can’t find it?
   - Enter manually
```

## Location Sheet Snap Layout Contract

This is the canonical layout rule for the next implementation passes. It adapts the strongest `/map` sheet patterns already used by explore intent, tracking, and commit payment:

- Explore intent: half-snap shows only the core decision surfaces; expanded adds browsing depth.
- Tracking: half-snap keeps the hero and operational CTAs visible; expanded adds route/details.
- Commit payment: half-snap keeps the decisive pay CTA visible; expanded adds selector depth and cost breakdown.

LocationSheet follows the same rule:

```txt
Half / idle default
  Header
  Search address or place [manual icon]
  Current location card
    Right meta CTA: Change / Use device / Settings
  Places orb row
    Home
    Work
    Add
  Manual fallback
    Can't find it?
    Enter manually

Expanded / idle default
  Everything in half / idle default
  Recents
    Marked location
    Recent address
    Recent hospital/location
  Longer search/result depth where available
```

Core CTAs must never require expansion:

- Search input is always visible in half-snap.
- Manual entry is reachable from both the input trailing icon and the fallback row.
- The current-location hero decision is visible in half-snap through the right meta CTA.
- Home, Work, and Add are visible in half-snap.
- Confirm selected location is visible in half-snap after any candidate is selected.
- Terminal decision CTAs belong in a sticky footer outside the scroll body when the sheet content can scroll.
- Expanded state must not bury the active decision CTA beneath recents, predictions, edit fields, or explanatory copy.

Expanded state is only for depth, not permission:

- More recents.
- More address predictions.
- Detail copy and secondary context.
- Future saved-place management.

Mode-specific layout replaces lower-priority browsing content rather than appending under it:

- Sheet phase changes use the shared map phase transition language.
- Keep the sheet shell mounted while the body refocuses.
- Never show a blank white body between modes on web or mobile.
- Loading states should match the destination layout shape:
  - search uses result-shaped rows
  - manual geocoding keeps the manual/review body with inline progress
  - save/update/remove keeps the address group with CTA pending state

```txt
addressSearch
  Header
  Search input
  Address/place predictions
  Current location card, places, and manual fallback can remain below if space allows

manualStep
  Header
  Search input
  Single guided field
    Back to pickup choices
    Previous step
    Next / Skip / Review pickup

placeSelected / pinAdjust / confirm
  Header
  Search input
  Confirm selected location card
    Use this location
```

Implementation rules:

- Use the existing `MapSheetShell`, `MapStageBodyScroll`, and top-slot pattern.
- Do not override shared map presentation mode: mobile renders as a bottom sheet, centered modal variants render as modal, and wide/sidebar variants render as the same left sidebar used by explore intent, tracking, payment, and detail phases.
- Reuse visual primitives already established in the map sheets: grouped cards, action rows, orb/icon buttons, pressed opacity/scale feedback, and inline loading/confirm affordances.
- Keep `LocationSheet` as the owner of address search and location candidate confirmation.
- Keep SearchSheet, payment, tracking, hospital detail, and service detail as consumers/openers of the selected location, not owners of location search.
- Do not add a separate second sheet system.
- Do not make manual entry a multi-field visible form.
- Manual entries must never commit fabricated coordinates. If geocoding cannot resolve a real coordinate, keep the user in manual correction until true map pin confirmation exists.
- Manual low-confidence entries must eventually route through map confirmation before commit once `pinAdjust` has a draggable pin implementation.

## Interaction Architecture

```ts
type LocationSheetMode =
  | "default"
  | "addressSearch"
  | "placeSelected"
  | "manualStep"
  | "pinAdjust"
  | "confirm";
```

## Flow

```txt
Default
  ↓ tap input
Address Search Mode
  ↓ select prediction
Place Selected Mode
  ↓ optional refine
Confirm

Default
  ↓ tap current location
Confirm Current Location

Default
  ↓ tap orb place
Confirm Saved Place

Default
  ↓ tap Enter manually
Manual Guided Mode
  ↓ step-by-step address capture
Confirm

Default
  ↓ tap Adjust on map
Pin Adjust Mode
  ↓ drag pin
Confirm
```

## Manual Address Nuance

Manual entry should not be a visible multi-field form.

It should be guided:

```txt
Step 1
Which country or region?

Step 2
State, province, or region?

Step 3
What city?

Step 4
Street address or landmark?

Step 5
Apartment, unit, or landmark?

Step 6
Any note for responders?

Review pickup
```

But only after:

```txt
Can’t find it?
Enter manually
```

Production rules:

- Tapping manual entry opens Step 1 directly. Do not render a separate "Start" intro state.
- Country selection uses the existing registration country picker, with location-specific title/search copy and selected-state feedback.
- Required fields: country/region, city, and street address/place/landmark.
- State/region is shown as its own step because users expect it, but it is not hard-required globally.
- Unit/landmark detail and responder note are optional; the primary action changes to `Skip` when optional input is empty.
- `Review pickup` geocodes the composed address through Mapbox, with OpenStreetMap fallback only when Mapbox is unavailable.
- If neither provider returns finite coordinates, keep the user on the street-address step with a correction message. Never fall back to stale/current GPS for a different manual pickup.
- `selectedLocation` carries `countryCode`, `unit`, `responderNote`, and `confidence` forward so SearchSheet and downstream flows consume the same canonical pickup shape.

## Smart Address Search Inside Location Sheet

This uses the existing address search logic, but the ownership changes:

```txt
Before:
SearchSheet owns address search

After:
LocationSheet owns address search
SearchSheet consumes selectedLocation
```

So:

```ts
selectedLocation = {
  source: "current" | "saved" | "recent" | "search" | "manual" | "pin",
  label: string,
  address: string,
  coords: { latitude: number; longitude: number },
  confidence?: "high" | "medium" | "low",
  unit?: string,
  responderNote?: string,
};
```

## Top-To-Bottom Full Feature Pass

Build the sheet in the same order the user sees it. Each pass must finish UI, state behavior, data flow, and side effects before moving to the next pass.

### Pass A - Search

Scope:

- Focusing the search field expands the sheet and switches the body into `addressSearch`.
- Search state replaces default content; it must not push the hero, places, manual, or recents downward.
- Reuse SearchSheet primitives: grouped result surfaces, result rows, loading rows, empty states, address result grouping, and saved/current-location blades where appropriate.
- Reuse the existing location search query path and suggestion mapper; normalize `mapboxService.suggestAddresses` call shape before adding deeper search behavior.
- Do not add a LocationSheet-only search hook, provider adapter, or result mapper.
- Address suggestions are location candidates, not final commits.
- Selecting a result creates a candidate and collapses the sheet to a decision state.
- Candidate decision actions:
  - Use as pickup.
  - Set/update Home.
  - Set/update Work.
  - Save as another place.
- Committing pickup uses the canonical `selectedLocation` shape.
- Saving a place uses the same candidate object and saved-location store.
- Home/Work are singleton identity slots and update existing entries instead of creating duplicate labels.
- Generic saved places preserve the candidate display label and only dedupe through same-address or same-coordinate store rules.
- `Save Place` opens an in-sheet category phase, keeps the selected address group visible, and uses the top-left back affordance to return to the candidate decision.
- Home/Work save from category as fast paths; Family, School, Pharmacy, Care, and Other continue to a details phase for label, unit/landmark, and responder note before saving.
- Successful category/details saves return to the selected-address decision surface with saved feedback instead of leaving the user inside the nested save flow.

Deferred inside Pass A:

- Preview-only map camera state. Until a non-committing map preview API exists, selecting a result can collapse into candidate decision UI, but final pickup mutation happens only from `Use as pickup`.

### Pass B - Hero Card

Scope:

- The hero card stays simple and comparable to the SearchSheet location blade.
- Remove extra CTA rows below the hero.
- The right meta slot owns the current decision copy:
  - Device pickup active: `Change`.
  - Manual/saved pickup active: `Use device`.
  - Permission blocked: `Settings`.
- `Adjust on map` remains documented for future pin-adjust work, but is not a primary visible CTA.

### Pass C - Places

Scope:

- Audit saved-location storage and normalize Home/Work/Other labels.
- Keep `locationStore.savedLocations` and `savedLocationsSyncService` as the existing ownership lane; do not add a parallel saved-address store or cloud writer.
- Reuse LocationSheet states for CRUD; do not create separate CRUD modals.
- Place actions:
  - Use saved place as pickup.
  - Add Home/Work/Other from search/manual candidate.
  - Update Home/Work if an entry already exists.
  - Rename/delete saved places in a later manage state.

### Pass D - Manual

Scope:

- Manual entry remains guided and single-field.
- Manual assistance should reuse the same address/geocode services and candidate normalization as search.
- Address quality checks should be context-aware; POIs, landmarks, hospitals, apartments, and international addresses cannot be rejected only because they lack a US-style street number/type.
- After manual geocode succeeds, it uses the same candidate decision state as search:
  - Use as pickup.
  - Set/update Home.
  - Set/update Work.
  - Save as another place.
- Manual entries never commit fabricated coordinates.

### Pass E - Recents

Scope:

- Recents combine recent searches, manual pickups, saved-location uses, and visited locations when available.
- Reuse existing grouped list design from ExploreIntent/RecentVisits rather than creating a new row language.
- Selecting a recent location creates the same candidate decision state.
