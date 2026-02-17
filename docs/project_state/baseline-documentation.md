# Baseline Documentation - Emergency Payment Flow State

**Date**: 2026-02-17  
**Git Tag**: backup-before-emergency-fix  
**Commit**: 8402abd

## Current State Assessment

### Emergency Request Flow Issues
1. **Missing RPC Functions**:
   - `check_cash_eligibility_v2` - Called by paymentService.js but doesn't exist
   - `processCashPayment` - Called by useRequestFlow.js but doesn't exist in paymentService

2. **Parameter Mismatches**:
   - `calculate_emergency_cost` expects 6 parameters, frontend passes 4
   - Frontend: `p_service_type, p_hospital_id, p_ambulance_id, p_room_id`
   - Backend: `p_service_type, p_hospital_id, p_ambulance_id, p_room_id, p_distance, p_is_urgent`

3. **UUID/TEXT Issues**:
   - emergency_requests.id is UUID (with gen_random_uuid default)
   - hospital_id is UUID, ambulance_id is TEXT
   - RPC functions use TEXT parameters but compare against UUID columns

4. **Payment Flow Breakdown**:
   - Cannot fetch org_fee during request modal display
   - Cash eligibility checks fail due to organization_id resolution
   - Payment record creation fails after simulated payment
   - Emergency and visit record creation inconsistent

### Database Schema State
- emergency_requests table: UUID primary key, mixed foreign key types
- payments table: UUID primary key, payment_method_id UUID
- Multiple recent migrations attempting to fix UUID/TEXT issues
- Missing org_fee implementation in cost calculation

### Frontend Service State
- paymentService.js: Calls non-existent functions
- pricingService.js: Wrong parameter passing
- useRequestFlow.js: Missing payment integration
- emergencyRequestsService.js: UUID generation inconsistencies

## Test Results (Pre-Fix)
- Emergency request creation: ❌ Fails with UUID errors
- Cost calculation: ❌ Fails with parameter mismatch
- Cash eligibility check: ❌ Function not found
- Payment processing: ❌ Missing functions
- Record creation: ❌ UUID/text conflicts

## Files Modified in Current State
- components/emergency/EmergencyRequestModal.jsx
- hooks/emergency/useRequestFlow.js
- services/paymentService.js
- services/emergencyRequestsService.js
- Multiple migration files (20260217xxxx)

## Migration History Summary
Recent migrations show attempts to fix:
- UUID/TEXT type mismatches
- RPC function parameter issues
- Emergency request ID defaults
- Cash payment flow logic

This baseline serves as reference for validating fixes and rollback if needed.
