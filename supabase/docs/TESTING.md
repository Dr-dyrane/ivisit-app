# Testing Guide for iVisit Supabase Schema

## 🎯 Overview

This guide outlines the task-based testing framework for ensuring Supabase schema integrity and functionality.

## 🧪 Testing Structure

### **Directory Organization**
```
supabase/tests/
├── tasks/                        # Task definitions and validation
│   ├── task_validation.md         # Task validation framework
│   └── error_constraints.md       # Error definitions and constraints
├── scripts/                      # Test execution scripts (JavaScript)
│   ├── test_runner.js            # Main test runner with error handling
│   ├── test_comprehensive_system.js # Comprehensive system tests
│   └── [other test scripts].js   # Additional test scripts
├── fixes/                        # Mini SQL fixes for errors
│   └── error_fixes.sql          # Targeted SQL fixes for common errors
├── validation/                   # Validation results and reports
│   ├── test_results.json         # Test results storage
│   ├── error_log.json           # Error log storage
│   └── validation_report.md     # Validation reports
└── archives/                     # Archived test results
    └── historical_tests/        # Past test runs
```

## 🔄 Testing Workflow

### **Step 1: Task Definition**
- Create task validation file with clear objectives
- Define error constraints and success criteria
- Set prerequisites and dependencies

### **Step 2: Test Execution**
```bash
# Run comprehensive system test
node supabase/tests/scripts/test_runner.js comprehensive_system

# Run specific task
node supabase/tests/scripts/test_runner.js [task_name]

# Verify provider->doctor profile automation path
node supabase/tests/scripts/verify_provider_doctor_automation.js
```

### **Step 3: Error Detection & Logging**
- JavaScript test runner (`scripts/test_runner.js`) detects errors automatically
- Errors categorized as Critical/Warning/Info
- Detailed error logs written to `validation/error_log.json`

### **Step 4: Fix Generation**
- Mini SQL fixes generated automatically for common errors
- Targeted fixes stored in `fixes/`
- Fixes designed to be idempotent and safe

### **Step 5: Fix Application**
```bash
# Apply fixes from the fixes/ directory
# (Manual execution or automated via test runner)
```

### **Step 6: Migration Integration**
- Update core migration pillars (`migrations/*.sql`) with successful fixes
- Remove redundant fix migrations
- Sync changes to console via `scripts/sync_to_console.js`

### **Step 7: Final Validation**
- Run comprehensive test suite again
- Confirm 100% success rate
- Generate final validation report

## 📋 Testing Standards

### **Success Criteria**
- **100% test pass rate** required
- **No schema cache errors**
- **All modules deployed**
- **Emergency system operational**
- **Display ID mapping working**

## 🚀 Running Tests

### **Comprehensive Test Suite**
```bash
# Run full system validation
node supabase/tests/scripts/test_runner.js comprehensive_system
```

### **Migration Status Check**
```bash
# Verify all migrations deployed
npx supabase migration list
```

### **Table Flow Trace Audit**
```bash
# Export end-to-end table flow trace (schema -> SQL authority -> app/console UI/service refs)
npm run hardening:table-flow-trace

# Optional: target another table directly
node supabase/tests/scripts/export_table_flow_trace.js --table visits
```

### **Per-Table Runtime Field Coverage Gate**
```bash
# Assert every column in the traced table has runtime references (not docs/tests-only).
# Run this after exporting table flow trace.
npm run hardening:table-field-runtime-coverage -- --table hospitals

# Optional allowed-missing override (comma-separated) for intentionally dormant columns
npm run hardening:table-field-runtime-coverage -- --table hospitals --allow-missing some_column
```

### **Emergency Runtime Confidence Gate**
```bash
# Run console transition matrix + E2E emergency flow + confidence assertion
npm run hardening:emergency-runtime-confidence

# If reports already exist, run assertion only
npm run hardening:emergency-runtime-confidence-assert
```

### **Visits JS/JSX Field Guard**
```bash
# Detect stale/non-schema visits field reads/writes in console JS/JSX surfaces
npm run hardening:visits-surface-field-guard
```

### **Hospitals Surface Field Guard**
```bash
# Detect hospitals table contract drift across app+console JS/JSX + core admin RPC persistence
npm run hardening:hospitals-surface-field-guard
```

Current guard focus:
- app/console hospital UI/service surfaces avoid legacy/non-schema import/google drift fields
- app `hospitalsService.getRooms` must not query `hospital_rooms` and must source bed-room availability from canonical `hospitals` capacity fields
- canonical SQL must keep hospital bed-capacity synchronization lanes:
  - `normalize_hosp_bed_state` trigger on `hospitals`
  - `update_hospital_availability` writes `bed_availability`
  - `update_hospital_by_admin` persists canonical capacity columns used by runtime surfaces

### **Organizations Surface Field Guard**
```bash
# Detect organizations table surface contract drift (console types + organizations CRUD payload)
npm run hardening:organizations-surface-field-guard
```

### **Profiles Surface Field Guard**
```bash
# Detect profiles type parity drift and enforce profile update whitelist contract in console service
npm run hardening:profiles-surface-field-guard
```

### **Preferences Surface Field Guard**
```bash
# Detect preferences app/console type parity + relationship parity and
# enforce canonical preferences select-column usage in console source.
npm run hardening:preferences-surface-field-guard
```

### **User Activity Surface Field Guard**
```bash
# Detect user_activity app/console type parity + relationship parity, enforce
# canonical user_activity select columns in console source, and forbid direct
# console user_activity insert/update/upsert/delete mutation lanes.
npm run hardening:user-activity-surface-field-guard
```

### **Support Tickets Surface Field Guard**
```bash
# Detect support_tickets app/console type parity + relationship parity, enforce
# canonical support_tickets select columns in console source, and restrict
# support_tickets mutations to the canonical supportTicketsService lane.
npm run hardening:support-tickets-surface-field-guard
```

### **Search History Surface Field Guard**
```bash
# Detect search_history app/console type parity + relationship parity, enforce
# canonical select-column usage for search_history access paths, and keep
# search_history references/mutations inside approved search service surfaces.
npm run hardening:search-history-surface-field-guard
```

### **Search Selections Surface Field Guard**
```bash
# Detect search_selections app/console type parity + relationship parity, enforce
# canonical search_selections select-column usage, and keep search_selections
# references/mutations inside approved search selection service boundaries.
npm run hardening:search-selections-surface-field-guard
```

### **Search Events Surface Field Guard**
```bash
# Detect search_events app/console type parity, enforce canonical select-column
# usage, and keep search_events references/mutations inside approved
# search analytics/search service boundaries.
npm run hardening:search-events-surface-field-guard
```

### **Trending Topics Surface Field Guard**
```bash
# Detect trending_topics app/console type parity, enforce canonical select-column
# usage, enforce RPC return type parity for update_trending_topics_from_search,
# and keep trending_topics mutations inside approved trending topic service lanes.
npm run hardening:trending-topics-surface-field-guard
```

### **Subscribers Surface Field Guard**
```bash
# Detect subscribers app/generated/console type parity, enforce canonical
# select-column usage, and keep subscribers mutations inside approved
# subscription service lanes.
npm run hardening:subscribers-surface-field-guard
```

### **Health News Surface Field Guard**
```bash
# Detect health_news app/generated/console type parity, enforce canonical
# select-column usage, and keep health_news mutations inside approved
# health news service boundaries.
npm run hardening:health-news-surface-field-guard
```

### **Organization Wallets Surface Field Guard**
```bash
# Detect organization_wallets type parity + query select-column drift across console wallet surfaces
npm run hardening:organization-wallets-surface-field-guard
```

### **Patient Wallets Surface Field Guard**
```bash
# Detect patient_wallets type parity + query select-column drift across console surfaces
npm run hardening:patient-wallets-surface-field-guard
```

### **iVisit Main Wallet Surface Field Guard**
```bash
# Detect ivisit_main_wallet type parity + query/select drift and forbid direct console table mutations
npm run hardening:ivisit-main-wallet-surface-field-guard
```

### **Emergency Requests Surface Field Guard**
```bash
# Detect emergency_requests app/console type parity + relationship parity + select-column drift.
# Also forbids direct console emergency_requests insert/update/upsert/delete and
# keeps legacy aliases (payment_method_id, estimated_arrival, next_estimated_arrival, bed_type)
# inside dedicated compatibility boundaries only.
npm run hardening:emergency-requests-surface-field-guard
```

### **Notifications Surface Field Guard**
```bash
# Detect notifications app/console type parity + relationship parity and
# enforce canonical notifications select-column usage in console source.
npm run hardening:notifications-surface-field-guard
```

### **Payment Methods Surface Field Guard**
```bash
# Detect payment_methods type parity + query/select drift and forbid direct console table mutations
npm run hardening:payment-methods-surface-field-guard
```

### **Wallet Ledger Surface Field Guard**
```bash
# Detect wallet_ledger type parity + query/select drift and enforce allowed console mutation paths
npm run hardening:wallet-ledger-surface-field-guard
```

### **Payments/Wallet JS/JSX Field Guard**
```bash
# Detect stale/non-schema payments + wallet UI field usage in console JS/JSX surfaces
npm run hardening:payments-surface-field-guard
```

### **Cash Fee Deduction Contract Guard**
```bash
# Enforce cash approval fee deduction contract (fee resolution + persistence)
npm run hardening:cash-fee-contract-guard
```

### **Runtime Data Integrity Audit**
```bash
# Audit recent live data quality (cash fee ledger coherence, pending-approval/payment coherence, visits linkage)
npm run hardening:runtime-data-integrity

# Optional window override (default: 168 hours)
RUNTIME_AUDIT_LOOKBACK_HOURS=72 npm run hardening:runtime-data-integrity
```

### **Runtime Data Integrity Repair**
```bash
# Dry-run repair plan for detected runtime data integrity gaps
npm run hardening:runtime-data-repair

# Apply deterministic repair actions (fee ledger backfill + visit hospital-name backfill)
npm run hardening:runtime-data-repair -- --apply
```

### **Visits Runtime Confidence Gate**
```bash
# Run E2E flow matrix and assert required visits lifecycle outcomes
npm run hardening:visits-runtime-confidence

# If E2E report already exists, run assertion only
npm run hardening:visits-runtime-confidence-assert
```

### **Expected Output**
```
🧪 Comprehensive System Test...

🔍 Testing Core RPC Functions...
✅ Nearby hospitals: 0 found
✅ Nearby ambulances: 0 found

🔍 Testing Emergency Logic Functions...
✅ Emergency logic function exists and is callable

🔍 Testing Table Access and Display ID Mapping...
✅ profiles: 0 records
✅ organizations: 0 records
✅ hospitals: 0 records
✅ doctors: 0 records
✅ ambulances: 0 records
✅ emergency_requests: 0 records
✅ visits: 0 records
✅ patient_wallets: 0 records
✅ organization_wallets: 0 records
✅ payments: 0 records
✅ notifications: 0 records
✅ id_mappings: 0 records

🔍 Testing Security Functions...
✅ Security function is_admin accessible

🔍 Testing Display ID Resolution...
✅ ID mappings: 0 records
✅ get_entity_id function accessible

🔍 Testing Wallet System...
✅ Patient wallets: 0 records

🎯 Comprehensive System Test Summary:
✅ Passed: 19
❌ Failed: 0
📊 Success Rate: 100.0%
```

## 🔍 Test Breakdown

### **1. Core RPC Functions**
- **nearby_hospitals**: PostGIS geospatial queries
- **nearby_ambulances**: Location-based ambulance search
- **Expected**: 0 results (empty database)

### **2. Emergency Logic Functions**
- **create_emergency_v4**: Atomic emergency creation
- **Payment integration**: Cash vs digital payment handling
- **Status management**: Proper flow control

### **3. Table Access Validation**
- **All 13 core tables**: Accessible and structured
- **Display ID columns**: Present where required
- **Foreign keys**: Proper relationships

### **4. Security Functions**
- **is_admin**: Role-based access control
- **RLS policies**: Active and functional
- **Data protection**: Proper access levels

### **5. Display ID Resolution**
- **id_mappings table**: Central resolution system
- **get_entity_id**: UUID to display ID conversion
- **Entity types**: All supported types

### **6. Wallet System**
- **Patient wallets**: Financial operations
- **Organization wallets**: Provider accounts
- **Payment processing**: Transaction handling

## 🛠️ Test Environment Setup

### **Required Environment Variables**
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Dependencies**
```bash
npm install @supabase/supabase-js
```

## 📊 Test Data Requirements

### **Empty Database Testing**
- Tests validate **structure and functionality**
- **No test data required** for basic validation
- **Zero records expected** in clean deployment

### **Data Import Testing**
```bash
# Test data import functionality
node supabase/scripts/data_import_fixed.js
```

## 🎯 Quality Gates

### **Before Schema Changes**
- [ ] Current tests passing (100%)
- [ ] Migration status clean
- [ ] All modules deployed
- [ ] No schema cache errors

### **After Schema Changes**
- [ ] Tests still passing (100%)
- [ ] New functionality working
- [ ] No regressions introduced
- [ ] Documentation updated

### **Before Production Deployment**
- [ ] All tests passing in staging
- [ ] Migration history clean
- [ ] Console documentation updated
- [ ] Performance validated

## 🚨 Troubleshooting

### **Common Issues**
1. **Schema cache errors**: Run `supabase db push --debug`
2. **Missing functions**: Check migration deployment order
3. **RLS policy failures**: Verify policy definitions
4. **Display ID errors**: Check id_mappings table

### **Debug Commands**
```bash
# Check migration status
npx supabase migration list

# Force schema refresh
npx supabase db push --include-all

# Test specific function
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
supabase.rpc('function_name').then(console.log);
"
```

## 📈 Performance Testing

### **Query Performance**
- **Geospatial queries**: Test with various distances
- **Complex joins**: Validate emergency request flows
- **Performance Fixes** - Index additions, query optimization

### **Zero-Leak Testing Rule**
Tests that create database side-effects (Auth users, profiles) **MUST** include an exhaustive cleanup phase.
- **Patterned Emails**: Use `test-TASKNAME-UNIXTIME@example.com`.
- **Mandatory Cleanup**: Every test runner must include a `finally` block or a dedicated `cleanup()` function that deletes all data matching the test pattern.
- **No Residuals**: A successful test is one that leaves the database exactly as it found it.

### **Global Side-Effect Cleanup Command**
When historical test runs left residual rows, run the centralized cleanup script:

```bash
# Preview only (no deletes)
node supabase/tests/scripts/cleanup_test_side_effects.js

# Apply deletes for test-pattern side effects
node supabase/tests/scripts/cleanup_test_side_effects.js --apply
```

This targets test-pattern users and their linked side effects (`emergency_requests`, `visits`, `payments`, `notifications`, `doctors`, and related rows) without touching non-test identities.

### **Runtime CRUD Batch (Console UI -> App Flow)**
For table-by-table runtime hardening, run the deterministic batch runner and enforce cleanup immediately after each batch:

```bash
# 1) Execute runtime CRUD + relationship validation batch
npm run hardening:runtime-crud-batch

# 2) Cleanup any residual test artifacts (safety net)
node supabase/tests/scripts/cleanup_test_side_effects.js --apply

# 3) Confirm zero planned side-effects before commit/push
npm run hardening:cleanup-dry-run-guard
```

Current batch coverage:
- `organization_wallets`, `wallet_ledger`, `payments`, `payment_methods`
- `support_faqs`, `support_tickets`
- `search_events`, `search_history`, `search_selections`
- `medical_profiles`
- `subscribers`, `health_news`, `trending_topics`
- `notifications`, `preferences`, `user_activity`
- `insurance_policies`, `insurance_billing`
- `admin_audit_log`, `documents`
- `patient_wallets`, `user_roles`, `user_sessions`
- `id_mappings` presence assertions for runtime entities
- `ivisit_main_wallet` baseline presence validation
- `hospitals`, `doctors`, `doctor_schedules`
- `emergency_doctor_assignments` via canonical assignment RPC against an existing emergency request target (with assignment rollback in cleanup)

### **Targeted Emergency/Payments/Wallet Coverage Guard**
When validating contract-critical emergency finance paths, run the targeted guard lane:

```bash
# Runs console UI CRUD matrix + runtime CRUD batch + targeted coverage assertions
npm run hardening:targeted-matrix-guard

# Then enforce zero side-effects and contract parity gates
npm run hardening:cleanup-dry-run-guard
npm run hardening:contract-drift-guard
```

Guard expectations:
- Console matrix must include required surfaces:
  - `emergency_requests`
  - `organization_wallets`
  - `wallet_ledger`
  - `payments`
  - `payment_methods`
- Runtime batch must pass required assertions and mirror-count coverage for:
  - `emergency_requests`
  - `payments`
  - `organization_wallets`
  - `wallet_ledger`
  - `patient_wallets`
  - `ivisit_main_wallet`

### **Ambulances Surface Field Guard**
For ambulance table contract parity and field-safety enforcement across app + console:

```bash
# Export current ambulances flow trace evidence
node supabase/tests/scripts/export_table_flow_trace.js --table ambulances

# Enforce ambulances type/service surface guard
npm run hardening:ambulances-surface-field-guard
```

Current guard focus:
- app/console `ambulances` `Row`/`Insert`/`Update` parity
- canonical row fields must include:
  - `crew`, `current_call`, `display_id`, `eta`, `license_plate`
- app ambulance mapper must avoid non-schema row reads
- console ambulance service payload/whitelist must avoid non-schema writes

### **Emergency Status Transitions Surface Guard**
For append-only emergency status audit contract parity and mutation-safety:

```bash
# Export flow trace evidence for transition audit table
node supabase/tests/scripts/export_table_flow_trace.js --table emergency_status_transitions

# Enforce emergency_status_transitions type parity + no direct mutation surfaces
npm run hardening:emergency-status-transitions-surface-field-guard
```

Current guard focus:
- app/console `emergency_status_transitions` `Row`/`Insert`/`Update` parity
- canonical transition audit row fields must exist in type contracts
- direct `.insert/.update/.delete/.upsert` against this table is forbidden in app/console source paths

### **Insurance Surface Field Guard**
For `insurance_policies` + `insurance_billing` contract parity and canonical policy-write safety:

```bash
# Export traces for insurance tables if needed
node supabase/tests/scripts/export_table_flow_trace.js --table insurance_policies
node supabase/tests/scripts/export_table_flow_trace.js --table insurance_billing

# Enforce insurance type/service surface contract guard
npm run hardening:insurance-surface-field-guard
```

Current guard focus:
- app/console type parity for `insurance_policies` and `insurance_billing` (`Row`/`Insert`/`Update`)
- canonical required row fields include `coverage_percentage` + `status` in insurance policy contract
- insurance policy write services must use canonical payload builder and avoid legacy top-level column mutations
- console `getUserInsurancePolicies` path must return normalized rows

### **Pricing Surface Field Guard**
For `service_pricing` + `room_pricing` contract parity and canonical pricing write safety:

```bash
# Export traces for pricing tables
node supabase/tests/scripts/export_table_flow_trace.js --table service_pricing
node supabase/tests/scripts/export_table_flow_trace.js --table room_pricing

# Enforce pricing type/service surface contract guard
npm run hardening:pricing-surface-field-guard
```

Current guard focus:
- app/console type parity for `service_pricing` and `room_pricing` (`Row`/`Insert`/`Update`)
- canonical required pricing row fields and FK relationship parity
- console pricing writes must use RPC lanes (`upsert_*` / `delete_*`) instead of direct table mutations
- pricing payload must not write non-schema fields (`currency`, `is_active`)

### **Medical Profiles Surface Field Guard**
For `medical_profiles` contract parity and canonical profile write safety:

```bash
# Export medical profile flow trace evidence
node supabase/tests/scripts/export_table_flow_trace.js --table medical_profiles

# Enforce medical_profiles type/service surface contract guard
npm run hardening:medical-profiles-surface-field-guard
```

Current guard focus:
- app/console type parity for `medical_profiles` (`Row`/`Insert`/`Update`)
- ensure `medical_profiles_user_id_fkey` relationship parity in console type contract
- console medical profile service must use explicit payload builder (no raw input spread)
- app medical profile update path must upsert by `user_id` to avoid missing-row drift

### **Doctors Surface Field Guard**
For `doctors` contract parity and canonical doctor search fields:

```bash
# Export doctors flow trace evidence
node supabase/tests/scripts/export_table_flow_trace.js --table doctors

# Enforce doctors type/search surface contract guard
npm run hardening:doctors-surface-field-guard
```

Current guard focus:
- app/console type parity for `doctors` (`Row`/`Insert`/`Update`)
- required `doctors` relationship parity (`doctors_hospital_id_fkey`, `doctors_profile_id_fkey`)
- no non-canonical `available_hospitals` drift in console `doctors` relationships
- console doctor search uses canonical fields (`specialization`, `image`) with hospital relation join (`hospitals:hospital_id`)
- console doctor search forbids legacy/non-schema fields (`specialty`, `avatar_url`)

### **Finance RPC Contract Guard**
For canonical migration safety on finance RPCs (legacy field regression prevention):

```bash
# Verify canonical finance retry-payment RPC contract in migration SQL
npm run hardening:finance-rpc-contract-guard
```

Current guard focus:
- `retry_payment_with_different_method` must not reference legacy:
  - `emergency_requests.estimated_amount`
  - `payments.payment_method_id` insert column
- Retry flow must use canonical payment contract fields:
  - `total_cost`, `payment_method`, `metadata`

### **Automation Contract Guard**
For emergency logistics automations and emergency->visit lifecycle sync contract safety:

```bash
# Verify canonical automation migration does not reference stale emergency fields
# and includes non-terminal visit sync mapping
npm run hardening:automation-contract-guard
```

Current guard focus:
- No `NEW.estimated_arrival` reference in `0009_automations`
- `sync_emergency_to_visit` includes mapping for:
  - `accepted`
  - `arrived`
  - `cancelled`
- Visit sync updates include:
  - `lifecycle_state`
  - `hospital_name`
  - `cost`

### **Commit Gate: Cleanup Must Be Zero**
Before every commit/push after running tests:

1. Run preview cleanup and inspect planned counts:
```bash
node supabase/tests/scripts/cleanup_test_side_effects.js
```
2. If any planned counts are non-zero, run apply:
```bash
node supabase/tests/scripts/cleanup_test_side_effects.js --apply
```
3. Run preview again and confirm all planned counts are zero.
4. Run the dry-run guard (must pass):
```bash
npm run hardening:cleanup-dry-run-guard
```

The cleanup script also targets matrix/e2e hospital/org artifacts (including isolated org wallets/payments) when safely deletable.
Do not ship test-generated side effects to shared environments.

### **Load Testing**
- **Concurrent requests**: Multiple emergency creations
- **Transaction integrity**: Payment processing under load
- **Rate limiting**: API endpoint protection

## 🔄 Continuous Testing

### **Automated Testing**
- **Pre-commit hooks**: Run tests before commits
- **CI/CD integration**: Automated test execution
- **Scheduled tests**: Regular system validation

### **Manual Testing**
- **Feature validation**: New functionality testing
- **Regression testing**: Ensure no breaking changes
- **User acceptance**: Real-world scenario testing

---

**Remember**: 100% test success rate is mandatory for all schema changes.
