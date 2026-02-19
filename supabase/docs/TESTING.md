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
```

### **Step 3: Error Detection & Logging**
- JavaScript test runner detects errors automatically
- Errors categorized as Critical/Warning/Info
- Detailed error logs written to `validation/error_log.json`

### **Step 4: Fix Generation**
- Mini SQL fixes generated automatically for common errors
- Targeted fixes stored in `fixes/error_fixes.sql`
- Fixes designed to be idempotent and safe

### **Step 5: Fix Application**
```bash
# Apply fixes from error_fixes.sql
# (Manual execution or automated via test runner)
```

### **Step 6: Migration Integration**
- Update core migration pillars with successful fixes
- Remove redundant fix migrations
- Sync changes to console

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

### **Required Test Results**
```
✅ Passed: 19
❌ Failed: 0
📊 Success Rate: 100.0%
```

### **Module Validation**
- ✅ Infrastructure (Extensions, Utilities) - Deployed
- ✅ Identity (Profiles, Preferences, Medical) - Deployed
- ✅ Organizations (Hospitals, Doctors) - Deployed
- ✅ Logistics (Ambulances, Emergency Requests) - Deployed
- ✅ Financials (Wallets, Payments, Insurance) - Deployed
- ✅ Operations (Notifications, Support, CMS) - Deployed
- ✅ Analytics (Activity, Search, Audit) - Deployed
- ✅ Security (RLS Policies, Access Control) - Deployed
- ✅ Emergency Logic (Atomic Operations) - Deployed
- ✅ Automations (Cross-Table Hooks) - Deployed
- ✅ Core RPC Functions (Location Services) - Deployed

## 🚀 Running Tests

### **Comprehensive Test Suite**
```bash
# Run full system validation
node supabase/tests/test_comprehensive_system.js
```

### **Migration Status Check**
```bash
# Verify all migrations deployed
npx supabase migration list
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
- **Index usage**: Ensure proper query optimization

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
