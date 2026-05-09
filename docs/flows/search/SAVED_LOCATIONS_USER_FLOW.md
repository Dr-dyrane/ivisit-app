# Saved Locations User Flow

## Overview
Saved locations allow users to quickly select frequently used addresses (Home, Work, etc.) from the search sheet without typing.

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  SEARCH SHEET (Explore Intent)                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LOCATION HERO BLADE                                    │   │
│  │                                                         │   │
│  │  [📍] Current location                                  │   │
│  │      Using device location                              │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                         │   │
│  │  [🏠] Home                                              │   │
│  │      2235 Corinto Ct, Henderson NV                      │   │
│  │                                                         │   │
│  │  [💼] Work                                              │   │
│  │      4500 E Sunset Rd, Las Vegas NV                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Address Quality Validation (NEW)

**When saving a location, the address is validated:**

| Check | Description | Penalty |
|-------|-------------|---------|
| Minimum length | Address must be ≥8 characters | -30 pts |
| Word count | Must have street number + name (≥2 words) | -25 pts |
| Character repetition | No "oooo" or "aaaa" patterns | -40 pts |
| Street type | Must contain St, Ave, Rd, etc. | -20 pts |
| Street number | Must start with valid number | -15 pts |

**Scoring:**
- Score ≥60: Address accepted
- Score <60: Address rejected with warning

**Example rejections:**
```
❌ "corintoo ct corito ct" → Rejected (repetition pattern, low quality)
❌ "main street" → Rejected (missing street number)
✅ "2235 Corinto Ct, Henderson NV 89074" → Accepted
```

**Implementation:**
```javascript
// File: stores/locationStore.js
import { calculateAddressQuality } from '../utils/addressQualityValidator';

addSavedLocation: (location) => {
  const quality = calculateAddressQuality(location.address);
  if (!quality.isValid) {
    console.warn('Low quality address rejected:', quality.issues);
    return; // Don't save
  }
  // ... proceed with save
}
```

---

### 2. Refresh Address Feature (NEW)

**When GPS coordinates are accurate but address text is wrong:**

**User Action:** Long-press on saved location → "Refresh Address"

**What happens:**
1. Uses saved GPS coordinates (lat/lng)
2. Calls Mapbox reverse geocode API
3. Updates address text with fresh result
4. Preserves location label (Home/Work/Other)

**Implementation:**
```javascript
// File: hooks/map/useSavedLocationRefresh.js
const { refreshLocation } = useSavedLocationRefresh();

// Refresh a specific location
await refreshLocation('loc_abc123');

// Refresh all saved locations
await refreshAllLocations();
```

---

### 3. Clear All Saved Locations (NEW)

**For immediate cleanup of corrupted data:**

**Option A: Developer Console**
```javascript
const { clearAllSavedLocations } = require('./scripts/clearSavedLocations');
clearAllSavedLocations();
```

**Option B: Store Action**
```javascript
const store = useLocationStore.getState();
store.clearSavedLocations();
```

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│  Validation  │────▶│   Zustand    │
│   Input      │     │   (60+ pts)  │     │   Store      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                         ┌────────────────────────┘
                         ▼
                  ┌──────────────┐
                  │   Supabase   │
                  │preferences   │
                  │view_prefs    │
                  └──────────────┘
```

---

## Error Handling

### Address Rejected
```
┌─────────────────────────────────────┐
│  ⚠️ Could Not Save Location         │
│                                     │
│  The address appears to be invalid  │
│  or corrupted.                      │
│                                     │
│  [Try Again]  [Search Instead]      │
└─────────────────────────────────────┘
```

### Refresh Failed
```
┌─────────────────────────────────────┐
│  ⚠️ Refresh Failed                  │
│                                     │
│  Could not resolve address from     │
│  GPS coordinates.                   │
│                                     │
│  [Dismiss]                          │
└─────────────────────────────────────┘
```

---

## API Reference

### Address Quality Validator
```typescript
// utils/addressQualityValidator.js

function calculateAddressQuality(address: string): {
  score: number;      // 0-100
  issues: string[];  // List of problems
  isValid: boolean;  // score >= 60
}

function isAddressValid(address: string): boolean;

function getAddressValidationMessage(address: string): {
  valid: boolean;
  message: string;
  score: number;
  details?: string[];
}
```

### Saved Location Refresh Hook
```typescript
// hooks/map/useSavedLocationRefresh.js

function useSavedLocationRefresh(): {
  refreshLocation: (id: string) => Promise<boolean>;
  refreshAllLocations: () => Promise<{ succeeded: number; failed: number }>;
  isRefreshing: boolean;
  refreshError: string | null;
  clearError: () => void;
}
```

---

## Testing Checklist

- [ ] Try saving gibberish address → Should be rejected
- [ ] Try saving "123 Main St" → Should be accepted
- [ ] Long-press saved location → Should show "Refresh Address" option
- [ ] Refresh with no internet → Should show error
- [ ] Clear all locations → All should be removed

---

## Related Files

| File | Purpose |
|------|---------|
| `utils/addressQualityValidator.js` | Address validation logic |
| `stores/locationStore.js` | Saved locations state |
| `hooks/map/useSavedLocationRefresh.js` | Refresh functionality |
| `services/savedLocationsSyncService.js` | Server sync |
| `scripts/clearSavedLocations.js` | Clear utility |

---

*Last updated: May 8, 2026*
