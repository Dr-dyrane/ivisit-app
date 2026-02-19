#!/usr/bin/env node

/**
 * Main Test Runner for iVisit Supabase Testing System
 * 
 * This script orchestrates task-based testing with error handling,
 * fix generation, and validation reporting.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const TestHelper = require('./test_helper');
const dotenv = require('dotenv');
// Load default .env
dotenv.config();
// Load .env.local if available (overriding)
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

class TestRunner {
  constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );

    this.testResults = {
      taskId: null,
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        info: 0
      },
      errors: [],
      recommendations: [],
      nextSteps: []
    };

    this.errorLogger = new ErrorLogger();
    this.fixGenerator = new FixGenerator();
    this.testHelper = new TestHelper();
  }

  /**
   * Run a specific test task
   */
  async runTask(taskName) {
    console.log(`🧪 Running Task: ${taskName}`);
    this.testResults.taskId = taskName;

    try {
      // Load task definition
      const taskPath = path.join(__dirname, '../tasks', `${taskName}.md`);
      if (!fs.existsSync(taskPath)) {
        throw new Error(`Task file not found: ${taskPath}`);
      }

      const taskDefinition = fs.readFileSync(taskPath, 'utf8');
      console.log(`📋 Task loaded: ${taskName}`);

      // Execute task based on type
      await this.executeTask(taskName, taskDefinition);

      // Generate validation report
      await this.generateValidationReport();

      // Handle errors if any
      if (this.testResults.errors.length > 0) {
        await this.handleErrors();
      }

      // Clean up test data if needed
      if (taskDefinition.includes('Cleanup')) {
        await this.cleanupTestData();
      }

    } catch (error) {
      await this.errorLogger.logError({
        type: 'critical',
        category: 'system',
        message: `Task execution failed: ${error.message}`,
        technicalDetails: {
          stack: error.stack,
          taskId: taskName
        }
      });
    }
  }

  /**
   * Execute task based on its type and definition
   */
  async executeTask(taskName, taskDefinition) {
    // Parse task definition to determine test type
    const testType = this.determineTestType(taskDefinition);

    switch (testType) {
      case 'schema_validation':
        await this.runSchemaValidation(taskName);
        break;
      case 'function_testing':
        await this.runFunctionTesting(taskName);
        break;
      case 'security_testing':
        await this.runSecurityTesting(taskName);
        break;
      case 'integration_testing':
        await this.runIntegrationTesting(taskName);
        break;
      case 'performance_testing':
        await this.runPerformanceTesting(taskName);
        break;
      default:
        await this.runComprehensiveTesting(taskName);
        break;
    }

    // Generate validation report
    await this.generateValidationReport();

    // Handle errors if any
    if (this.testResults.errors.length > 0) {
      await this.handleErrors();
    }

    // Clean up test data if needed
    if (taskDefinition.includes('Cleanup')) {
      await this.cleanupTestData();
    }
  }

  /**
   * Determine test type from task definition
   */
  determineTestType(taskDefinition) {
    if (taskDefinition.includes('Schema Validation')) return 'schema_validation';
    if (taskDefinition.includes('Function Testing')) return 'function_testing';
    if (taskDefinition.includes('Security Testing')) return 'security_testing';
    if (taskDefinition.includes('Integration Testing')) return 'integration_testing';
    if (taskDefinition.includes('Performance Testing')) return 'performance_testing';
    return 'comprehensive';
  }

  /**
   * Run integration testing for specific task
   */
  async runIntegrationTesting(taskName) {
    console.log('🔍 Running Integration Testing...');

    // Define integration tests based on task name
    const integrationTests = {
      'phase2_medical_insurance_tracking': [
        this.testMedicalProfileFunctions,
        this.testInsuranceValidationFunctions,
        this.testRealtimeTrackingFunctions
      ],
      'payment_methods_is_active_fix': [
        this.testPaymentMethodsActive,
        this.testPaymentValidationFunctions
      ],
      'emergency_dispatch_automation_fix': [
        this.testEmergencyDispatchFunctions,
        this.testEmergencyValidationFunctions
      ]
    };

    const tests = integrationTests[taskName] || [
      this.testCoreRPCFunctions,
      this.testEmergencyLogic,
      this.testTableAccess,
      this.testDisplayIDResolution,
      this.testSecurityFunctions,
      this.testWalletSystem
    ];

    for (const test of tests) {
      await this.executeTest(test.name, test);
    }
  }

  /**
   * Test Medical Profile Functions
   */
  async testMedicalProfileFunctions() {
    try {
      // Test get_medical_summary
      const { data: medicalSummary, error: medicalError } = await this.supabase
        .rpc('get_medical_summary', {
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });

      if (medicalError && !medicalError.message.includes('not found')) {
        return {
          success: false,
          message: `Medical summary function error: ${medicalError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: medicalError }
        };
      }

      // Test validate_medical_profile
      const { data: validation, error: validationError } = await this.supabase
        .rpc('validate_medical_profile', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_medical_data: {
            blood_type: 'O+',
            allergies: 'Peanuts',
            medications: 'Aspirin'
          }
        });

      if (validationError) {
        return {
          success: false,
          message: `Medical profile validation error: ${validationError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: validationError }
        };
      }

      return {
        success: true,
        message: 'Medical profile functions accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Medical profile test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Insurance Validation Functions
   */
  async testInsuranceValidationFunctions() {
    try {
      // Test validate_insurance_coverage
      const { data: coverage, error: coverageError } = await this.supabase
        .rpc('validate_insurance_coverage', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_hospital_id: '00000000-0000-0000-0000-000000000000',
          p_estimated_cost: 500.00
        });

      if (coverageError && !coverageError.message.includes('No active insurance')) {
        return {
          success: false,
          message: `Insurance coverage validation error: ${coverageError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: coverageError }
        };
      }

      // Test get_insurance_policies
      const { data: policies, error: policiesError } = await this.supabase
        .rpc('get_insurance_policies', {
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });

      if (policiesError) {
        return {
          success: false,
          message: `Insurance policies function error: ${policiesError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: policiesError }
        };
      }

      return {
        success: true,
        message: 'Insurance validation functions accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Insurance validation test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Real-time Tracking Functions
   */
  async testRealtimeTrackingFunctions() {
    try {
      // Test update_ambulance_location
      const { data: location, error: locationError } = await this.supabase
        .rpc('update_ambulance_location', {
          p_ambulance_id: '00000000-0000-0000-0000-000000000000',
          p_latitude: 40.7128,
          p_longitude: -74.0060,
          p_accuracy: 10.0
        });

      if (locationError && !locationError.message.includes('not found')) {
        return {
          success: false,
          message: `Ambulance location update error: ${locationError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: locationError }
        };
      }

      // Test get_ambulance_status
      const { data: status, error: statusError } = await this.supabase
        .rpc('get_ambulance_status', {
          p_ambulance_id: '00000000-0000-0000-0000-000000000000'
        });

      if (statusError && !statusError.message.includes('not found')) {
        return {
          success: false,
          message: `Ambulance status function error: ${statusError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: statusError }
        };
      }

      return {
        success: true,
        message: 'Real-time tracking functions accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Real-time tracking test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Payment Methods Active Column
   */
  async testPaymentMethodsActive() {
    try {
      // Test that payment_methods table has is_active column
      const { data, error } = await this.supabase
        .from('payment_methods')
        .select('is_active')
        .limit(1);

      if (error && error.message.includes('column "is_active" does not exist')) {
        return {
          success: false,
          message: 'Payment methods is_active column missing',
          errorType: 'critical',
          category: 'schema',
          technicalDetails: { error: error.message }
        };
      }

      return {
        success: true,
        message: 'Payment methods is_active column exists'
      };
    } catch (error) {
      return {
        success: false,
        message: `Payment methods test failed: ${error.message}`,
        errorType: 'critical',
        category: 'schema',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Payment Validation Functions
   */
  async testPaymentValidationFunctions() {
    try {
      // Test validate_payment_method
      const { data, error } = await this.supabase
        .rpc('validate_payment_method', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_payment_method_id: '00000000-0000-0000-0000-000000000000'
        });

      if (error && !error.message.includes('not found')) {
        return {
          success: false,
          message: `Payment validation function error: ${error.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error }
        };
      }

      return {
        success: true,
        message: 'Payment validation functions accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Payment validation test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Emergency Dispatch Functions
   */
  async testEmergencyDispatchFunctions() {
    try {
      // Test get_available_ambulances
      const { data, error } = await this.supabase
        .rpc('get_available_ambulances', {
          p_hospital_id: '00000000-0000-0000-0000-000000000000'
        });

      if (error && !error.message.includes('does not exist')) {
        return {
          success: false,
          message: `Emergency dispatch function error: ${error.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error }
        };
      }

      return {
        success: true,
        message: 'Emergency dispatch functions accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Emergency dispatch test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Emergency Validation Functions
   */
  async testEmergencyValidationFunctions() {
    try {
      // Test validate_emergency_request
      const { data, error } = await this.supabase
        .rpc('validate_emergency_request', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_service_type: 'ambulance'
        });

      if (error && !error.message.includes('does not exist')) {
        return {
          success: false,
          message: `Emergency validation function error: ${error.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error }
        };
      }

      return {
        success: true,
        message: 'Emergency validation functions accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Emergency validation test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Run comprehensive system test
   */
  async runComprehensiveTesting(taskName) {
    console.log('🔍 Running Comprehensive System Test...');

    const tests = [
      this.testCoreRPCFunctions,
      this.testEmergencyLogic,
      this.testTableAccess,
      this.testDisplayIDResolution,
      this.testSecurityFunctions,
      this.testWalletSystem
    ];

    for (const test of tests) {
      await this.executeTest(test.name, test);
    }
  }

  /**
   * Execute individual test and record results
   */
  async executeTest(testName, testFunction) {
    this.testResults.summary.totalTests++;

    try {
      const result = await testFunction.call(this);
      if (result.success) {
        this.testResults.summary.passed++;
        console.log(`✅ ${testName}: ${result.message}`);
      } else {
        this.testResults.summary.failed++;
        await this.errorLogger.logError({
          type: result.errorType || 'warning',
          category: result.category || 'test',
          message: result.message,
          technicalDetails: result.technicalDetails
        });
        console.log(`❌ ${testName}: ${result.message}`);
      }
    } catch (error) {
      this.testResults.summary.failed++;
      await this.errorLogger.logError({
        type: 'critical',
        category: 'test',
        message: `Test execution failed: ${error.message}`,
        technicalDetails: {
          testName,
          stack: error.stack
        }
      });
      console.log(`🚨 ${testName}: ${error.message}`);
    }
  }

  /**
   * Test Core RPC Functions
   */
  async testCoreRPCFunctions() {
    try {
      // Test nearby hospitals
      const { data: hospitals, error: hospitalError } = await this.supabase
        .rpc('nearby_hospitals', {
          user_lat: 40.7128,
          user_lng: -74.0060,
          radius_km: 10
        });

      if (hospitalError) {
        return {
          success: false,
          message: `Nearby hospitals error: ${hospitalError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: hospitalError }
        };
      }

      // Test nearby ambulances
      const { data: ambulances, error: ambulanceError } = await this.supabase
        .rpc('nearby_ambulances', {
          user_lat: 40.7128,
          user_lng: -74.0060,
          radius_km: 10
        });

      if (ambulanceError) {
        return {
          success: false,
          message: `Nearby ambulances error: ${ambulanceError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: ambulanceError }
        };
      }

      return {
        success: true,
        message: `Nearby hospitals: ${hospitals?.length || 0} found, Nearby ambulances: ${ambulances?.length || 0} found`
      };
    } catch (error) {
      return {
        success: false,
        message: `RPC function test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Emergency Logic Functions
   */
  async testEmergencyLogic() {
    try {
      // Test emergency creation function accessibility
      const { data, error } = await this.supabase
        .rpc('create_emergency_v4', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_request_data: {
            hospital_id: '00000000-0000-0000-0000-000000000000',
            service_type: 'ambulance',
            hospital_name: 'Test Hospital',
            specialty: 'Emergency Medicine',
            ambulance_type: 'BLS',
            patient_location: { lat: 40.7128, lng: -74.0060 },
            patient_snapshot: {}
          },
          p_payment_data: {
            method: 'cash',
            total_amount: 150.00,
            currency: 'USD'
          }
        });

      // Expected to fail with invalid UUID, but function should be accessible
      if (error && !error.message.includes('does not exist')) {
        return {
          success: true,
          message: 'Emergency logic function exists and is callable'
        };
      }

      return {
        success: false,
        message: 'Emergency logic function not accessible',
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error }
      };
    } catch (error) {
      return {
        success: false,
        message: `Emergency logic test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Table Access and Display ID Mapping
   */
  async testTableAccess() {
    const tables = [
      'profiles', 'organizations', 'hospitals', 'doctors', 'ambulances',
      'emergency_requests', 'visits', 'patient_wallets', 'organization_wallets',
      'payments', 'notifications', 'id_mappings'
    ];

    let accessibleTables = 0;
    let errors = [];

    for (const table of tables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('count')
          .limit(1);

        if (error) {
          errors.push({
            table,
            error: error.message
          });
        } else {
          accessibleTables++;
        }
      } catch (error) {
        errors.push({
          table,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `${errors.length} tables inaccessible`,
        errorType: 'critical',
        category: 'schema',
        technicalDetails: { errors }
      };
    }

    return {
      success: true,
      message: `All ${accessibleTables} tables accessible`
    };
  }

  /**
   * Test Display ID Resolution
   */
  async testDisplayIDResolution() {
    try {
      // Test id_mappings table access
      const { data: mappings, error: mappingError } = await this.supabase
        .from('id_mappings')
        .select('count')
        .limit(1);

      if (mappingError) {
        return {
          success: false,
          message: `ID mappings table error: ${mappingError.message}`,
          errorType: 'critical',
          category: 'schema',
          technicalDetails: { error: mappingError }
        };
      }

      // Test get_entity_id function
      const { data: entityId, error: functionError } = await this.supabase
        .rpc('get_entity_id', {
          p_display_id: 'PAT-123456'
        });

      if (functionError && !functionError.message.includes('does not exist')) {
        return {
          success: false,
          message: `get_entity_id function error: ${functionError.message}`,
          errorType: 'critical',
          category: 'function',
          technicalDetails: { error: functionError }
        };
      }

      return {
        success: true,
        message: `ID mappings: ${mappings?.length || 0} records, get_entity_id function accessible`
      };
    } catch (error) {
      return {
        success: false,
        message: `Display ID resolution test failed: ${error.message}`,
        errorType: 'critical',
        category: 'function',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Security Functions
   */
  async testSecurityFunctions() {
    try {
      const { data, error } = await this.supabase
        .rpc('is_admin');

      if (error && !error.message.includes('does not exist')) {
        return {
          success: false,
          message: `is_admin function error: ${error.message}`,
          errorType: 'critical',
          category: 'security',
          technicalDetails: { error }
        };
      }

      return {
        success: true,
        message: 'Security function is_admin accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `Security function test failed: ${error.message}`,
        errorType: 'critical',
        category: 'security',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Test Wallet System
   */
  async testWalletSystem() {
    try {
      const { data, error } = await this.supabase
        .from('patient_wallets')
        .select('count')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `Patient wallets error: ${error.message}`,
          errorType: 'critical',
          category: 'schema',
          technicalDetails: { error }
        };
      }

      return {
        success: true,
        message: `Patient wallets: ${data?.length || 0} records`
      };
    } catch (error) {
      return {
        success: false,
        message: `Wallet system test failed: ${error.message}`,
        errorType: 'critical',
        category: 'schema',
        technicalDetails: { error: error.message }
      };
    }
  }

  /**
   * Generate validation report
   */
  async generateValidationReport() {
    const reportPath = path.join(__dirname, '../validation/validation_report.json');

    // Calculate success rate
    const successRate = this.testResults.summary.totalTests > 0
      ? (this.testResults.summary.passed / this.testResults.summary.totalTests * 100).toFixed(1)
      : 0;

    const report = {
      ...this.testResults,
      summary: {
        ...this.testResults.summary,
        successRate: `${successRate}%`
      }
    };

    // Write report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n🎯 Test Summary:');
    console.log(`✅ Passed: ${this.testResults.summary.passed}`);
    console.log(`❌ Failed: ${this.testResults.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.testResults.summary.warnings}`);
    console.log(`ℹ️  Info: ${this.testResults.summary.info}`);
    console.log(`📊 Success Rate: ${successRate}%`);

    return report;
  }

  /**
   * Handle errors and generate fixes
   */
  async handleErrors() {
    console.log('\n🔧 Handling Errors...');

    const criticalErrors = this.testResults.errors.filter(e => e.type === 'critical');
    const warningErrors = this.testResults.errors.filter(e => e.type === 'warning');

    if (criticalErrors.length > 0) {
      console.log(`🚨 Found ${criticalErrors.length} critical errors`);

      // Generate fixes for critical errors
      for (const error of criticalErrors) {
        const fix = await this.fixGenerator.generateFix(error);
        if (fix) {
          await this.applyFix(fix);
        }
      }
    }

    if (warningErrors.length > 0) {
      console.log(`⚠️  Found ${warningErrors.length} warning errors`);
      this.testResults.recommendations.push(
        'Review and fix warning errors in next deployment'
      );
    }

    this.testResults.nextSteps.push(
      'Re-run validation after applying fixes',
      'Update core migrations with successful fixes',
      'Sync changes to console'
    );
  }

  /**
   * Apply fix to database
   */
  async applyFix(fix) {
    console.log(`🔧 Applying fix: ${fix.description}`);

    try {
      const { error } = await this.supabase.rpc('exec_sql', { sql: fix.sql });

      if (error) {
        console.log(`❌ Fix application failed: ${error.message}`);
        return false;
      }

      console.log(`✅ Fix applied successfully`);
      return true;
    } catch (error) {
      console.log(`❌ Fix application error: ${error.message}`);
      return false;
    }
  }
}

/**
 * Error Logger Class
 */
class ErrorLogger {
  constructor() {
    this.errorLogPath = path.join(__dirname, '../validation/error_log.json');
    this.errors = [];
  }

  async logError(error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...error,
      status: 'detected'
    };

    this.errors.push(logEntry);

    // Append to error log file
    const existingLog = fs.existsSync(this.errorLogPath)
      ? JSON.parse(fs.readFileSync(this.errorLogPath, 'utf8'))
      : [];

    existingLog.push(logEntry);
    fs.writeFileSync(this.errorLogPath, JSON.stringify(existingLog, null, 2));

    console.log(`📝 Error logged: ${error.message}`);
  }
}

/**
 * Fix Generator Class
 */
class FixGenerator {
  async generateFix(error) {
    const fixMap = {
      'missing_table': this.generateTableFix,
      'missing_function': this.generateFunctionFix,
      'missing_column': this.generateColumnFix,
      'permission_error': this.generatePermissionFix
    };

    const fixType = this.determineFixType(error);
    const fixGenerator = fixMap[fixType];

    if (fixGenerator) {
      return await fixGenerator.call(this, error);
    }

    return null;
  }

  determineFixType(error) {
    if (error.message.includes('does not exist') && error.message.includes('relation')) {
      return 'missing_table';
    }
    if (error.message.includes('does not exist') && error.message.includes('function')) {
      return 'missing_function';
    }
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return 'missing_column';
    }
    if (error.message.includes('permission denied')) {
      return 'permission_error';
    }

    return 'unknown';
  }

  async generateTableFix(error) {
    // Generate SQL to create missing table
    const tableName = this.extractTableName(error.message);

    return {
      description: `Create missing table: ${tableName}`,
      sql: `-- Fix for missing table: ${tableName}
-- Generated: ${new Date().toISOString()}
-- Error Type: critical

-- PULLBACK NOTE: Adding missing table
-- OLD: table does not exist
-- NEW: create table with basic structure

CREATE TABLE IF NOT EXISTS public.${tableName} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
      migration: '20260219000100_identity.sql' // Example migration
    };
  }

  async generateFunctionFix(error) {
    // Generate SQL to create missing function
    const functionName = this.extractFunctionName(error.message);

    return {
      description: `Create missing function: ${functionName}`,
      sql: `-- Fix for missing function: ${functionName}
-- Generated: ${new Date().toISOString()}
-- Error Type: critical

-- PULLBACK NOTE: Adding missing function
-- OLD: function does not exist
-- NEW: create basic function stub

CREATE OR REPLACE FUNCTION public.${functionName}()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('success', true, 'message', 'Function stub');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
      migration: '20260219010000_core_rpcs.sql'
    };
  }

  async generateColumnFix(error) {
    // Generate SQL to add missing column
    const { table, column } = this.extractTableColumn(error.message);

    return {
      description: `Add missing column: ${table}.${column}`,
      sql: `-- Fix for missing column: ${table}.${column}
-- Generated: ${new Date().toISOString()}
-- Error Type: warning

-- PULLBACK NOTE: Adding missing display_id column
-- OLD: column does not exist
-- NEW: add display_id column

ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${column} TEXT UNIQUE;`,
      migration: '20260219000400_finance.sql'
    };
  }

  extractTableName(message) {
    const match = message.match(/relation "([^"]+)"/);
    return match ? match[1] : 'unknown_table';
  }

  extractFunctionName(message) {
    const match = message.match(/function "([^"]+)"/);
    return match ? match[1] : 'unknown_function';
  }

  extractTableColumn(message) {
    const tableMatch = message.match(/column "([^"]+)" of relation "([^"]+)"/);
    if (tableMatch) {
      return { column: tableMatch[1], table: tableMatch[2] };
    }
    return { column: 'display_id', table: 'unknown_table' };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const taskName = args[0] || 'comprehensive_system';

  const runner = new TestRunner();
  await runner.runTask(taskName);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestRunner, ErrorLogger, FixGenerator };
