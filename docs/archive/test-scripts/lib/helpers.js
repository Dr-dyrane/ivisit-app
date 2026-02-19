/**
 * Common Test Helpers
 * Shared utilities for test operations and error handling
 */

const ErrorLogger = require('./error-logger');

class TestHelpers {
    constructor() {
        this.errorLogger = new ErrorLogger();
    }

    async withErrorHandling(testName, testFunction) {
        console.log(`🧪 Running: ${testName}`);
        
        try {
            const result = await testFunction();
            console.log(`✅ ${testName}: Success`);
            return result;
        } catch (error) {
            console.log(`❌ ${testName}: Failed - ${error.message}`);
            
            // Log the error with context
            await this.errorLogger.logTestError(error, testName, 'test_helper');
            
            throw error;
        }
    }

    async withErrorHandlingAndContext(testName, testFunction, context = {}) {
        console.log(`🧪 Running: ${testName}`);
        
        try {
            const result = await testFunction();
            console.log(`✅ ${testName}: Success`);
            return result;
        } catch (error) {
            console.log(`❌ ${testName}: Failed - ${error.message}`);
            
            // Log the error with enhanced context
            await this.errorLogger.logTestError(error, testName, 'test_helper', context);
            
            throw error;
        }
    }

    async withRetry(testName, testFunction, maxRetries = 3, retryDelay = 1000) {
        console.log(`🔄 Running: ${testName} (with retry)`);
        
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`  Attempt ${attempt}/${maxRetries}...`);
                
                const result = await testFunction();
                console.log(`✅ ${testName}: Success on attempt ${attempt}`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.log(`  ❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxRetries) {
                    console.log(`  ⏳ Waiting ${retryDelay}ms before retry...`);
                    await this.sleep(retryDelay);
                } else {
                    console.log(`  💥 All ${maxRetries} attempts failed`);
                    throw lastError;
                }
            }
        }
    }

    async withTimeout(testName, testFunction, timeoutMs = 5000) {
        console.log(`⏱️ Running: ${testName} (with ${timeoutMs}ms timeout)`);
        
        return Promise.race([
            testFunction(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`${testName} timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]).then(
            result => {
                console.log(`✅ ${testName}: Success (completed in time)`);
                return result;
            },
            error => {
                console.log(`❌ ${testName}: ${error.message}`);
                throw error;
            }
        );
    }

    async withValidation(testName, testFunction, validationRules = {}) {
        console.log(`🔍 Running: ${testName} (with validation)`);
        
        try {
            const result = await testFunction();
            
            // Apply validation rules
            for (const [field, rule] of Object.entries(validationRules)) {
                const value = this.getNestedValue(result, field);
                
                if (!this.validateValue(value, rule)) {
                    throw new Error(`${testName} validation failed: ${field} ${rule.type} validation failed`);
                }
            }
            
            console.log(`✅ ${testName}: Success (all validations passed)`);
            return result;
            
        } catch (error) {
            console.log(`❌ ${testName}: Failed - ${error.message}`);
            throw error;
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key];
        }, obj);
    }

    validateValue(value, rule) {
        switch (rule.type) {
            case 'required':
                return value !== null && value !== undefined && value !== '';
            case 'uuid':
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                return uuidRegex.test(value);
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            case 'phone':
                const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
                return phoneRegex.test(value);
            case 'number':
                return !isNaN(value) && value >= 0;
            case 'string':
                return typeof value === 'string' && value.trim().length > 0;
            case 'array':
                return Array.isArray(value) && value.length > 0;
            case 'object':
                return typeof value === 'object' && value !== null;
            case 'json':
                try {
                    JSON.parse(JSON.stringify(value));
                    return true;
                } catch {
                    return false;
                }
            default:
                return true;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateTestUUID() {
        return '00000000-0000-0000-000000000000'; // Test UUID for testing
    }

    generateTestEmail() {
        return 'test@example.com';
    }

    generateTestPhone() {
        return '+1-555-123-4567';
    }

    generateTestData(overrides = {}) {
        return {
            hospital_id: overrides.hospital_id || this.generateTestUUID(),
            user_id: overrides.user_id || this.generateTestUUID(),
            patient_data: overrides.patient_data || { 
                emergency_type: 'cardiac',
                severity: 'critical',
                symptoms: ['chest pain', 'shortness of breath']
            },
            admin_id: overrides.admin_id || this.generateTestUUID(),
            payment_method: overrides.payment_method || 'stripe',
            decline_reason: overrides.decline_reason || 'Test decline reason'
        };
    }

    generateErrorTestData() {
        return {
            hospital_id: 'invalid-hospital-uuid',
            user_id: 'invalid-user-uuid',
            patient_data: null, // Should cause validation error
            payment_method: 'invalid-method', // Should cause validation error
        };
    }

    formatTestResult(testName, result, duration = null) {
        const formatted = {
            test_name: testName,
            success: result !== null && !result.error,
            result: result,
            duration: duration,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📊 ${testName} Result:`, formatted);
        return formatted;
    }

    formatTestResults(testName, results) {
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        const successRate = ((passed / total) * 100).toFixed(1);
        
        const summary = {
            test_name: testName,
            total_tests: total,
            passed_tests: passed,
            failed_tests: total - passed,
            success_rate: parseFloat(successRate),
            results: results,
            timestamp: new Date().toISOString()
        };
        
        console.log(`\n📊 ${testName} Summary:`);
        console.log(`  Total: ${total}`);
        console.log(`  Passed: ${passed}`);
        console.log(`  Failed: ${total - passed}`);
        console.log(`  Success Rate: ${successRate}%`);
        
        return summary;
    }

    async measurePerformance(testName, testFunction, iterations = 10) {
        console.log(`⚡ Measuring Performance: ${testName}...`);
        
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            
            try {
                await testFunction();
                times.push(Date.now() - start);
            } catch (error) {
                times.push(null); // Failed iteration
            }
        }
        
        const validTimes = times.filter(t => t !== null);
        
        if (validTimes.length === 0) {
            throw new Error(`${testName}: All iterations failed`);
        }
        
        const avgTime = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
        const minTime = Math.min(...validTimes);
        const maxTime = Math.max(...validTimes);
        
        const performance = {
            test_name: testName,
            iterations,
            successful_iterations: validTimes.length,
            average_time_ms: Math.round(avgTime),
            min_time_ms: minTime,
            max_time_ms: maxTime,
            times: times
        };
        
        console.log(`\n⚡ ${testName} Performance:`);
        console.log(`  Average: ${performance.average_time_ms}ms`);
        console.log(`  Min: ${performance.min_time_ms}ms`);
        console.log(`  Max: ${performance.max_time_ms}ms`);
        console.log(`  Success Rate: ${((performance.successful_iterations / iterations) * 100).toFixed(1)}%`);
        
        return performance;
    }

    async batchTest(testName, testFunction, testDataArray) {
        console.log(`📦 Running Batch Test: ${testName}...`);
        
        const results = [];
        let passed = 0;
        
        for (let i = 0; i < testDataArray.length; i++) {
            try {
                console.log(`  Test ${i + 1}/${testDataArray.length}: ${JSON.stringify(testDataArray[i])}`);
                
                const result = await testFunction(testDataArray[i]);
                results.push({
                    index: i,
                    data: testDataArray[i],
                    result: result,
                    success: result !== null && !result.error
                });
                
                if (result !== null && !result.error) {
                    passed++;
                }
                
            } catch (error) {
                console.log(`  ❌ Test ${i + 1} failed: ${error.message}`);
                results.push({
                    index: i,
                    data: testDataArray[i],
                    error: error.message,
                    success: false
                });
            }
        }
        
        const summary = this.formatTestResults(testName, results);
        
        console.log(`\n📊 ${testName} Batch Summary:`);
        console.log(`  Total: ${testDataArray.length}`);
        console.log(`  Passed: ${passed}`);
        console.log(`  Failed: ${testDataArray.length - passed}`);
        console.log(`  Success Rate: ${((passed / testDataArray.length) * 100).toFixed(1)}%`);
        
        return summary;
    }

    createTestReport(testResults) {
        const report = {
            generated_at: new Date().toISOString(),
            test_suites: testResults,
            summary: {
                total_tests: Object.values(testResults).reduce((sum, suite) => sum + (suite.total?.total || 0), 0),
                total_passed: Object.values(testResults).reduce((sum, suite) => sum + (suite.total?.passed || 0), 0),
                overall_success_rate: Object.values(testResults).reduce((sum, suite) => {
                    const rate = ((suite.total?.passed || 0) / (suite.total?.total || 0)) * 100;
                    return sum + rate;
                }, 0) / Object.keys(testResults).length
            }
        };
        
        return report;
    }
}

module.exports = TestHelpers;
