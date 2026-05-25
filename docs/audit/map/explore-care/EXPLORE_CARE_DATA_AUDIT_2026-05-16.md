---
status: historical
owner: architecture
last_updated: 2026-05-24
---

> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Explore Care Data Audit

**Date:** 2026-05-16
**Updated:** 2026-05-17
**Status:** ✅ SHIPPED — DB layer committed, UI through provider list phase committed
**Focus:** Provider data enrichment for explore care flow

---

## UI Implementation Checkpoint — 2026-05-17 ✅

### 1. Entry ✅ COMPLETE
- `MapSheetOrchestrator` correctly routes `PROVIDER_LIST` phase to `MapProviderListOrchestrator`
- `exploreProviderCategory` prop bypasses stale `sheetPayload` batching — category arrives immediately
- `MapProviderListStageBase` applies full mode-aware padding: `topSlotContainerStyle` (sheet/modal/sidebar/wide), `bodyScrollContentPanel` zeroes sidebar outer padding, `styles.bodyScrollContent` re-applies `paddingHorizontal: 14`

### 2. Data ✅ COMPLETE
- `useNearbyProviders` receives correct `providerCategory` + `location` — no stale state
- `isFetching` + `isLoading` guard prevents premature empty-state flash
- `EXPLORE_CATEGORY_META` drives `tintColor`, `iconName`, `titleLabel` per category
- `buildProviderSubtitle` chains city → street → address (mirrors hospital pattern)
- Service tag filter built data-driven from actual `serviceTypes`/`specialties` arrays

### 3. List ✅ COMPLETE
Card DOM structure mirrors hospital list exactly:
- `rowTop` → `rowHeading` (icon + `titleBlock`) + `cardActions` (ETA + ring)
- `cardMeta` chips below `rowTop` (distance, time, rating, price)
- `squircle(20)`, `paddingVertical: 13`, `minHeight: 72`, `borderWidth: 0`
- Icon color: neutral `#FFFFFF` dark / category `tintColor` light (matches hospital pattern)
- Skeleton mirrors card structure: `rowTop`/`rowHeading`/`titleBlock`/`selectionRing`/meta line
- All surface tokens aligned: `rowSurface`, `rowPressed`, `metaChipBg`, `emptySurface`, `filterCountText`
- Filter rail: `squircle(18)` pills, `paddingVertical: 8`, `gap: 8`, `fontSize: 13`, `fontWeight: 700`
- Sort pills (Nearest / Featured / Sponsored) + data-driven service tag pills with counts
- Section headers: `fontSize: 12 / 11`, `letterSpacing: 0`, time-bucket labels
- Empty state: `squircle(28)`, `fontSize: 18`, `fontWeight: 700` — matches hospital `emptyCard`

### Dead Code Audit ✅ CLEAN
Active files (all wired, all needed):
- `components/map/views/providerList/MapProviderListSheet.jsx` — content
- `components/map/views/providerList/MapProviderListStageBase.jsx` — shell + layout
- `components/map/views/providerList/MapProviderListStageParts.jsx` — top slot + body parts
- `components/map/views/providerList/MapProviderListOrchestrator.jsx` — thin pass-through
- `components/map/views/providerList/mapProviderListStage.styles.js` — stage styles
- `components/map/ProviderMarkers.jsx` — map markers

No orphaned or duplicate files found. No dead attempts to clean up.

### Next: Markers Design â¬‡
See Section below — provider marker vs hospital marker audit.

---

---

## Executive Summary

This audit consolidates findings from the explore care data flow, provider data richness, Mapbox category limitations, minimal field requirements, and migration strategy. The goal is to ensure sufficient data for provider list and details views to match hospital quality.

**Key Findings:**
1. **Fallback Images:** Expanded from 4 to 12 hospital images + category-specific libraries (8 images each) for all provider types. ✅ **IMPLEMENTED**
2. **Provider Data Richness:** Providers reuse `hospitals` table schema with hospital-specific fields that are irrelevant for non-hospital providers.
3. **Mapbox Discovery:** Only hospital and pharmacy have specific Mapbox categories; others use keyword search (acceptable).
4. **Minimal Fields:** Identified essential fields per provider type for rich list/details views.
5. **Migration Strategy:** Deferred schema changes until short-term solution (enhance existing fields) is tested.

**Recommendation:** Use short-term solution (enhance existing fields with structured conventions) for immediate improvement. Defer schema changes until provider list/details UI is implemented and validated.

---

## 1. Fallback Image Library ✅ IMPLEMENTED

### Changes Made

**File:** `supabase/functions/discovery/discover-hospitals/index.ts`

**Before:**
- 4 hospital-specific Unsplash images
- Same images used for all provider types
- No category differentiation

**After:**
- 12 hospital images (expanded from 4)
- Category-specific fallback arrays (8 images each):
  - pharmacy, lab, radiology, urgent_care, clinic, mental_health, womens_care, pediatrics
- Updated `pickFallbackHospitalImage` to accept `providerCategory` parameter
- Deployed edge function

**PULLBACK NOTE:**
```typescript
// PULLBACK NOTE: EXPLORE-CARE-DATA-1 — Expanded fallback image library
// OLD: 4 hospital-specific images used for all provider types
// NEW: 12 hospital images + category-specific fallback arrays for richer UI
const DEFAULT_HOSPITAL_IMAGES = [/* 12 images */];

const FALLBACK_IMAGES_BY_CATEGORY: Record<string, string[]> = {
  hospital: DEFAULT_HOSPITAL_IMAGES,
  pharmacy: [/* 8 images */],
  lab: [/* 8 images */],
  radiology: [/* 8 images */],
  urgent_care: [/* 8 images */],
  clinic: [/* 8 images */],
  mental_health: [/* 8 images */],
  womens_care: [/* 8 images */],
  pediatrics: [/* 8 images */],
};

const pickFallbackHospitalImage = (seed: string, providerCategory?: string): string => {
  const category = providerCategory || "hospital";
  const categoryImages = FALLBACK_IMAGES_BY_CATEGORY[category] || DEFAULT_HOSPITAL_IMAGES;
  const idx = hashString(key) % categoryImages.length;
  return categoryImages[idx];
};
```

---

## 2. Provider Data Richness Analysis

### Current Schema Issue

Providers use the **same `hospitals` table schema**, which includes hospital-specific fields that are irrelevant for non-hospital providers:

**Hospital-Specific Fields (Irrelevant for Providers):**
- `availableBeds`, `icuBedsAvailable`, `totalBeds` - bed counts
- `ambulances`, `ambulancesCount` - ambulance counts
- `emergencyLevel`, `emergencyEligible`, `dispatchEligible` - emergency dispatch
- `isDispatchReady` - dispatch readiness
- `bedAvailability`, `ambulanceAvailability` - availability data
- `emergencyWaitTimeMinutes` - ER wait time

**Missing Provider-Specific Fields:**

| Provider Type | Missing Fields |
|--------------|---------------|
| Pharmacy | Hours, prescription services, insurance accepted, 24-hour availability |
| Lab | Test types, sample collection hours, report turnaround, appointment required |
| Radiology | Imaging modalities, appointment required, report turnaround |
| Urgent Care | Wait time, services offered, insurance accepted |
| Clinic | Specialties, appointment booking, insurance accepted, doctors/providers |
| Mental Health | Therapy types, telehealth availability, crisis line |
| Women's Care | Services offered (OB/GYN, prenatal), appointment required |
| Pediatrics | Age range, vaccination services, pediatric specialists |

---

## 3. Mapbox Category Limitations

### Current Discovery Strategy

**Category Mapping:**
```typescript
const CATEGORY_TO_MAPBOX_CATEGORY: Record<string, string | null> = {
  hospital: "hospital",        // ✅ Specific category endpoint
  pharmacy: "pharmacy",        // ✅ Specific category endpoint
  lab: null,                  // ❌ No specific category — keyword fallback
  radiology: null,            // ❌ No specific category — keyword fallback
  urgent_care: null,          // ❌ No specific category — keyword fallback
  clinic: null,               // ❌ No specific category — keyword fallback
  mental_health: null,        // ❌ No specific category — keyword fallback
  womens_care: null,          // ❌ No specific category — keyword fallback
  pediatrics: null,           // ❌ No specific category — keyword fallback
};
```

**Keyword Fallback:**
```typescript
const EXPLORE_CATEGORY_META_KEYWORDS: Record<string, string> = {
  hospital: "hospital",
  pharmacy: "pharmacy",
  lab: "laboratory diagnostic",
  radiology: "radiology imaging",
  urgent_care: "urgent care",
  clinic: "clinic",
  mental_health: "mental health",
  womens_care: "women health",
  pediatrics: "pediatric children",
};
```

**Conclusion:** Current approach is acceptable. Mapbox does not provide category endpoints for most medical provider types. Keyword search is more precise than the generic "medical" category. Google Places is available as a fallback for low-precision categories (lab, radiology, mental health, women's care, pediatrics).

---

## 4. Minimal Field Requirements

### Provider List View

**Required for All Provider Types:**
- Image (category-specific fallback) ✅
- Name
- Rating + reviews count
- Distance
- ETA
- Status (available/unavailable)
- Verification badge
- Provider type badge

**Provider Type-Specific (List View):**
- Pharmacy: 24-hour badge (Medium priority)
- Lab: Test types abbreviated (Low priority)
- Radiology: Imaging modalities abbreviated (Low priority)
- Urgent Care: Wait time (High priority)
- Clinic: Specialties abbreviated (Medium priority)
- Mental Health: Telehealth badge (Medium priority)
- Women's Care: Services offered abbreviated (Low priority)
- Pediatrics: Age range badge (Medium priority)

### Provider Details View

**Required for All Provider Types:**
- Hero image (category-specific fallback) ✅
- Name + verification badge
- Distance + ETA
- Phone, website, directions
- Address
- Hours of operation
- Description
- Status indicator
- Provider type badge

**Provider Type-Specific (Details View):**

| Provider Type | Essential Fields | Nice-to-Have Fields |
|---------------|-----------------|-------------------|
| Pharmacy | Prescription services, 24-hour, insurance | Vaccination services, delivery |
| Lab | Test types, sample hours, report turnaround, appointment, insurance | Accreditation |
| Radiology | Imaging modalities, appointment, report turnaround, insurance | Accreditation |
| Urgent Care | Wait time, services, insurance, appointment | On-site lab, X-ray |
| Clinic | Specialties, appointment, insurance, doctors | Services, telehealth |
| Mental Health | Therapy types, telehealth, crisis line, insurance, appointment types | Specializations |
| Women's Care | Services (OB/GYN, prenatal), appointment, insurance | Midwife services |
| Pediatrics | Age range, vaccination, insurance, pediatric specialists | Well-child visits |

---

## 5. Short-Term Solution (No Schema Changes)

**Strategy:** Use existing fields more effectively with structured conventions.

### Field Enhancement Plan

**1. Enhance `specialties` Usage:**
- Enforce naming convention per provider type
- Pharmacy: `["prescription_services", "vaccination_services"]`
- Lab: `["blood_work", "urine_tests", "genetic_testing"]`
- Radiology: `["x_ray", "ct_scan", "mri", "ultrasound"]`
- Clinic: `["primary_care", "dermatology", "cardiology"]`
- Mental Health: `["individual_therapy", "group_therapy", "cbt"]`
- Women's Care: `["ob_gyn", "prenatal_care", "mammograms"]`
- Pediatrics: `["well_child_visits", "specialized_care"]`

**2. Enhance `service_types` Usage:**
- Use for services offered
- Pharmacy: `["prescription_filling", "vaccinations", "delivery"]`
- Lab: `["blood_draw", "urine_collection", "genetic_testing"]`
- Radiology: `["x_ray", "ct", "mri", "ultrasound"]`
- Urgent Care: `["minor_injuries", "illnesses", "x_ray", "lab"]`
- Clinic: `["checkups", "vaccinations", "minor_procedures"]`
- Mental Health: `["therapy", "counseling", "crisis_intervention"]`
- Women's Care: `["ob_gyn", "prenatal", "mammograms"]`
- Pediatrics: `["vaccinations", "well_child", "specialized_care"]`

**3. Enhance `features` Usage:**
- Add structured flags
- `"24_hour"` - 24-hour availability
- `"telehealth"` - Telehealth available
- `"appointment_required"` - Walk-ins not accepted
- `"walkins_accepted"` - Walk-ins accepted
- `"delivery_available"` - Delivery services available
- `"crisis_line"` - Crisis line available
- `"midwife_services"` - Midwife care available
- `"pediatric_specialists"` - Pediatric specialists on staff

**4. Enhance `description` Usage:**
- Use for provider-specific info that doesn't fit in structured fields
- Insurance accepted
- Report turnaround
- Age range
- Crisis line phone number
- Doctors/providers list

**5. UI Handling:**
- Map `specialties`, `service_types`, `features` to UI components per provider type
- Use provider type to determine which fields to display
- Gracefully handle missing or null fields

---

## 6. Schema Solution — SHIPPED (2026-05-17)

**Status:** ✅ COMPLETE — `providers` table live in `20260219000200_org_structure.sql`

Separate `providers` table created with:
- `hospital_id` FK → `hospitals.id` (CASCADE)
- `provider_type` discriminator with 9-value CHECK constraint
- `provider_services`, `provider_specialties` JSONB
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `appointment_required`, `report_turnaround`, `age_range`, `crisis_line`
- RLS: public read (verified/demo only), service role full, org admin scoped
- Indexes: `hospital_id`, `provider_type`, composite `(hospital_id, provider_type)`

Pillar file: `supabase/migrations/20260219000200_org_structure.sql` (commit `2bd6879`)

---

## 7. Implementation Status

### Completed ✅
- Fallback image library expansion (12 hospital + 8 per category)
- Edge function deployment
- Data flow audit
- Provider data richness analysis
- Mapbox category audit
- Minimal field requirements identification
- Migration strategy planning

### Shipped (2026-05-17) ✅
- `providers` table created with RLS, indexes, triggers (commit `2bd6879`)
- `nearby_hospitals` RPC updated — filters `provider_type='hospital' AND emergency_eligible=true`
- `discover-hospitals` edge function: full provider taxonomy, category fallback images, `discoverNearbyProviders`
- Provider list UI (EXP-6): `MapProviderListSheet`, `MapProviderListStageBase`, markers, sheet phases
- Map focus: `useMapFocusedState` provider phase awareness, `suppressHospitalMarkers`, `focusedCoordinate`

### Not in Scope (This Audit)
- Provider detail CTA / book-ride flow (EXP-9)
- Provider detail sheet polish (EXP-8) — wired but not reviewed
- Data enrichment from external APIs

---

## 8. Next Steps

1. **Provider detail sheet review** — EXP-8 wired, pending runtime validation
2. **Book-ride CTA** — EXP-9: provider selected → ride booking flow
3. **Data enrichment** — populate `providers` table with real service/hours/insurance data
4. **Test provider list → detail → close flow** — validate phase transitions and map state

---

## 9. Files Modified

- `supabase/functions/discovery/discover-hospitals/index.ts` - Fallback image library expansion

---

## 10. Audit Documents Consolidated

This document consolidates the following individual audits (now deleted):
- `DATA_FLOW_AUDIT_2026-05-16.md`
- `PROVIDER_DATA_RICHNESS_AUDIT_2026-05-16.md`
- `MAPBOX_CATEGORY_AUDIT_2026-05-16.md`
- `PROVIDER_FIELDS_MINIMAL_AUDIT_2026-05-16.md`
- `MIGRATION_STRATEGY_AUDIT_2026-05-16.md`
