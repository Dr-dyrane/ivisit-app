> **Reconciliation 2026-05-24:** See [docs/audit/RECONCILIATION_2026-05-24.md](../../RECONCILIATION_2026-05-24.md) for current status of the findings below and any carryforward.

---

# Provider Data Richness - Permanent Fix

**Date:** 2026-05-16
**Updated:** 2026-05-17
**Status:** ✅ SHIPPED — `providers` table committed (commit `2bd6879`)
**Goal:** Permanent solution for provider data richness — Option 2 (separate providers table) selected and implemented

---

## Shipped: What Was Done

**20260219000200_org_structure.sql:**
- Added provider taxonomy columns to hospitals table:
  - `provider_type` TEXT (hospital, pharmacy, lab, radiology, urgent_care, clinic, mental_health, womens_care, pediatrics)
  - `emergency_eligible`, `dispatch_eligible`, `booking_eligible` BOOLEAN
  - `category_confidence` NUMERIC(4,3)
  - `provider_source` TEXT
- Added constraints for provider_type (9 types) and provider_source
- Added indexes for provider_type, emergency_eligible, dispatch_eligible
- Added trigger to sync dispatch_eligibility
- Added `nearby_providers` RPC (explore mode, no emergency filter)
- Added RLS policy for explore providers

**20260219010000_core_rpcs.sql:**
- Updated `nearby_hospitals` RPC to filter `provider_type='hospital' AND emergency_eligible=true`
- Added taxonomy fields to return type

### Existing Schema (hospitals table)

**Generic arrays (already exist):**
- `specialties TEXT[]`
- `service_types TEXT[]`
- `features TEXT[]`

**Hospital-specific fields (irrelevant for non-hospitals):**
- `available_beds`, `icu_beds_available`, `total_beds`
- `ambulances_count`
- `emergency_level`, `emergency_wait_time_minutes`
- `bed_availability JSONB`, `ambulance_availability JSONB`

### UI Notes
- Hospital-specific fields (`available_beds`, `ambulances_count`, `emergency_level`) remain in `hospitals` table — UI must conditionally hide these for non-hospital provider types
- Mapbox only has specific category endpoints for `hospital` and `pharmacy`; others use keyword search (acceptable)

---

## Provider-Specific Field Reference

Fields in `providers` table available for UI rendering per provider type.

### Pharmacy
- `provider_services`: prescription_filling, vaccinations, delivery
- `provider_specialties`: prescription_services, vaccination_services
- `insurance_accepted TEXT[]`
- `structured_hours JSONB`
- `features` flag: `24_hour`

### Lab
- `provider_services`: blood_draw, urine_collection, genetic_testing
- `provider_specialties`: blood_work, urine_tests, genetic_testing
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `appointment_required BOOLEAN`, `report_turnaround TEXT`

### Radiology
- `provider_services`: x_ray, ct, mri, ultrasound
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `appointment_required BOOLEAN`, `report_turnaround TEXT`

### Urgent Care
- `provider_services`: minor_injuries, illnesses, x_ray, lab
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `wait_time` (in `hospitals` table)

### Clinic
- `provider_services`: checkups, vaccinations, minor_procedures
- `provider_specialties`: primary_care, dermatology, cardiology
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `appointment_required BOOLEAN`

### Mental Health
- `provider_services`: therapy, counseling, crisis_intervention
- `provider_specialties`: individual_therapy, group_therapy, cbt
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `crisis_line TEXT`; `features` flag: `telehealth`

### Women's Care
- `provider_services`: ob_gyn, prenatal, mammograms
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `appointment_required BOOLEAN`; `features` flag: `midwife_services`

### Pediatrics
- `provider_services`: vaccinations, well_child, specialized_care
- `insurance_accepted TEXT[]`, `structured_hours JSONB`
- `age_range TEXT`; `features` flag: `pediatric_specialists`

---

## Next Steps

- Populate `providers` table rows from edge function enrichment pass
- Wire `providers` join into `nearby_providers` RPC return type
- Provider detail sheet (EXP-8) consumes `provider_services`, `structured_hours`, `insurance_accepted`

