# iVisit Intelligence: Data Flow Audit & Schema-to-State Mapping

**Date**: 2026-02-15  
**Status**: Complete Audit  
**Objective**: Achieve 1:1 mapping between Supabase schema and frontend state

---

## Executive Summary

This document provides a comprehensive audit of data flow between the Supabase database and frontend applications (Expo App & Console). It identifies all schema-to-state mappings, naming inconsistencies, and provides the foundation for type-safe synchronization.

### Key Findings

1. **Naming Convention**: Database uses `snake_case`, frontend uses `camelCase`
2. **Service Layer Pattern**: All services implement `mapToDb()` and `mapFromDb()` transformations
3. **Defensive Programming**: Services detect missing columns and gracefully degrade
4. **Semantic Mismatches**: `profiles.org_id` stores `hospital_id`, not `organization_id`
5. **Fee Calculation**: 2.5% platform fee calculated in database triggers (single source of truth)

---

## 1. Emergency Requests (`emergency_requests`)

### Database Schema
**Table**: `public.emergency_requests`  
**Migration**: `20260109141500_emergency_requests.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | text | `id` | `id` | Primary key |
| `request_id` | text | `requestId` | `request_id` | Unique identifier |
| `user_id` | uuid | `userId` | `user_id` | FK to auth.users |
| `service_type` | text | `serviceType` | `service_type` | 'ambulance' or 'bed' |
| `hospital_id` | text | `hospitalId` | `hospital_id` | FK to hospitals |
| `hospital_name` | text | `hospitalName` | `hospital_name` | Denormalized |
| `specialty` | text | `specialty` | `specialty` | Medical specialty |
| `ambulance_type` | text | `ambulanceType` | `ambulance_type` | Type of ambulance |
| `ambulance_id` | text | `ambulanceId` | `ambulance_id` | FK to ambulances |
| `bed_number` | text | `bedNumber` | `bed_number` | Assigned bed |
| `bed_type` | text | `bedType` | `bed_type` | Type of bed |
| `bed_count` | text | `bedCount` | `bed_count` | Number of beds |
| `status` | text | `status` | `status` | Lifecycle state |
| `estimated_arrival` | text | `estimatedArrival` | `estimated_arrival` | ETA string |
| `created_at` | timestamptz | `createdAt` | `created_at` | Timestamp |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Timestamp |
| `completed_at` | timestamptz | `completedAt` | `completed_at` | Timestamp |
| `cancelled_at` | timestamptz | `cancelledAt` | `cancelled_at` | Timestamp |
| `pickup_location` | geography | `pickupLocation` | `pickup_location` | PostGIS Point |
| `destination_location` | geography | `destinationLocation` | `destination_location` | PostGIS Point |
| `patient_snapshot` | jsonb | `patient` | `patient_snapshot` | Patient data |
| `shared_data_snapshot` | jsonb | `shared` | `shared_data_snapshot` | Shared data |
| `responder_name` | text | `responderName` | `responder_name` | Responder info |
| `responder_phone` | text | `responderPhone` | `responder_phone` | Contact |
| `responder_vehicle_type` | text | `responderVehicleType` | `responder_vehicle_type` | Vehicle type |
| `responder_vehicle_plate` | text | `responderVehiclePlate` | `responder_vehicle_plate` | License plate |
| `responder_location` | geography | `responderLocation` | `responder_location` | PostGIS Point |
| `responder_heading` | numeric | `responderHeading` | `responder_heading` | Compass heading |
| `patient_location` | geography | `patientLocation` | `patient_location` | PostGIS Point |
| `patient_heading` | numeric | `patientHeading` | `patient_heading` | Compass heading |
| `total_cost` | decimal | `totalCost` | `total_cost` | Payment amount |
| `payment_status` | text | `paymentStatus` | `payment_status` | Payment state |
| `payment_method_id` | text | `paymentMethodId` | `payment_method_id` | FK to payment_methods |

### Service Layer
**File**: `services/emergencyRequestsService.js`

**Mapping Functions**: Manual inline mapping in `list()`, `create()`, `update()`

**Status Values**:
- `in_progress` - Initial state
- `accepted` - Provider accepted
- `arrived` - Provider arrived
- `completed` - Service completed
- `cancelled` - Request cancelled

### Context/State Management
**File**: `contexts/EmergencyContext.jsx`

**State Variables**:
- `activeAmbulanceTrip` - Current ambulance request
- `activeBedBooking` - Current bed booking

**Realtime Subscriptions**:
- Emergency request updates (status changes)
- Ambulance location tracking
- Hospital bed availability

---

## 2. Visits/Trips (`visits`)

### Database Schema
**Table**: `public.visits`  
**Migration**: `20260109141000_create_visits.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | text | `id` | `id` | Primary key |
| `user_id` | uuid | `userId` | `user_id` | FK to auth.users |
| `hospital` | text | `hospital` | `hospital` | Hospital name |
| `hospital_id` | text | `hospitalId` | `hospital_id` | FK to hospitals |
| `doctor` | text | `doctor` | `doctor` | Doctor name |
| `doctor_image` | text | `doctorImage` | `doctor_image` | Avatar URL |
| `specialty` | text | `specialty` | `specialty` | Medical specialty |
| `date` | text | `date` | `date` | Visit date |
| `time` | text | `time` | `time` | Visit time |
| `type` | text | `type` | `type` | Visit type |
| `status` | text | `status` | `status` | Visit status |
| `image` | text | `image` | `image` | Hospital image |
| `address` | text | `address` | `address` | Hospital address |
| `phone` | text | `phone` | `phone` | Contact number |
| `notes` | text | `notes` | `notes` | Visit notes |
| `estimated_duration` | text | `estimatedDuration` | `estimated_duration` | Duration |
| `preparation` | text[] | `preparation` | `preparation` | Prep instructions |
| `cost` | text | `cost` | `cost` | Visit cost |
| `insurance_covered` | boolean | `insuranceCovered` | `insurance_covered` | Coverage flag |
| `room_number` | text | `roomNumber` | `room_number` | Room assignment |
| `summary` | text | `summary` | `summary` | Visit summary |
| `prescriptions` | text[] | `prescriptions` | `prescriptions` | Medications |
| `next_visit` | text | `nextVisit` | `next_visit` | Follow-up date |
| `request_id` | text | `requestId` | `request_id` | FK to emergency_requests |
| `meeting_link` | text | `meetingLink` | `meeting_link` | Telehealth URL |
| `lifecycle_state` | text | `lifecycleState` | `lifecycle_state` | Extended state |
| `lifecycle_updated_at` | timestamptz | `lifecycleUpdatedAt` | `lifecycle_updated_at` | State timestamp |
| `rating` | numeric | `rating` | `rating` | User rating |
| `rating_comment` | text | `ratingComment` | `rating_comment` | Feedback |
| `rated_at` | timestamptz | `ratedAt` | `rated_at` | Rating timestamp |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Service Layer
**File**: `services/visitsService.js`

**Mapping Functions**:
```javascript
mapToDb(item)    // camelCase → snake_case
mapFromDb(row)   // snake_case → camelCase
```

**Defensive Column Detection**:
- Detects missing extended emergency columns
- Strips unsupported columns on retry
- Prevents UI crashes from schema mismatches

### Context/State Management
**File**: `contexts/VisitsContext.jsx`

**State Variables**:
- `visits` - All visits array
- `filteredVisits` - Filtered by status
- `selectedVisitId` - Currently selected visit

---

## 3. Hospitals (`hospitals`)

### Database Schema
**Table**: `public.hospitals`  
**Migration**: `20260109201500_create_hospitals.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `name` | text | `name` | `name` | Hospital name |
| `address` | text | `address` | `address` | Street address |
| `google_address` | text | `address` | `google_address` | Google Places address (preferred) |
| `phone` | text | `phone` | `phone` | Contact number |
| `google_phone` | text | `phone` | `google_phone` | Google Places phone (preferred) |
| `rating` | numeric | `rating` | `rating` | User rating |
| `google_rating` | numeric | `rating` | `google_rating` | Google rating (preferred) |
| `type` | text | `type` | `type` | Hospital type |
| `image` | text | `image` | `image` | Hospital image |
| `google_photos` | text[] | `googlePhotos` | `google_photos` | Google Photos array |
| `specialties` | text[] | `specialties` | `specialties` | Medical specialties |
| `service_types` | text[] | `serviceTypes` | `service_types` | Service offerings |
| `features` | text[] | `features` | `features` | Amenities |
| `emergency_level` | text | `emergencyLevel` | `emergency_level` | Trauma level |
| `available_beds` | integer | `availableBeds` | `available_beds` | Current bed count |
| `ambulances_count` | integer | `ambulances` | `ambulances_count` | Ambulance count |
| `wait_time` | text | `waitTime` | `wait_time` | Wait time string |
| `emergency_wait_time_minutes` | integer | `emergencyWaitTimeMinutes` | `emergency_wait_time_minutes` | Wait time numeric |
| `price_range` | text | `price` | `price_range` | Cost estimate |
| `latitude` | numeric | `coordinates.latitude` | `latitude` | GPS coordinate |
| `longitude` | numeric | `coordinates.longitude` | `longitude` | GPS coordinate |
| `distance_km` | numeric | `distanceKm` | `distance_km` | Distance from user |
| `verified` | boolean | `verified` | `verified` | Verification status |
| `status` | text | `status` | `status` | Operational status |
| `organization_id` | uuid | `organizationId` | `organization_id` | FK to organizations |
| `place_id` | text | `placeId` | `place_id` | Google Place ID |
| `google_website` | text | `googleWebsite` | `google_website` | Website URL |
| `google_types` | text[] | `googleTypes` | `google_types` | Google categories |
| `import_status` | text | `importStatus` | `import_status` | Import state |
| `imported_from_google` | boolean | `importedFromGoogle` | `imported_from_google` | Source flag |
| `org_admin_id` | uuid | `orgAdminId` | `org_admin_id` | Admin user |
| `bed_availability` | jsonb | `bedAvailability` | `bed_availability` | Bed details |
| `ambulance_availability` | jsonb | `ambulanceAvailability` | `ambulance_availability` | Ambulance details |
| `last_availability_update` | timestamptz | `lastAvailabilityUpdate` | `last_availability_update` | Last sync |
| `real_time_sync` | boolean | `realTimeSync` | `real_time_sync` | Sync enabled |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Service Layer
**File**: `services/hospitalsService.js`

**Mapping Function**: `_mapHospital(h)` - Comprehensive transformation with Google Places integration

**Computed Properties**:
- `isCovered` - Derived from `verified` and `status`
- `isGoogleOnly` - Derived from `import_status`
- `distance` - Formatted string from `distance_km`

**RPC Functions**:
- `nearby_hospitals(user_lat, user_lng, radius_km)` - PostGIS distance calculation

---

## 4. Ambulances (`ambulances`)

### Database Schema
**Table**: `public.ambulances`
**Migration**: `20260109203000_create_ambulances.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `type` | text | `type` | `type` | Ambulance type |
| `call_sign` | text | `callSign` | `call_sign` | Radio callsign |
| `status` | text | `status` | `status` | Availability |
| `location` | geography | `location` | `location` | PostGIS Point |
| `eta` | text | `eta` | `eta` | Estimated arrival |
| `crew` | jsonb | `crew` | `crew` | Crew members |
| `hospital` | text | `hospital` | `hospital` | Home hospital |
| `hospital_id` | text | `hospitalId` | `hospital_id` | FK to hospitals |
| `profile_id` | uuid | `profileId` | `profile_id` | FK to profiles (driver) |
| `vehicle_number` | text | `vehicleNumber` | `vehicle_number` | License plate |
| `last_maintenance` | timestamptz | `lastMaintenance` | `last_maintenance` | Maintenance date |
| `rating` | numeric | `rating` | `rating` | Service rating |
| `current_call` | text | `currentCall` | `current_call` | Active request ID |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Service Layer
**File**: `services/ambulanceService.js`

**Mapping Function**: `mapFromDb(row)` - Handles PostGIS location parsing

**Location Handling**:
- Parses GeoJSON `{type: 'Point', coordinates: [lon, lat]}`
- Converts to `{latitude, longitude}` for frontend

---

## 5. Payments (`payments`)

### Database Schema
**Table**: `public.payments`
**Migration**: `20260212120000_unified_payment_system.sql`

| Database Column | Type | Frontend Property | Canonical Name | iVisit Canon | Notes |
|----------------|------|-------------------|----------------|--------------|-------|
| `id` | uuid | `id` | `id` | `id` | Primary key |
| `user_id` | uuid | `userId` | `user_id` | `user_id` | FK to auth.users |
| `amount` | decimal | `amount` | `amount` | `amount` | Total payment |
| `currency` | text | `currency` | `currency` | `currency` | Currency code |
| `status` | text | `status` | `status` | `status` | Payment state |
| `payment_method_id` | text | `paymentMethodId` | `payment_method_id` | `payment_method_id` | FK to payment_methods |
| `stripe_payment_intent_id` | text | `stripePaymentIntentId` | `stripe_payment_intent_id` | `stripe_payment_intent_id` | Stripe reference |
| `emergency_request_id` | text | `emergencyRequestId` | `emergency_request_id` | `emergency_request_id` | FK to emergency_requests |
| `organization_id` | uuid | `organizationId` | `organization_id` | `org_id` | **CANONICAL: org_id** |
| `organization_fee_rate` | decimal | `organizationFeeRate` | `organization_fee_rate` | `organization_fee_rate` | Fee percentage |
| `ivisit_deduction_amount` | decimal | `ivisitDeductionAmount` | `ivisit_deduction_amount` | `platform_earnings_bps` | **CANONICAL: platform_earnings_bps** |
| `metadata` | jsonb | `metadata` | `metadata` | `metadata` | Additional data |
| `created_at` | timestamptz | `createdAt` | `created_at` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | `updated_at` | Last update |

### Service Layer
**File**: `services/paymentService.js`

**No explicit mapping functions** - Direct property access

**Fee Calculation**:
- **Database Trigger**: `process_payment_with_ledger()` calculates fees
- **Default Rate**: 2.5% platform fee
- **Single Source of Truth**: Database trigger ensures consistency

**Payment Methods**:
- `card` - Credit/debit card
- `digital_wallet` - Apple Pay, Google Pay
- `cash` - Cash payment (requires org wallet balance)
- `insurance` - Insurance coverage

---

## 6. Organization Wallets (`organization_wallets`)

### Database Schema
**Table**: `public.organization_wallets`
**Migration**: `20260213130000_wallet_ledger_system.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `organization_id` | uuid | `organizationId` | `organization_id` | FK to organizations (UNIQUE) |
| `balance` | decimal | `balance` | `balance` | Current balance |
| `currency` | text | `currency` | `currency` | Currency code |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Wallet Ledger (`wallet_ledger`)

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `wallet_type` | text | `walletType` | `wallet_type` | 'main' or 'organization' or 'patient' |
| `wallet_id` | uuid | `walletId` | `wallet_id` | FK to wallet table |
| `organization_id` | uuid | `organizationId` | `organization_id` | FK to organizations (nullable) |
| `user_id` | uuid | `userId` | `user_id` | FK to auth.users (nullable) |
| `amount` | decimal | `amount` | `amount` | Transaction amount |
| `transaction_type` | text | `transactionType` | `transaction_type` | 'credit', 'debit', 'payout', 'refund' |
| `description` | text | `description` | `description` | Human-readable description |
| `reference_id` | uuid | `referenceId` | `reference_id` | Link to payment/payout |
| `reference_type` | text | `referenceType` | `reference_type` | 'payment', 'payout', 'adjustment' |
| `metadata` | jsonb | `metadata` | `metadata` | Additional data |
| `created_at` | timestamptz | `createdAt` | `created_at` | Transaction time |

### Data Flow
1. **Payment Created** → `payments` table INSERT
2. **Trigger Fires** → `process_payment_with_ledger()`
3. **Fee Calculation** → 2.5% deducted from total
4. **Organization Credit** → `organization_wallets.balance` updated
5. **Platform Credit** → `ivisit_main_wallet.balance` updated
6. **Ledger Entries** → Two rows in `wallet_ledger` (org + platform)

### Service Layer
**File**: `services/paymentService.js`

**RPC Functions**:
- `process_wallet_payment()` - Debit patient wallet
- `check_cash_eligibility()` - Verify org wallet balance

---

## 7. Patient Wallets (`patient_wallets`)

### Database Schema
**Table**: `public.patient_wallets`
**Migration**: `20260214000000_patient_wallet_system.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `user_id` | uuid | `userId` | `user_id` | FK to auth.users (UNIQUE) |
| `balance` | decimal | `balance` | `balance` | Current balance |
| `currency` | text | `currency` | `currency` | Currency code |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Service Layer
**File**: `services/paymentService.js`

**Methods**:
- `getWalletBalance()` - Fetch current balance
- `topUpWallet(amount)` - Add funds via Stripe
- `getWalletLedger(limit)` - Transaction history
- `processWalletPayment()` - Pay from wallet

---

## 8. Profiles (`profiles`)

### Database Schema
**Table**: `public.profiles`
**Migration**: `20260109131236_remote_schema.sql`

| Database Column | Type | Frontend Property | Canonical Name | Semantic Issue |
|----------------|------|-------------------|----------------|----------------|
| `id` | uuid | `id` | `id` | Primary key |
| `username` | text | `username` | `username` | Display name |
| `email` | text | `email` | `email` | Email address |
| `avatar_url` | text | `avatarUrl` | `avatar_url` | Profile picture |
| `address` | text | `address` | `address` | Street address |
| `gender` | text | `gender` | `gender` | Gender |
| `date_of_birth` | text | `dateOfBirth` | `date_of_birth` | DOB |
| `role` | text | `role` | `role` | User role |
| `provider_type` | text | `providerType` | `provider_type` | Provider category |
| `bvn_verified` | boolean | `bvnVerified` | `bvn_verified` | Verification status |
| `org_id` | uuid | `orgId` | `org_id` | **⚠️ STORES hospital_id, NOT organization_id** |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### ⚠️ Critical Semantic Mismatch
**Issue**: `profiles.org_id` actually stores `hospital_id`, not `organization_id`

**Evidence**: From `wallet_ledger_system.sql` line 128:
```sql
JOIN public.hospitals h ON p.organization_id = h.id -- profiles.org_id is Hospital ID
```

**Impact**: This creates confusion in RBAC and wallet lookups

**Recommendation**: Rename to `hospital_id` or create separate `organization_id` column

---

## 9. Medical Profiles (`medical_profiles`)

### Database Schema
**Table**: `public.medical_profiles`
**Migration**: `20260109140000_medical_profiles.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `user_id` | uuid | `userId` | `user_id` | FK to auth.users |
| `blood_type` | text | `bloodType` | `blood_type` | Blood type |
| `allergies` | text[] | `allergies` | `allergies` | Allergies array |
| `medications` | text[] | `medications` | `medications` | Current medications |
| `conditions` | text[] | `conditions` | `conditions` | Medical conditions |
| `emergency_notes` | text | `notes` | `emergency_notes` | Emergency info |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Service Layer
**File**: `services/medicalProfileService.js`

**Mapping**:
- Arrays joined with `, ` for frontend display
- Arrays split on `,` for database storage

**Defensive Handling**:
- Detects missing `emergency_notes` column
- Retries without problematic column
- Prevents UI crashes

---

## 10. Insurance Policies (`insurance_policies`)

### Database Schema
**Table**: `public.insurance_policies`
**Migration**: `20260113182000_create_insurance_policies.sql`

| Database Column | Type | Frontend Property | Canonical Name | Notes |
|----------------|------|-------------------|----------------|-------|
| `id` | uuid | `id` | `id` | Primary key |
| `user_id` | uuid | `userId` | `user_id` | FK to auth.users |
| `provider_name` | text | `providerName` | `provider_name` | Insurance company |
| `policy_number` | text | `policyNumber` | `policy_number` | Policy ID |
| `group_number` | text | `groupNumber` | `group_number` | Group ID |
| `policy_holder_name` | text | `policyHolderName` | `policy_holder_name` | Holder name |
| `plan_type` | text | `planType` | `plan_type` | Plan category |
| `status` | text | `status` | `status` | Policy status |
| `coverage_details` | jsonb | `coverageDetails` | `coverage_details` | Coverage limits |
| `expires_at` | timestamptz | `expiresAt` | `expires_at` | Expiration date |
| `is_default` | boolean | `isDefault` | `is_default` | Default policy flag |
| `linked_payment_method` | jsonb | `linkedPaymentMethod` | `linked_payment_method` | Payment info |
| `created_at` | timestamptz | `createdAt` | `created_at` | Creation time |
| `updated_at` | timestamptz | `updatedAt` | `updated_at` | Last update |

### Service Layer
**File**: `services/insuranceService.js`

**Methods**:
- `list()` - Fetch all policies
- `create(policy)` - Add new policy
- `setDefault(id)` - Set default policy
- `uploadImage(uri)` - Upload insurance card

---

## Summary of Naming Inconsistencies

### 1. iVisit Canon Violations

| Current Name | Canonical Name | Location | Impact |
|-------------|----------------|----------|--------|
| `hospital_id` | `org_id` | Multiple tables | Medium - Semantic confusion |
| `ivisit_deduction_amount` | `platform_earnings_bps` | `payments` table | Low - Internal only |
| `trip_status` | `logistics_state` | Not yet implemented | N/A |

### 2. Semantic Mismatches

| Column | Actual Content | Expected Content | Fix Required |
|--------|---------------|------------------|--------------|
| `profiles.org_id` | `hospital_id` | `organization_id` | **HIGH PRIORITY** |

### 3. Case Convention Consistency

✅ **Consistent Pattern**:
- Database: `snake_case`
- Frontend: `camelCase`
- Service Layer: Transforms between conventions

---

## Realtime Subscriptions

### Active Subscriptions

1. **Emergency Requests** (`EmergencyContext.jsx`)
   - Table: `emergency_requests`
   - Filter: `user_id=eq.{userId}`
   - Events: `UPDATE`
   - Purpose: Status changes, responder updates

2. **Ambulance Location** (`EmergencyContext.jsx`)
   - Table: `ambulances`
   - Filter: `current_call=eq.{requestId}`
   - Events: `UPDATE`
   - Purpose: Real-time location tracking

3. **Hospital Beds** (`EmergencyContext.jsx`)
   - Table: `hospitals`
   - Filter: `id=eq.{hospitalId}`
   - Events: `UPDATE`
   - Purpose: Bed availability updates

### Subscription Pattern
```javascript
const channel = supabase
  .channel(`channel_name`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'table_name',
    filter: `column=eq.value`
  }, callback)
  .subscribe();
```

---

## Next Steps

1. ✅ **Complete Mapping Audit** (This Document)
2. ⏳ **Create Type-Safe Service Layer** (`types/orchestrator.ts`)
3. ⏳ **Document State Synchronization Patterns**
4. ⏳ **Create Migration Strategy**

---

## Appendix: File Locations

### Service Files
- `services/emergencyRequestsService.js` - Emergency requests CRUD
- `services/visitsService.js` - Visits/trips CRUD
- `services/hospitalsService.js` - Hospital data
- `services/ambulanceService.js` - Ambulance data
- `services/paymentService.js` - Payment processing
- `services/insuranceService.js` - Insurance policies
- `services/medicalProfileService.js` - Medical profiles

### Context Files
- `contexts/EmergencyContext.jsx` - Emergency state management
- `contexts/VisitsContext.jsx` - Visits state management
- `contexts/AuthContext.jsx` - Authentication state

### Migration Files
- `supabase/migrations/20260109141500_emergency_requests.sql`
- `supabase/migrations/20260109141000_create_visits.sql`
- `supabase/migrations/20260212120000_unified_payment_system.sql`
- `supabase/migrations/20260213130000_wallet_ledger_system.sql`
- `supabase/migrations/20260214000000_patient_wallet_system.sql`

---

**End of Data Flow Audit**

