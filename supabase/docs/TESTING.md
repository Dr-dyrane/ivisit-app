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

### **High-Profile CTA Trace Matrix**
```bash
# Validate high-impact app/console UX actions with deterministic trace checks:
# UI handler -> flow/service -> RPC/trigger (plus runtime guard report prerequisites).
npm run hardening:high-profile-cta-trace
```
Artifacts:
- `supabase/tests/validation/high_profile_cta_trace_report.json`
- `supabase/tests/validation/high_profile_cta_trace_report.md`

### **Visits JS/JSX Field Guard**
```bash
# Detect stale/non-schema visits field reads/writes in console JS/JSX surfaces
npm run hardening:visits-surface-field-guard
```

### **Scheduled Visits And Async Consult Contract Guard**
```bash
# Read-only proof for schedule/visit/chat schema, RLS, RPC authority,
# Storage linkage, emergency fallback, deterministic demo data, Edge posture,
# and App/Console database type parity.
npm run hardening:scheduled-visits-contract
```

This guard has zero database side effects. It does not replace post-deployment
role, concurrency, Storage, cleanup, or end-to-end verification.

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

### **Console Onboarding And Invitation Contract**

Run the exact-source rollback contract before deploying changes to the Console identity, organization provisioning, evidence, or invitation boundary:

```bash
node supabase/tests/scripts/run_console_onboarding_contract.js
```

The runner extracts marked blocks from the maintained pillar migrations, applies them inside a transaction through the approved SQL test receiver, executes schema/trigger/RLS/RPC assertions, and rolls the transaction back. Its identity assertions include complete facility scope, organization-bound user statistics, denied unscoped statistics, and execute privileges. It can emit the exact deployment SQL when an explicitly approved linked-project deployment is required:

```bash
node supabase/tests/scripts/run_console_onboarding_contract.js --emit-deployment=.tmp/console-onboarding.sql
```

The live E2E is deliberately gated by the exact project reference and requires `IVISIT_TEST_ADMIN_EMAIL` for a deliverable plus-address invitation alias:

```bash
node supabase/tests/scripts/run_console_onboarding_live_e2e.js --project-ref=<expected-project-ref>
```

It verifies public-signup role safety, private Storage, canonical organization/profile/wallet/evidence provisioning, idempotency and duplicate rejection, complete facility identity reflection, organization-scoped user statistics, no-auth and role-scope invitation denial, successful Auth invitation, service-only profile assignment, and cleanup. The runner must remove every temporary Auth identity, row, and Storage object in its final cleanup path.

Each live run now writes an ignored recovery manifest under
`supabase/tests/artifacts/demo-runs/<run-id>.json`. The manifest records exact
Auth, organization, disposable facility, claim, evidence, and Storage
identities. It also records a seven-day `expiresAt`, explicit `owner`, and
cleanup `disposition` without adding database columns. Test-created facilities
carry matching `demo_owner:*` and `demo_expires_at:<epoch-ms>` feature tags so
expired fixtures disappear from Edge discovery sufficiency and App projections
before asynchronous cleanup. Test-created facilities and protected discovered facilities are
mutually exclusive: cleanup may delete only `createdFacilityIds`, never every
hospital currently linked to a test organization.

New ephemeral live fixtures use a visible `[DEMO <short-run-id>]` label plus
`place_id=e2e:<run-id>:...` and `demo_scope:<run-id>`. They deliberately do
not use `demo:*`, `demo_bootstrap`, or a `demo*` verification status because
those values authorize stable preview coverage to bypass ordinary dispatch
eligibility gates. Real imported/discovered hospitals remain claim-catalog
truth and must not be renamed or deleted by cleanup.

Hospital queries and deprecated route/intake screens are read-only. They must
never call `bootstrap-demo-ecosystem`. Preview coverage has two canonical
owners: the explicit coverage-mode command and the coverage-aware `/map`
orchestrator after live discovery has settled below its comfort threshold.
This preserves sparse-region recovery without allowing ordinary query
refetches or legacy routes to multiply demo organizations, hospitals, drivers,
doctors, or ambulances. A canonical bootstrap refreshes the pack expiry.

If an onboarding or emergency-flow run is interrupted, preview its exact
cleanup plan before applying it:

```bash
node supabase/tests/scripts/cleanup_demo_run.js \
  --manifest=supabase/tests/artifacts/demo-runs/<run-id>.json \
  --project-ref=<expected-project-ref>

node supabase/tests/scripts/cleanup_demo_run.js \
  --manifest=supabase/tests/artifacts/demo-runs/<run-id>.json \
  --project-ref=<expected-project-ref> \
  --apply
```

Run the apply command a second time. The second plan must contain zero
resources and must succeed without changing any protected facility. The
cleanup receiver deletes `user_activity` by the manifest's exact Auth UUIDs
inside a bounded service-only SQL operation; it does not depend on a broad or
potentially timing-out activity-table lookup. The operation asserts that no
activity remains for those captured identities before profile/Auth deletion.
The manifest contract itself is checked with:

```bash
npm run hardening:demo-run-manifest-contract
```

`run_e2e_flow_matrix.js` uses the same manifest for Auth, organization,
facility, doctor, ambulance, staffing, request, responder assignment, payment,
wallet, visit, activity, audit, notification, billing, transition, and display
mapping cleanup. Wallet-ledger credits are reversed before their exact ledger
rows are removed, and append-only emergency history triggers are disabled only
inside the validated UUID-scoped cleanup transaction. Its first cleanup must
capture a non-empty live graph; its second cleanup must plan zero actions.

For a rendered browser lifecycle, prepare the same foundation without running
or cleaning the lifecycle:

```bash
npm run hardening:browser-emergency-fixture:prepare
```

The command prints a disposable patient, responder, and organization-admin
handoff and writes its exact recovery manifest before returning. It does not
store the shared test password in the manifest. During the browser journey,
register and advance only the newest request owned by that manifest:

```bash
node supabase/tests/scripts/browser_emergency_fixture.js \
  --manifest=supabase/tests/artifacts/demo-runs/<run-id>.json \
  --action=status
```

Allowed coordinator actions are `status`, `approve-cash`, `dispatch`, `accept`,
`telemetry`, `arrive`, and `complete`. `dispatch` refreshes the disposable
responder telemetry lease before calling the canonical Console dispatch RPC,
so a deliberately delayed browser rehearsal can recover without a direct
lifecycle write. Mutation actions call only their
canonical RPC owners; the coordinator performs no direct table writes.
`complete` fails closed until the patient has confirmed arrival through the
rendered App. After exactly one rendered rating, apply the manifest cleanup
twice and require a final zero-resource preview. Never use an existing browser
session or its visits as lifecycle test data.

### **Preferences Surface Field Guard**
```bash
# Detect preferences app/console type parity + relationship parity and
# enforce canonical preferences select-column usage in console source.
npm run hardening:preferences-surface-field-guard
```

### **Admin Audit Log Surface Field Guard**
```bash
# Detect admin_audit_log app/generated/console type parity + relationship parity,
# enforce canonical select-column usage, and restrict mutations to adminService.
npm run hardening:admin-audit-log-surface-field-guard
```

### **User Sessions Surface Field Guard**
```bash
# Detect user_sessions app/generated/console type parity + relationship parity,
# enforce canonical select-column usage, and block direct mutation lanes.
npm run hardening:user-sessions-surface-field-guard
```

### **ID Mappings Surface Field Guard**
```bash
# Detect id_mappings app/generated/console type parity, enforce canonical
# select-column usage, and block direct mutation lanes from console source.
npm run hardening:id-mappings-surface-field-guard
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

### **Support FAQs Surface Field Guard**
```bash
# Detect support_faqs app/generated/console type parity, enforce canonical
# support_faqs select-column usage, and keep FAQ mutations inside the
# canonical supportFaqsService lane.
npm run hardening:support-faqs-surface-field-guard
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
npm run hardening:runtime-data-repair -- --project-ref=<linked-project-ref> --apply
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
- Retry execution must verify the request owner, serialize on the request row,
  reuse an existing pending payment, converge request state, and revoke
  `PUBLIC`/`anon` execution.

### **Console Shared Contract Guard**
For the App-owned database contracts consumed by Console:

```bash
npm run hardening:console-shared-contract-guard
```

Current guard focus:
- insurance clean-rebuild fields and admin read policy
- ambulance primary organization ownership with null-owner facility fallback
- role-scoped, column-limited doctor writes and profile-owned identity sync
- support ticket database vocabularies and patient payload compatibility
- authenticated/scoped nearby fleet lookup
- hospital verification authority and omitted-array preservation
- Console emergency creation with linked visit evidence
- payment retry authority, idempotent convergence, and canonical transition
- private onboarding evidence storage and Console operator read projections
- owner-scoped public profile media and canonical Storage bucket declarations
- organization finance helper role, organization, and execute scope

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
# Strategic Completeness Matrix

For onboarding, marketplace, emergency, payment, dispatch, identity, or any
App/Console/shared-backend lifecycle, receiver tests are necessary but not
sufficient. The test plan must name the business initiator and prove every
applicable row:

| State | Required proof |
| --- | --- |
| Cold start | The initiating actor can begin with zero domain rows and without another actor bootstrapping the record. |
| Warm/mature | Existing, owned, duplicated, cached, and historical records do not change authority or truth. |
| Partial | Incomplete prerequisites recover without duplicate identity or misleading success. |
| Degraded | Provider, permission, network, realtime, and downstream failure are visible and recoverable. |
| Retry/replay | Refresh, reconnect, double submit, and repeated commands remain idempotent. |
| Cross-surface | Canonical backend truth reflects into every authorized producer and consumer. |
| Negative gate | Verification, ownership, payment, dispatch, and eligibility remain false until approved. |
| Residue/rollback | Exact owned fixtures clean or retire without deleting real, discovered, or claimable truth. |

A warm fixture cannot substitute for cold-start proof. Test reports must state
the bounded implementation result and the business-outcome result separately,
with untested rows visible.
