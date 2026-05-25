---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Saved Locations Database & RLS Audit

**Date:** 2026-05-08  
**Scope:** Analysis of adding home/work addresses to profiles table  
**Related:** SEARCH_SHEET_APPLE_ALIGNMENT_AUDIT_2026-05-07.md

---

## Executive Summary

**Recommendation: Proceed with unified search (remove mode chips) WITHOUT adding home/work addresses to DB.**

Instead, **use the existing single `address` field as "Home"** and add a separate `saved_addresses` table later for unlimited addresses. This avoids schema changes now while delivering immediate value.

---

## 1. Current Database State

### Profiles Table (0001_identity.sql)

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    image_uri TEXT,
    avatar_url TEXT,
    address TEXT,  -- ← SINGLE ADDRESS FIELD
    gender TEXT,
    date_of_birth TEXT,
    role TEXT DEFAULT 'patient',
    ...
);
```

**Key Finding:** Only one `address` field exists (text, no coordinates).

### Current RLS Policies (0007_security.sql)

```sql
-- Profiles RLS
CREATE POLICY "Profiles are readable by owner or admin"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.p_is_admin());

CREATE POLICY "Profiles are updatable by owner"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Key Finding:** RLS is owner-based. Adding columns doesn't change policy structure.

---

## 2. Option Analysis: Saved Locations Storage

### Option Z: Extend `locationStore` (Zustand) — **RECOMMENDED FOR NOW**

**Current State:** `stores/locationStore.js` already persists to local database:
```javascript
// Already exists
const STORAGE_KEY = StorageKeys.LOCATION_CACHE;

useLocationStore.subscribe((state) => {
  database.write(STORAGE_KEY, {
    userLocation: state.userLocation,
    userLocationSource: state.userLocationSource,
    locationPermission: state.locationPermission,
  });
});
```

**Extension needed:**
```javascript
// Add to locationStore.js
savedLocations: [],  // Array of saved addresses

addSavedLocation: (location) => { ... },
removeSavedLocation: (id) => { ... },
updateSavedLocation: (id, patch) => { ... },
```

**Persistence:** Automatically saved to `StorageKeys.LOCATION_CACHE` via existing subscription.

**RLS Impact:** ✅ **NONE** — Local storage only, no Supabase RLS needed.

**Migration:** ✅ **NONE** — No DB changes required.

**Per CONTRIBUTING.md:** N/A — Zustand store change, not DB migration.

**Scalability:** ✅ **UNLIMITED ADDRESSES**
- Users can have home, work, gym, parents, etc.
- Local storage is cheap
- Can sync to DB later if needed

**Offline Support:** ✅ **WORKS WITHOUT INTERNET**
- Saved locations available offline
- No network dependency
- Fast access

---

### Option A: Extend `profiles` Table (Supabase)

**Migration needed:**
```sql
ALTER TABLE public.profiles 
ADD COLUMN home_address TEXT,
ADD COLUMN home_latitude DOUBLE PRECISION,
ADD COLUMN home_longitude DOUBLE PRECISION,
ADD COLUMN work_address TEXT,
ADD COLUMN work_latitude DOUBLE PRECISION,
ADD COLUMN work_longitude DOUBLE PRECISION;
```

**RLS Impact:** ✅ **NO CHANGE REQUIRED**
- Existing policies cover all columns
- Owner can read/update their own profile
- No new policies needed

**Per CONTRIBUTING.md:**
- ✅ Edit `0001_identity.sql` directly (pillar file)
- ✅ Follows "edit pillar, not fix migration" rule
- ⚠ï¸ Requires `db push` or Dashboard SQL run
- ⚠ï¸ Must sync to console after change

**Scalability Issue:**
- Limited to 2 addresses forever
- More addresses = more columns (bad pattern)
- Coordinates in main table (not normalized)

---

### Option B: New `saved_addresses` Table (Recommended for Future)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS public.saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT CHECK (label IN ('home', 'work', 'other')),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved addresses"
ON public.saved_addresses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**RLS Impact:** ✅ **NEW POLICY REQUIRED**
- Simple owner-based policy
- No admin override needed

---

## 5. Recommendation: Phased Approach (Revised with Zustand)

### Pass 1: Unified Search (NOW - No DB Changes)

**Actions:**
1. ✅ **Remove mode chips** — Auto-detect search intent
2. ✅ **Extend `locationStore` with `savedLocations`** — Zustand + local persistence
3. ✅ **Convert recent queries to rows** — UI improvement
4. ✅ **Hide "Nearby now" by default** — Reduce clutter

### Pass 2: Profile-Search Link (NOW - No DB)

**Actions:**
1. Add location picker to profile
2. Save to `locationStore.savedLocations` (label: 'home')
3. Show in search sheet as "ðŸ  Home"
4. Sync profile address to saved locations

### Pass 3: Cloud Sync (LATER - Optional DB Change)

**Actions (only if needed):**
1. Create `saved_addresses` table in Supabase
2. Add sync: Zustand â†” Supabase on login/logout
3. Enable cross-device saved locations

---

**Conclusion:** Proceed with unified search using existing single address. No DB changes needed for immediate value. Plan `saved_addresses` table for future unlimited locations.
