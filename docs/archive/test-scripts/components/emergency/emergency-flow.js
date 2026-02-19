/**
 * Emergency Flow Test Component
 * Reusable emergency system testing
 */

const DatabaseComponent = require('../../lib/database');
const Assertions = require('../../lib/assertions');

class EmergencyFlowComponent {
    constructor() {
        this.db = new DatabaseComponent();
    }

    async testEmergencyCreation(testData) {
        console.log('🧪 Testing Emergency Creation...');
        
        const { data, error } = await this.db.executeRPC(
            'create_emergency_with_payment',
            testData
        );
        
        Assertions.assertSuccess({ data, error }, 'Emergency Creation');
        return data;
    }

    async testDriverAssignment(emergencyId) {
        console.log('🧪 Testing Driver Assignment...');
        
        const { data, error } = await this.db.selectFromTable(
            'emergency_requests',
            ['assigned_ambulance_id'],
            { id: emergencyId }
        );
        
        Assertions.assertExists(data, 'Driver Assignment');
        return data;
    }

    async testPaymentApproval(emergencyId, adminId) {
        console.log('🧪 Testing Payment Approval...');
        
        const { data, error } = await this.db.executeRPC(
            'approve_cash_payment',
            { emergency_id: emergencyId, approved_by: adminId }
        );
        
        Assertions.assertSuccess({ data, error }, 'Payment Approval');
        return data;
    }

    async testPaymentDecline(emergencyId, adminId, reason) {
        console.log('🧪 Testing Payment Decline...');
        
        const { data, error } = await this.db.executeRPC(
            'decline_cash_payment',
            { emergency_id: emergencyId, declined_by: adminId, reason: reason }
        );
        
        Assertions.assertSuccess({ data, error }, 'Payment Decline');
        return data;
    }

    async testAmbulanceRelease(emergencyId) {
        console.log('🧪 Testing Ambulance Release...');
        
        const { data, error } = await this.db.executeRPC(
            'release_ambulance_on_completion',
            { emergency_id: emergencyId }
        );
        
        Assertions.assertSuccess({ data, error }, 'Ambulance Release');
        return data;
    }

    async testEmergencySync(emergencyId) {
        console.log('🧪 Testing Emergency Sync...');
        
        const { data, error } = await this.db.executeRPC(
            'sync_emergency_to_visit',
            { emergency_id: emergencyId }
        );
        
        Assertions.assertSuccess({ data, error }, 'Emergency Sync');
        return data;
    }

    async testEmergencyNotifications(emergencyId) {
        console.log('🧪 Testing Emergency Notifications...');
        
        const { data, error } = await this.db.executeRPC(
            'notify_emergency_events',
            { emergency_id: emergencyId }
        );
        
        Assertions.assertSuccess({ data, error }, 'Emergency Notifications');
        return data;
    }

    async runFullEmergencyFlow(testData) {
        console.log('🚀 Running Full Emergency Flow Test...\n');
        
        try {
            await this.db.connect();
            
            // Test 1: Emergency Creation
            const emergency = await this.testEmergencyCreation(testData);
            Assertions.assertNotNullOrUndefined(emergency, 'Emergency Creation');
            
            // Test 2: Driver Assignment
            const driverAssignment = await this.testDriverAssignment(emergency.id);
            console.log('Driver Assignment Result:', driverAssignment);
            
            // Test 3: Payment Approval
            const approval = await this.testPaymentApproval(emergency.id, testData.admin_id);
            console.log('Payment Approval Result:', approval);
            
            // Test 4: Emergency Sync
            const sync = await this.testEmergencySync(emergency.id);
            console.log('Emergency Sync Result:', sync);
            
            // Test 5: Emergency Notifications
            const notifications = await this.testEmergencyNotifications(emergency.id);
            console.log('Emergency Notifications Result:', notifications);
            
            // Test 6: Ambulance Release
            const release = await this.testAmbulanceRelease(emergency.id);
            console.log('Ambulance Release Result:', release);
            
            console.log('\n✅ Full Emergency Flow: SUCCESS');
            return {
                success: true,
                emergency,
                driverAssignment,
                approval,
                sync,
                notifications,
                release
            };
            
        } catch (error) {
            console.log('\n❌ Full Emergency Flow: FAILED');
            console.log('Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        } finally {
            await this.db.cleanup();
        }
    }

    async runEmergencyFunctionTests() {
        console.log('🧪 Running Emergency Function Tests...\n');
        
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
            }
        ];

        let passedTests = 0;
        let totalTests = testCases.length;

        for (const testCase of testCases) {
            try {
                console.log(`\n--- Test: ${testCase.name} ---\n`);
                
                const result = await this.testEmergencyCreation(testCase.data);
                
                if (testCase.name.includes('Invalid')) {
                    Assertions.assertThrows(
                        () => this.testEmergencyCreation(testCase.data),
                        `Emergency Creation - ${testCase.name}`
                    );
                    passedTests++;
                } else {
                    Assertions.assertNotNullOrUndefined(result, `Emergency Creation - ${testCase.name}`);
                    Assertions.assertUUID(result.id, `Emergency Creation - ${testCase.name}`);
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

    async runPaymentFunctionTests() {
        console.log('💰 Running Payment Function Tests...\n');
        
        const testEmergencyId = 'test-emergency-uuid';
        const testAdminId = 'test-admin-uuid';
        
        const paymentTests = [
            {
                name: 'Payment Approval Valid',
                test: () => this.testPaymentApproval(testEmergencyId, testAdminId)
            },
            {
                name: 'Payment Approval Invalid Emergency',
                test: () => this.testPaymentApproval('invalid-emergency-uuid', testAdminId),
                shouldThrow: true
            },
            {
                name: 'Payment Approval Invalid Admin',
                test: () => this.testPaymentApproval(testEmergencyId, 'invalid-admin-uuid'),
                shouldThrow: true
            },
            {
                name: 'Payment Decline Valid',
                test: () => this.testPaymentDecline(testEmergencyId, testAdminId, 'Test reason')
            },
            {
                name: 'Payment Decline Invalid Emergency',
                test: () => this.testPaymentDecline('invalid-emergency-uuid', testAdminId, 'Test reason'),
                shouldThrow: true
            },
            {
                name: 'Payment Decline Invalid Admin',
                test: () => this.testPaymentDecline(testEmergencyId, 'invalid-admin-uuid', 'Test reason'),
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
                        `Payment Function - ${paymentTest.name}`
                    );
                } else {
                    await paymentTest.test();
                    Assertions.assertSuccess(
                        await paymentTest.test(),
                        `Payment Function - ${paymentTest.name}`
                    );
                }
                
                passedTests++;
                
            } catch (error) {
                console.log(`❌ Test: ${paymentTest.name} FAILED ---\n`);
                console.log('Error:', error.message);
            }
        }

        console.log(`\n📊 Payment Function Tests Results: ${passedTests}/${totalTests} passed`);
        return { passedTests, totalTests };
    }

    async runTriggerTests() {
        console.log('🔧 Running Trigger Tests...\n');
        
        const testEmergencyId = 'test-emergency-uuid';
        
        const triggerTests = [
            {
                name: 'Driver Assignment Trigger',
                test: () => this.testDriverAssignment(testEmergencyId)
            },
            {
                name: 'Emergency Sync Trigger',
                test: () => this.testEmergencySync(testEmergencyId)
            },
            {
                name: 'Emergency Notifications Trigger',
                test: () => this.testEmergencyNotifications(testEmergencyId)
            },
            {
                name: 'Ambulance Release Trigger',
                test: () => this.testAmbulanceRelease(testEmergencyId)
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

    async runAllTests() {
        console.log('🚀 Running All Emergency Flow Tests...\n');
        
        try {
            await this.db.connect();
            
            const emergencyFunctionResults = await this.runEmergencyFunctionTests();
            const paymentFunctionResults = await this.runPaymentFunctionTests();
            const triggerResults = await this.runTriggerTests();
            
            const totalPassed = emergencyFunctionResults.passedTests + 
                             paymentFunctionResults.passedTests + 
                             triggerResults.passedTests;
            const totalTests = emergencyFunctionResults.totalTests + 
                           paymentFunctionResults.totalTests + 
                           triggerResults.totalTests;
            
            console.log(`\n📊 FINAL RESULTS: ${totalPassed}/${totalTests} tests passed`);
            console.log(`📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
            
            return {
                emergencyFunctions: emergencyFunctionResults,
                paymentFunctions: paymentFunctionResults,
                triggers: triggerResults,
                total: { passed: totalPassed, total: totalTests }
            };
            
        } catch (error) {
            console.log('\n❌ All Emergency Flow Tests: FAILED');
            console.log('Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        } finally {
            await this.db.cleanup();
        }
    }
}

module.exports = EmergencyFlowComponent;
