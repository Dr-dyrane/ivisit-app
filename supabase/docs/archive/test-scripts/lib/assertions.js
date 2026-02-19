class Assertions {
    static assertSuccess({ data, error }, testName) {
        if (error) {
            console.error(`❌ [${testName}] Failed:`, error.message);
            throw error;
        }
        console.log(`✅ [${testName}] Passed`);
        return data;
    }

    static assertEqual(actual, expected, testName) {
        if (actual !== expected) {
            console.error(`❌ [${testName}] Failed: Expected ${expected}, got ${actual}`);
            throw new Error(`Assertion Failed: ${actual} !== ${expected}`);
        }
        console.log(`✅ [${testName}] Passed`);
    }

    static assertUUID(val, testName) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!regex.test(val)) {
            console.error(`❌ [${testName}] Failed: ${val} is not a valid UUID`);
            throw new Error(`Invalid UUID: ${val}`);
        }
        console.log(`✅ [${testName}] Passed (Valid UUID)`);
    }
}

module.exports = Assertions;
