# Testing Guide - Modular Testing Architecture

## 🎯 **Overview**

**Comprehensive guide for developers using the modular testing architecture with centralized error management for the iVisit emergency medical response system.**

## 📁 **Testing Architecture Structure**

```
docs/archive/test-scripts/
├── lib/                    # Shared utilities and components
│   ├── database.js         # Database connection and operations
│   ├── assertions.js        # Test assertions and validators
│   ├── error-filter.js     # Error filtering and categorization
│   ├── error-logger.js     # Centralized error logging
│   ├── helpers.js          # Common test utilities
│   └── reporters.js         # Test result formatting
├── components/             # Reusable test components
│   ├── emergency/          # Emergency-specific test components
│   ├── auth/              # Authentication test components
│   ├── payments/           # Payment system test components
│   └── admin/             # Admin infrastructure test components
├── suites/                # Organized test suites
│   ├── emergency/          # Emergency flow tests
│   ├── core/              # Core system tests
│   ├── integration/         # End-to-end integration tests
│   └── regression/        # Regression test suites
└── runners/                # Test execution and orchestration
    ├── suite-runner.js      # Run test suites
    ├── consolidation-runner.js # Consolidation with error tracking
    └── full-audit.js       # Complete system audit
```

## 🚀 **Getting Started**

### **1. Environment Setup**
```bash
# Navigate to test scripts directory
cd docs/archive/test-scripts

# Install dependencies if needed
npm install @supabase/supabase-js dotenv

# Set up environment variables
# Copy .env.example to .env and configure
cp ../../.env.example .env
```

### **2. Basic Test Execution**
```bash
# Run all emergency tests
node runners/suite-runner.js --suite EmergencyTestSuite

# Run specific test category
node runners/suite-runner.js --category emergency-functions

# Run individual test
node runners/suite-runner.js --test EmergencyTestSuite.testEmergencyCreation
```

### **3. Error Management**
```bash
# Run consolidation with error tracking
node runners/consolidation-runner.js

# View error reports
cat supabase/errors/consolidation/20260218_*.json
cat supabase/errors/patterns/common_errors.json
```

## 🔧 **Component Usage**

### **Database Component**
```javascript
const DatabaseComponent = require('../lib/database');
const db = new DatabaseComponent();

// Connect and test
await db.connect();
const result = await db.executeRPC('function_name', params);
await db.cleanup();
```

### **Assertions Component**
```javascript
const Assertions = require('../lib/assertions');

// Basic assertions
Assertions.assertSuccess(result, 'Test Name');
Assertions.assertEqual(actual, expected, 'Test Name');
Assertions.assertUUID(uuid, 'Test Name');

// Advanced assertions
Assertions.assertInRange(value, min, max, 'Test Name');
Assertions.assertJSON(data, 'Test Name');
Assertions.assertEmail(email, 'Test Name');
```

### **Error Handling Component**
```javascript
const ErrorLogger = require('../lib/error-logger');
const errorLogger = new ErrorLogger();

// Log errors with context
await errorLogger.logTestError(error, 'test_name', 'component');
await errorLogger.logRPCError(error, 'function_name', params);
await errorLogger.logConsolidationError(error, 'phase', 'component');
```

### **Test Helpers Component**
```javascript
const TestHelpers = require('../lib/helpers');
const helpers = new TestHelpers();

// Error handling with retry
await helpers.withRetry('test_name', testFunction, 3, 1000);

// Performance measurement
const perf = await helpers.measurePerformance('test_name', testFunction);

// Test data generation
const testData = helpers.generateTestData({
    hospital_id: 'custom-uuid',
    payment_method: 'stripe'
});
```

## 📊 **Error Management System**

### **Error Directory Structure**
```
supabase/errors/
├── consolidation/         # Consolidation-specific errors
├── testing/              # Test execution errors
├── migration/            # Migration execution errors
├── patterns/             # Error pattern analysis
└── archive/               # Historical error logs
```

### **Error Classification**
- **DATABASE**: Connection, query, constraint, permission errors
- **RPC**: Function execution, parameter validation errors
- **RLS**: Row level security, policy errors
- **TRIGGER**: Trigger execution, dependency errors
- **TEST**: Assertion, validation, timeout errors
- **CONSOLIDATION**: Migration, conflict, dependency errors

### **Error File Format**
```json
{
  "timestamp": "2026-02-18T16:22:00Z",
  "category": "DATABASE",
  "subcategory": "QUERY",
  "severity": "ERROR",
  "component": "emergency_functions",
  "operation": "create_emergency_with_payment",
  "message": "Function not found in schema cache",
  "code": "PGRST202",
  "context": {
    "function_name": "create_emergency_with_payment",
    "parameters": ["hospital_id", "user_id", "patient_data"],
    "database": "production",
    "migration": "001_consolidated"
  },
  "resolution_suggestion": "Check if function exists in database",
  "affected_components": ["emergency_flow", "payment_system"]
}
```

## 🧪 **Test Development Guidelines**

### **1. Creating New Test Components**
```javascript
// Example: New component in components/new-feature/
const DatabaseComponent = require('../../lib/database');
const Assertions = require('../../lib/assertions');

class NewFeatureComponent {
    constructor() {
        this.db = new DatabaseComponent();
    }

    async testNewFeature(testData) {
        console.log('🧪 Testing New Feature...');
        
        const { data, error } = await this.db.executeRPC('new_feature', testData);
        
        Assertions.assertSuccess({ data, error }, 'New Feature Test');
        return data;
    }

    async runFullTest(testData) {
        try {
            await this.db.connect();
            const result = await this.testNewFeature(testData);
            console.log('✅ New Feature Test: Success');
            return result;
        } catch (error) {
            console.log('❌ New Feature Test: Failed');
            throw error;
        } finally {
            await this.db.cleanup();
        }
    }
}

module.exports = NewFeatureComponent;
```

### **2. Creating Test Suites**
```javascript
// Example: New test suite in suites/new-feature/
const NewFeatureComponent = require('../components/new-feature/new-feature');
const DatabaseComponent = require('../../lib/database');

class NewFeatureTestSuite {
    constructor() {
        this.newFeature = new NewFeatureComponent();
        this.db = new DatabaseComponent();
    }

    async runAllTests() {
        console.log('🚀 Running New Feature Test Suite...\n');
        
        const testCases = [
            { name: 'Basic Test', data: { param: 'value' } },
            { name: 'Edge Case Test', data: { param: null } }
        ];

        let passedTests = 0;
        let totalTests = testCases.length;

        for (const testCase of testCases) {
            try {
                console.log(`\n--- Test: ${testCase.name} ---\n`);
                await this.newFeature.runFullTest(testCase.data);
                passedTests++;
            } catch (error) {
                console.log(`❌ Test: ${testCase.name} FAILED ---\n`);
                console.log('Error:', error.message);
            }
        }

        console.log(`\n📊 New Feature Tests Results: ${passedTests}/${totalTests} passed`);
        return { passedTests, totalTests };
    }
}

module.exports = NewFeatureTestSuite;
```

### **3. Error Handling in Tests**
```javascript
const ErrorLogger = require('../lib/error-logger');
const TestHelpers = require('../lib/helpers');

class TestWithErrors {
    constructor() {
        this.errorLogger = new ErrorLogger();
        this.helpers = new TestHelpers();
    }

    async runTestWithErrorHandling() {
        return await this.helpers.withErrorHandling('test_name', async () => {
            // Test logic here
            const result = await someOperation();
            return result;
        });
    }

    async runTestWithRetry() {
        return await this.helpers.withRetry('test_name', async () => {
            // Test logic that might fail
            const result = await flakyOperation();
            return result;
        }, 3, 1000);
    }
}
```

## 📋 **Best Practices**

### **1. Test Organization**
- **Use shared components** from lib/ for common operations
- **Group related tests** in appropriate component folders
- **Follow naming conventions** for consistency
- **Document test purpose** in comments

### **2. Error Handling**
- **Always log errors** with proper context
- **Use appropriate error categories** for filtering
- **Include resolution suggestions** for debugging
- **Test error scenarios** as part of test coverage

### **3. Performance Testing**
- **Measure response times** for critical operations
- **Test with realistic data volumes**
- **Monitor memory usage** for large operations
- **Benchmark against expected performance**

### **4. Integration Testing**
- **Test complete workflows** end-to-end
- **Verify component interactions** work correctly
- **Test error recovery** scenarios
- **Validate data consistency** across operations

## 🔍 **Debugging and Troubleshooting**

### **1. Error Analysis**
```bash
# View recent errors
ls -la supabase/errors/consolidation/
cat supabase/errors/patterns/common_errors.json

# Filter errors by category
node -e "
const ErrorLogger = require('./lib/error-logger');
const logger = new ErrorLogger();
logger.getErrors({ category: 'DATABASE' }).then(console.log);
"
```

### **2. Performance Analysis**
```bash
# Run performance tests
node runners/suite-runner.js --category performance

# View performance reports
cat supabase/errors/reports/performance_*.json
```

### **3. Test Coverage**
```bash
# Run all tests and analyze coverage
node runners/suite-runner.js

# View test reports
cat supabase/errors/reports/test_*.json
```

## 🚀 **Advanced Usage**

### **1. Custom Test Runners**
```javascript
// Create custom runner for specific needs
const SuiteRunner = require('./runners/suite-runner');

class CustomRunner extends SuiteRunner {
    async runCustomTests() {
        // Custom test logic
        const results = await this.runWithFilter({
            category: 'emergency-functions',
            severity: 'ERROR'
        });
        return results;
    }
}
```

### **2. Batch Testing**
```javascript
const TestHelpers = require('./lib/helpers');
const helpers = new TestHelpers();

// Run tests with multiple data sets
const testDataArray = [
    { param: 'value1' },
    { param: 'value2' },
    { param: 'value3' }
];

const results = await helpers.batchTest('batch_test', testFunction, testDataArray);
```

### **3. Automated Reporting**
```javascript
const ErrorReporter = require('./lib/reporters');
const reporter = new ErrorReporter();

// Generate comprehensive reports
const testResults = await runAllTests();
const report = reporter.generateSummaryReport(testResults);
await reporter.saveReportToFile(report, 'comprehensive_report.md');
```

## 📚 **Reference Documentation**

### **Available Components**
- **Database Component**: Connection, RPC execution, table operations
- **Assertions Component**: 20+ assertion methods for validation
- **Error Filter Component**: Error categorization and filtering
- **Error Logger Component**: Centralized error logging and persistence
- **Test Helpers Component**: Retry, timeout, validation, performance testing
- **Error Reporter Component**: Enhanced reporting and formatting

### **Available Test Suites**
- **EmergencyTestSuite**: Emergency flow and payment testing
- **CoreTestSuite**: Core system functionality testing
- **IntegrationTestSuite**: End-to-end integration testing

### **Available Runners**
- **SuiteRunner**: General test suite execution
- **ConsolidationRunner**: Consolidation with error tracking
- **FullAuditRunner**: Complete system audit

**This modular testing architecture provides a scalable, maintainable, and efficient testing framework for the iVisit emergency medical response system with comprehensive error management and debugging capabilities.**
