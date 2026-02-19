/**
 * Test Suite Runner
 * Orchestrates execution of multiple test suites using modular components
 */

const EmergencyTestSuite = require('../suites/emergency/emergency-functions');
const CoreTestSuite = require('../suites/core/core-system');
const IntegrationTestSuite = require('../suites/integration/end-to-end');

class SuiteRunner {
    constructor() {
        this.suites = [
            new EmergencyTestSuite(),
            new CoreTestSuite(),
            new IntegrationTestSuite()
        ];
    }

    async runAllSuites() {
        console.log('🎯 Running All Test Suites...\n');
        
        const results = {};
        
        for (const suite of this.suites) {
            try {
                const suiteResult = await suite.runAllSuites();
                results[suite.constructor.name] = suiteResult;
                
                console.log(`\n📋 ${suite.constructor.name} Results:`);
                console.log(`   Passed: ${suiteResult.total?.passed || 0}/${suiteResult.total?.total || 0}`);
                
                if (suiteResult.total) {
                    const successRate = ((suiteResult.total.passed / suiteResult.total.total) * 100).toFixed(1);
                    console.log(`   Success Rate: ${successRate}%`);
                }
                
            } catch (error) {
                console.log(`\n❌ ${suite.constructor.name} FAILED:`);
                console.log('   Error:', error.message);
                results[suite.constructor.name] = { error: error.message };
            }
        }

        return results;
    }

    async runSpecificSuite(suiteName) {
        const suite = this.suites.find(s => s.constructor.name === suiteName);
        if (!suite) {
            throw new Error(`Suite ${suiteName} not found`);
        }
        
        return await suite.runAllSuites();
    }

    async runSpecificTest(suiteName, testName) {
        const suite = this.suites.find(s => s.constructor.name === suiteName);
        if (!suite) {
            throw new Error(`Suite ${suiteName} not found`);
        }
        
        return await suite.runSpecificTest(testName);
    }

    async runEmergencyTests() {
        return await this.runSpecificSuite('EmergencyTestSuite');
    }

    async runPaymentTests() {
        const emergencySuite = this.suites.find(s => s.constructor.name === 'EmergencyTestSuite');
        if (!emergencySuite) {
            throw new Error('EmergencyTestSuite not found');
        }
        
        return await emergencySuite.runPaymentTests();
    }

    async runTriggerTests() {
        const emergencySuite = this.suites.find(s => s.constructor.name === 'EmergencyTestSuite');
        if (!emergencySuite) {
            throw new Error('EmergencyTestSuite not found');
        }
        
        return await emergencySuite.runTriggerTests();
    }

    async runIntegrationTests() {
        const emergencySuite = this.suites.find(s => s.constructor.name === 'EmergencyTestSuite');
        if (!emergencySuite) {
            throw new Error('EmergencyTestSuite not found');
        }
        
        return await emergencySuite.runIntegrationTests();
    }

    async runWithFilter(filterOptions = {}) {
        console.log('🔍 Running Tests with Filter...\n');
        
        const results = {};
        
        for (const suite of this.suites) {
            try {
                // Apply filters to suite execution
                const suiteResult = await this.runSuiteWithFilter(suite, filterOptions);
                results[suite.constructor.name] = suiteResult;
                
                console.log(`\n📋 ${suite.constructor.name} Results (Filtered):`);
                console.log(`   Passed: ${suiteResult.total?.passed || 0}/${suiteResult.total?.total || 0}`);
                
                if (suiteResult.total) {
                    const successRate = ((suiteResult.total.passed / suiteResult.total.total) * 100).toFixed(1);
                    console.log(`   Success Rate: ${successRate}%`);
                }
                
            } catch (error) {
                console.log(`\n❌ ${suite.constructor.name} FAILED:`);
                console.log('   Error:', error.message);
                results[suite.constructor.name] = { error: error.message };
            }
        }

        return results;
    }

    async runSuiteWithFilter(suite, filterOptions) {
        // Apply filters to suite execution
        if (filterOptions.category) {
            // Run only specific category of tests
            switch (filterOptions.category) {
                case 'emergency-functions':
                    return await suite.runAllTests();
                case 'payment-functions':
                    return await suite.runPaymentTests();
                case 'trigger-tests':
                    return await suite.runTriggerTests();
                case 'integration-tests':
                    return await suite.runIntegrationTests();
                default:
                    return await suite.runAllSuites();
            }
        }
        
        if (filterOptions.testName) {
            // Run specific test
            return await suite.runSpecificTest(filterOptions.testName);
        }
        
        // Default: run all tests
        return await suite.runAllSuites();
    }

    generateReport(results) {
        console.log('\n📊 FINAL TEST REPORT\n');
        console.log('=' .repeat(50));
        
        let totalPassed = 0;
        let totalTests = 0;
        
        for (const [suiteName, result] of Object.entries(results)) {
            if (result.total) {
                totalPassed += result.total.passed;
                totalTests += result.total.total;
                
                console.log(`\n${suiteName}:`);
                console.log(`  Tests: ${result.total.passed}/${result.total.total}`);
                console.log(`  Success Rate: ${((result.total.passed / result.total.total) * 100).toFixed(1)}%`);
                
                if (result.error) {
                    console.log(`  Error: ${result.error}`);
                }
            } else {
                console.log(`  Error: ${result.error}`);
            }
        }
        
        console.log('\nOVERALL RESULTS:');
        console.log(`  Total Tests: ${totalTests}`);
        console.log(`  Total Passed: ${totalPassed}`);
        console.log(`  Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
        
        return {
            total: { passed: totalPassed, total: totalTests },
            suites: results
        };
    }
}

// CLI Interface
if (require.main === module) {
    const runner = new SuiteRunner();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Run all suites
        const results = await runner.runAllSuites();
        runner.generateReport(results);
    } else if (args[0] === '--suite') {
        // Run specific suite
        const suiteName = args[1];
        if (!suiteName) {
            console.error('Error: Suite name required after --suite');
            process.exit(1);
        }
        
        const results = await runner.runSpecificSuite(suiteName);
        runner.generateReport({ [suiteName]: results });
    } else if (args[0] === '--test') {
        // Run specific test
        const [suiteName, testName] = args[1].split('.');
        if (!suiteName || !testName) {
            console.error('Error: Format --test SuiteName.TestName');
            process.exit(1);
        }
        
        const results = await runner.runSpecificTest(suiteName, testName);
        runner.generateReport({ [suiteName]: { [testName]: results } });
    } else if (args[0] === '--category') {
        // Run tests by category
        const category = args[1];
        if (!category) {
            console.error('Error: Category required after --category');
            process.exit(1);
        }
        
        const filterOptions = { category };
        const results = await runner.runWithFilter(filterOptions);
        runner.generateReport(results);
    } else if (args[0] === '--help') {
        console.log(`
🎯 Test Suite Runner - Usage:

Run all suites:
  node suite-runner.js

Run specific suite:
  node suite-runner.js --suite EmergencyTestSuite

Run specific test:
  node suite-runner.js --test EmergencyTestSuite.testEmergencyCreation

Run tests by category:
  node suite-runner.js --category emergency-functions
  node suite-runner.js --category payment-functions
  node suite-runner.js --category trigger-tests
  node suite-runner.js --category integration-tests

Available suites:
  - EmergencyTestSuite
  - CoreTestSuite
  - IntegrationTestSuite

Available categories:
  - emergency-functions
  - payment-functions
  - trigger-tests
  - integration-tests
        `);
    } else {
        console.error('Error: Unknown command. Use --help for usage.');
        process.exit(1);
    }
}

module.exports = SuiteRunner;
