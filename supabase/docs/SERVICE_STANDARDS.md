# 🏛️ Service Standards — Cross-Codebase Contract

Rules for writing and maintaining services across `ivisit-app` (Expo) and `ivisit-console` (Vite).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 SUPABASE (Shared)                │
│  Tables · RPCs · RLS · Triggers · Edge Fns      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│            SHARED SERVICE PATTERNS               │
│  ID Resolution · UUID Validation · Retry Logic   │
│  Batch Processing · Audit Logging · Timeout      │
│  (supabaseHelpers.js + displayIdService.js)      │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ivisit-app (Mobile)        ivisit-console (Web)
   Error → Alert.alert()      Error → toast.error()
   State → Redux + AsyncStore State → React local
   Auth  → Expo deep link     Auth  → Browser redirect
   Maps  → Mapbox native      Maps  → Leaflet/DOM
```

---

## Zone 1: Identical Logic (Must Stay in Sync)

These files serve the same purpose with the same logic. When you change one, change both.

| Utility | App Path | Console Path |
|---|---|---|
| Display ID Service | `services/displayIdService.js` | `src/services/displayIdService.js` |
| Supabase Helpers | `services/supabaseHelpers.js` | `src/services/supabaseHelpers.js` |

### Canonical Imports

| Function | App Import From | Console Import From |
|---|---|---|
| `isValidUUID` | `services/displayIdService.js` | `lib/utils.js` |
| `isDisplayId` | `services/displayIdService.js` | `services/displayIdService.js` |
| `resolveEntityId` | `services/displayIdService.js` | `services/displayIdService.js` |
| `withRetry` | `services/supabaseHelpers.js` | `services/supabaseHelpers.js` |
| `withTimeout` | `services/supabaseHelpers.js` | `services/supabaseHelpers.js` |
| `batchProcess` | `services/supabaseHelpers.js` | `services/supabaseHelpers.js` |
| `subscribeToTable` | `services/supabaseHelpers.js` | `services/supabaseHelpers.js` |
| `withAudit` | `services/supabaseHelpers.js` | `services/supabaseHelpers.js` |

**Rule**: Never re-declare `isValidUUID` inline. Always import from the canonical source for that codebase.

---

## Zone 2: Same Purpose, Different Implementation

These serve the same architectural role but are platform-specific. They are allowed to diverge.

| Concern | App | Console |
|---|---|---|
| Error handling | `utils/authErrorUtils.js` | `utils/errorHandler.js` |
| Domain mapping | `utils/domainNormalize.js` | `utils/dataMappingUtils.js` |
| Auth flow | `services/authService.js` (Expo OAuth) | `services/authService.js` (browser) |
| Field safety | Not needed | `utils/databaseFields.js` |
| RBAC guards | RLS only | `services/rbacPatterns.js` |

---

## Zone 3: Platform-Only

No equivalent in the other codebase. No sync needed.

| App Only | Console Only |
|---|---|
| `hapticService.js` | `staffSchedulingService.js` |
| `soundService.js` | `analyticsService.js` |
| `ocrService.js` | `bedManagementService.js` |
| `realtimeAvailabilityService.js` | `walletService.js` |
| `splashHelper.js` | `onboardingService.js` |

---

## Service Writing Rules

### 1. ID Handling
```javascript
// ✅ CORRECT: Import from canonical source
import { isValidUUID, resolveEntityId } from './displayIdService';

// ❌ WRONG: Inline regex
const isUUID = /^[0-9a-f]{8}-...$/i.test(id);
```

### 2. Queries Must Validate IDs
```javascript
// ✅ CORRECT: Guard before querying
async getById(id) {
    const resolvedId = await resolveEntityId(id);
    if (!resolvedId || !isValidUUID(resolvedId)) return null;

    const { data, error } = await supabase
        .from('table')
        .select('*')
        .eq('id', resolvedId)
        .single();
    ...
}
```

### 3. Retry for Reads, Caution for Writes
```javascript
// ✅ Reads: always retry
const data = await withRetry(() => supabase.from('hospitals').select('*'));

// ⚠️ Writes: only if idempotent
const data = await withRetry(
    () => supabase.from('hospitals').upsert(row, { onConflict: 'place_id' }),
    { maxRetries: 2 }
);
```

### 4. Timeout for RPCs
```javascript
// ✅ RPCs on potentially slow networks
const result = await withTimeout(
    supabase.rpc('nearby_hospitals', { user_lat: lat, user_lng: lng }),
    8000,
    'Hospital search timed out'
);
```

### 5. Error Handling is Platform-Specific
```javascript
// App (React Native):
import { handleSupabaseError } from '../utils/authErrorUtils';
throw handleSupabaseError(error);

// Console (React DOM):
import { handleApiError } from '../utils/errorHandler';
handleApiError(error, 'fetch');
```

### 6. Audit Critical Mutations
```javascript
// ✅ Wrap financial/emergency operations
return withAudit('emergency.create', 'emergency_request', async () => {
    const { data, error } = await supabase.rpc('create_emergency_v4', params);
    if (error) throw error;
    return data;
}, { payment_method: params.payment_method });
```

---

## Sync Discipline

| What | How | Automated? |
|---|---|---|
| Migrations | `scripts/sync_to_console.js` | ✅ Yes |
| Docs | `scripts/sync_to_console.js` | ✅ Yes |
| Types (`database.ts`) | `scripts/sync_to_console.js` | ✅ Yes |
| Zone 1 services | Manual copy after changes | ❌ No |
| Zone 2/3 services | Independent | N/A |

**When you change a Zone 1 file**: update both codebases, commit both, push both.

---
*Standardized — February 19, 2026*
