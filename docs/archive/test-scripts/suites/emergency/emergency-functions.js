/**
 * Emergency Functions Test Suite
 * Orchestrates all emergency-related tests using modular components
 */

const EmergencyFlowComponent = require('../../components/emergency/emergency-flow');
const DatabaseComponent = require('../../lib/database');

class EmergencyTestSuite {
    constructor() {
        this.emergencyFlow = new EmergencyFlowComponent();
        this.db = new DatabaseComponent();
    }

    async runAllTests() {
        console.log('🚀 Running Emergency Test Suite...\n');
        
        const testCases = [
            {
                name: 'Emergency Creation with Stripe',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'cardiac' },
                    payment_method: 'stripe'
                }
            },
            {
                name: 'Emergency Creation with Cash',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'trauma' },
                    payment_method: 'cash'
                }
            },
            {
                name: 'Emergency Creation Invalid Hospital',
                data: {
                    hospital_id: 'invalid-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'stroke' },
                    payment_method: 'stripe'
                }
            },
            {
                name: 'Emergency Creation Invalid User',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'invalid-user-uuid',
                    patient_data: { emergency_type: 'respiratory' },
                    payment_method: 'stripe'
                }
            },
            {
                name: 'Emergency Creation Missing Patient Data',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: null
                }
            },
            {
                name: 'Emergency Creation Invalid Payment Method',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'fracture' },
                    payment_method: 'invalid-method'
                }
            }
        ];

        let passedTests = 0;
        let totalTests = testCases.length;

        for (const testCase of testCases) {
            try {
                console.log(`\n--- Test: ${testCase.name} ---\n`);
                
                const result = await this.emergencyFlow.testEmergencyCreation(testCase.data);
                
                if (testCase.name.includes('Invalid')) {
                    // Test should fail
                    try {
                        await this.emergencyFlow.testEmergencyCreation(testCase.data);
                        console.log(`❌ Test: ${testCase.name} FAILED (should have thrown error)`);
                    } catch (error) {
                        console.log(`✅ Test: ${testCase.name} PASSED (threw expected error)`);
                        passedTests++;
                    }
                } else {
                    // Test should succeed
                    Assertions.assertNotNullOrUndefined(result, `Emergency Creation - ${testCase.name}`);
                    Assertions.assertUUID(result.id, `Emergency Creation - ${testCase.name}`);
                    Assertions.assertJSON(testCase.data.patient_data, `Emergency Creation - ${testCase.name}`);
                    passedTests++;
                }
                
            } catch (error) {
                console.log(`❌ Test: ${testCase.name} FAILED ---\n`);
                console.log('Error:', error.message);
            }
        }

        console.log(`\n📊 Emergency Function Tests Results: ${passedTests}/${totalTests} passed`);
        return { passedTests, totalTests };
    }

    async runPaymentTests() {
        console.log('💰 Running Payment Tests...\n');
        
        const testEmergencyId = 'test-emergency-uuid';
        const testAdminId = 'test-admin-uuid';
        
        const paymentTests = [
            {
                name: 'Payment Approval Valid',
                test: () => this.emergencyFlow.testPaymentApproval(testEmergencyId, testAdminId)
            },
            {
                name: 'Payment Approval Invalid Emergency',
                test: () => this.emergencyFlow.testPaymentApproval('invalid-emergency-uuid', testAdminId),
                shouldThrow: true
            },
            {
                name: 'Payment Approval Invalid Admin',
                test: () => this.emergencyFlow.testPaymentApproval(testEmergencyId, 'invalid-admin-uuid'),
                shouldThrow: true
            },
            {
                name: 'Payment Decline Valid',
                test: () => this.emergencyFlow.testPaymentDecline(testEmergencyId, testAdminId, 'Test reason')
            },
            {
                name: 'Payment Decline Invalid Emergency',
                test: () => this.emergencyFlow.testPaymentDecline('invalid-emergency-uuid', testAdminId, 'Test reason'),
                shouldThrow: true
            },
            {
                name: 'Payment Decline Invalid Admin',
                test: () => this.emergencyFlow.testPaymentDecline(testEmergencyId, 'invalid-admin-uuid', 'Test reason'),
                shouldThrow: true
            },
            {
                name: 'Payment Decline No Reason',
                test: () => this.emergencyFlow.testPaymentDecline(testEmergencyId, testAdminId, null),
                shouldThrow: true
            }
        ];

        let passedTests = 0;
        let totalTests = paymentTests.length;

        for (const paymentTest of paymentTests) {
            try {
                console.log(`\n--- Test: ${paymentTest.name} ---\n`);
                
                if (paymentTest.shouldThrow) {
                    Assertions.assertThrows(
                        paymentTest.test,
                        `Payment Test - ${paymentTest.name}`
                    );
                } else {
                    await paymentTest.test();
                    Assertions.assertSuccess(
                        await paymentTest.test(),
                        `Payment Test - ${paymentTest.name}`
                    );
                }
                
                passedTests++;
                
            } catch (error) {
                console.log(`❌ Test: ${paymentTest.name} FAILED ---\n`);
                console.log('Error:', error.message);
            }
        }

        console.log(`\n📊 Payment Tests Results: ${passedTests}/${totalTests} passed`);
        return { passedTests, totalTests };
    }

    async runTriggerTests() {
        console.log('🔧 Running Trigger Tests...\n');
        
        const testEmergencyId = 'test-emergency-uuid';
        
        const triggerTests = [
            {
                name: 'Driver Assignment Trigger',
                test: () => this.emergencyFlow.testDriverAssignment(testEmergencyId)
            },
            {
                name: 'Emergency Sync Trigger',
                test: () => this.emergencyFlow.testEmergencySync(testEmergencyId)
            },
            {
                name: 'Emergency Notifications Trigger',
                test: () => this.emergencyFlow.testEmergencyNotifications(testEmergencyId)
            },
            {
                name: 'Ambulance Release Trigger',
                test: () => this.emergencyFlow.testAmbulanceRelease(testEmergencyId)
            }
        ];

        let passedTests = 0;
        let totalTests = triggerTests.length;

        for (const triggerTest of triggerTests) {
            try {
                console.log(`\n--- Test: ${triggerTest.name} ---\n`);
                
                await triggerTest.test();
                Assertions.assertSuccess(
                    await triggerTest.test(),
                    `Trigger Test - ${triggerTest.name}`
                );
                
                passedTests++;
                
            } catch (error) {
                console.log(`❌ Test: ${triggerTest.name} FAILED ---\n`);
                console.log('Error:', error.message);
            }
        }

        console.log(`\n📊 Trigger Tests Results: ${passedTests}/${totalTests} passed`);
        return { passedTests, totalTests };
    }

    async runIntegrationTests() {
        console.log('🔗 Running Integration Tests...\n');
        
        const integrationTests = [
            {
                name: 'Full Emergency Flow - Stripe',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'cardiac' },
                    payment_method: 'stripe',
                    admin_id: 'test-admin-uuid'
                }
            },
            {
                name: 'Full Emergency Flow - Cash',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'trauma' },
                    payment_method: 'cash',
                    admin_id: 'test-admin-uuid'
                }
            },
            {
                name: 'Full Emergency Flow - Decline',
                data: {
                    hospital_id: 'test-hospital-uuid',
                    user_id: 'test-user-uuid',
                    patient_data: { emergency_type: 'stroke' },
                    payment_method: 'cash',
                    admin_id: 'test-admin-uuid',
                    decline_reason: 'Test decline'
                }
            }
        ];

        let passedTests = 0;
        let totalTests = integrationTests.length;

        for (const integrationTest of integrationTests) {
            try {
                console.log(`\n--- Test: ${integrationTest.name} ---\n`);
                
                const result = await this.emergencyFlow.runFullEmergencyFlow(integrationTest.data);
                
                if (result.success) {
                    console.log(`✅ Test: ${integrationTest.name} PASSED`);
                    passedTests++;
                } else {
                    console.log(`❌ Test: ${integrationTest.name} FAILED`);
                    console.log('Error:', result.error);
                }
                
            } catch (error) {
                console.log(`❌ Test: ${integrationTest.name} FAILED ---\n`);
                console.log('Error:', error.message);
            }
        }

        console.log(`\n📊 Integration Tests Results: ${passedTests}/${totalTests} passed`);
        return { passedTests, totalTests };
    }

    async runAllSuites() {
        console.log('🎯 Running All Emergency Test Suites...\n');
        
        try {
            await this.db.connect();
            
            const emergencyFunctionResults = await this.runAllTests();
            const paymentResults = await this.runPaymentTests();
            const triggerResults = await this.runTriggerTests();
            const integrationResults = await this.runIntegrationTests();
            
            const totalPassed = emergencyFunctionResults.passedTests + 
                             paymentResults.passedTests + 
                             triggerResults.passedTests + 
                             integrationResults.passedTests;
            const totalTests = emergencyFunctionResults.totalTests + 
                           paymentResults.totalTests + 
                           triggerResults.totalTests + 
                           integrationResults.totalTests;
            
            console.log(`\n📊 FINAL SUITE RESULTS: ${totalPassed}/${totalTests} tests passed`);
            console.log(`📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
            
            return {
                emergencyFunctions: emergencyFunctionResults,
                payments: paymentResults,
                triggers: triggerResults,
                integration: integrationResults,
                total: { passed: totalPassed, total: totalTests }
            };
            
        } catch (error) {
            console.log('\n❌ All Emergency Test Suites: FAILED');
            console.log('Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        } finally {
            await this.db.cleanup();
        }
    }

    async runSpecificSuite(suiteName) {
        const suites = {
            'emergency-functions': () => this.runAllTests(),
            'payment-functions': () => this.runPaymentTests(),
            'trigger-tests': () => this.runTriggerTests(),
            'integration-tests': () => this.runIntegrationTests()
        };
        
        if (!suites[suiteName]) {
            throw new Error(`Suite ${suiteName} not found`);
        }
        
        return await suites[suiteName]();
    }
}

module.exports = EmergencyTestSuite;
