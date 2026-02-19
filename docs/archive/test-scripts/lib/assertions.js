/**
 * Shared Test Assertions
 * Standardized validation and error reporting
 */

class Assertions {
    static assertSuccess(result, testName) {
        if (result.error) {
            throw new Error(`${testName} failed: ${result.error.message}`);
        }
        console.log(`✅ ${testName}: Success`);
    }

    static assertEqual(actual, expected, testName) {
        if (actual !== expected) {
            throw new Error(`${testName} failed: Expected ${expected}, got ${actual}`);
        }
        console.log(`✅ ${testName}: Passed`);
    }

    static assertExists(data, testName) {
        if (!data || (Array.isArray(data) && data.length === 0)) {
            throw new Error(`${testName} failed: Data not found`);
        }
        console.log(`✅ ${testName}: Data exists`);
    }

    static assertNoError(operation, testName) {
        const { error } = operation;
        if (error) {
            throw new Error(`${testName} failed: ${error.message}`);
        }
        console.log(`✅ ${testName}: No error`);
    }

    static assertUUID(uuid, testName) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(uuid)) {
            throw new Error(`${testName} failed: Invalid UUID format: ${uuid}`);
        }
        console.log(`✅ ${testName}: Valid UUID`);
    }

    static assertJSON(data, testName) {
        try {
            JSON.parse(JSON.stringify(data));
        } catch (error) {
            throw new Error(`${testName} failed: Invalid JSON: ${error.message}`);
        }
        console.log(`✅ ${testName}: Valid JSON`);
    }

    static assertArray(data, testName) {
        if (!Array.isArray(data)) {
            throw new Error(`${testName} failed: Expected array, got ${typeof data}`);
        }
        console.log(`✅ ${testName}: Valid array`);
    }

    static assertObject(data, testName) {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            throw new Error(`${testName} failed: Expected object, got ${typeof data}`);
        }
        console.log(`✅ ${testName}: Valid object`);
    }

    static assertString(data, testName) {
        if (typeof data !== 'string') {
            throw new Error(`${testName} failed: Expected string, got ${typeof data}`);
        }
        console.log(`✅ ${testName}: Valid string`);
    }

    static assertNumber(data, testName) {
        if (typeof data !== 'number' || isNaN(data)) {
            throw new Error(`${testName} failed: Expected number, got ${typeof data}`);
        }
        console.log(`✅ ${testName}: Valid number`);
    }

    static assertBoolean(data, testName) {
        if (typeof data !== 'boolean') {
            throw new Error(`${testName} failed: Expected boolean, got ${typeof data}`);
        }
        console.log(`✅ ${testName}: Valid boolean`);
    }

    static assertGreaterThan(actual, expected, testName) {
        if (actual <= expected) {
            throw new Error(`${testName} failed: Expected ${actual} > ${expected}`);
        }
        console.log(`✅ ${testName}: ${actual} > ${expected}`);
    }

    static assertLessThan(actual, expected, testName) {
        if (actual >= expected) {
            throw new Error(`${testName} failed: Expected ${actual} < ${expected}`);
        }
        console.log(`✅ ${testName}: ${actual} < ${expected}`);
    }

    static assertContains(haystack, needle, testName) {
        const haystackStr = typeof haystack === 'string' ? haystack : JSON.stringify(haystack);
        const needleStr = typeof needle === 'string' ? needle : JSON.stringify(needle);
        
        if (!haystackStr.includes(needleStr)) {
            throw new Error(`${testName} failed: Expected "${needleStr}" to be in "${haystackStr}"`);
        }
        console.log(`✅ ${testName}: Contains "${needleStr}"`);
    }

    static assertNotContains(haystack, needle, testName) {
        const haystackStr = typeof haystack === 'string' ? haystack : JSON.stringify(haystack);
        const needleStr = typeof needle === 'string' ? needle : JSON.stringify(needle);
        
        if (haystackStr.includes(needleStr)) {
            throw new Error(`${testName} failed: Expected "${needleStr}" NOT to be in "${haystackStr}"`);
        }
        console.log(`✅ ${testName}: Does not contain "${needleStr}"`);
    }

    static assertLength(data, expectedLength, testName) {
        const actualLength = Array.isArray(data) ? data.length : 
                           typeof data === 'string' ? data.length :
                           typeof data === 'object' ? Object.keys(data).length :
                           0;
        
        if (actualLength !== expectedLength) {
            throw new Error(`${testName} failed: Expected length ${expectedLength}, got ${actualLength}`);
        }
        console.log(`✅ ${testName}: Length ${actualLength}`);
    }

    static assertPropertyExists(obj, property, testName) {
        if (!(property in obj)) {
            throw new Error(`${testName} failed: Property "${property}" not found in object`);
        }
        console.log(`✅ ${testName}: Property "${property}" exists`);
    }

    static assertPropertyEquals(obj, property, expectedValue, testName) {
        if (!(property in obj)) {
            throw new Error(`${testName} failed: Property "${property}" not found in object`);
        }
        
        if (obj[property] !== expectedValue) {
            throw new Error(`${testName} failed: Expected ${property} = ${expectedValue}, got ${obj[property]}`);
        }
        console.log(`✅ ${testName}: Property "${property}" = ${expectedValue}`);
    }

    static assertStatus(status, expectedStatus, testName) {
        if (status !== expectedStatus) {
            throw new Error(`${testName} failed: Expected status ${expectedStatus}, got ${status}`);
        }
        console.log(`✅ ${testName}: Status ${status}`);
    }

    static assertTimestamp(timestamp, testName) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            throw new Error(`${testName} failed: Invalid timestamp: ${timestamp}`);
        }
        console.log(`✅ ${testName}: Valid timestamp`);
    }

    static assertEmail(email, testName) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error(`${testName} failed: Invalid email format: ${email}`);
        }
        console.log(`✅ ${testName}: Valid email`);
    }

    static assertPhone(phone, testName) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(phone)) {
            throw new Error(`${testName} failed: Invalid phone format: ${phone}`);
        }
        console.log(`✅ ${testName}: Valid phone`);
    }

    static async assertAsync(operation, testName) {
        try {
            const result = await operation();
            console.log(`✅ ${testName}: Async operation completed`);
            return result;
        } catch (error) {
            throw new Error(`${testName} failed: Async operation error: ${error.message}`);
        }
    }

    static assertThrows(operation, testName) {
        try {
            operation();
            throw new Error(`${testName} failed: Expected operation to throw an error`);
        } catch (error) {
            if (error.message.includes('Expected operation to throw')) {
                throw error;
            }
            console.log(`✅ ${testName}: Operation threw error as expected`);
        }
    }

    static async assertAsyncThrows(operation, testName) {
        try {
            await operation();
            throw new Error(`${testName} failed: Expected async operation to throw an error`);
        } catch (error) {
            if (error.message.includes('Expected async operation to throw')) {
                throw error;
            }
            console.log(`✅ ${testName}: Async operation threw error as expected`);
        }
    }

    static assertInRange(value, min, max, testName) {
        if (value < min || value > max) {
            throw new Error(`${testName} failed: Expected ${value} to be in range [${min}, ${max}]`);
        }
        console.log(`✅ ${testName}: ${value} in range [${min}, ${max}]`);
    }

    static assertNotEmpty(value, testName) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            throw new Error(`${testName} failed: Expected non-empty value`);
        }
        console.log(`✅ ${testName}: Non-empty value`);
    }

    static assertNullOrUndefined(value, testName) {
        if (value !== null && value !== undefined) {
            throw new Error(`${testName} failed: Expected null or undefined, got ${value}`);
        }
        console.log(`✅ ${testName}: Null or undefined`);
    }

    static assertNotNullOrUndefined(value, testName) {
        if (value === null || value === undefined) {
            throw new Error(`${testName} failed: Expected non-null and non-undefined value`);
        }
        console.log(`✅ ${testName}: Non-null and non-undefined`);
    }

    static assertFunction(value, testName) {
        if (typeof value !== 'function') {
            throw new Error(`${testName} failed: Expected function, got ${typeof value}`);
        }
        console.log(`✅ ${testName}: Function`);
    }

    static assertDate(date, testName) {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            throw new Error(`${testName} failed: Invalid date: ${date}`);
        }
        console.log(`✅ ${testName}: Valid date`);
    }

    static assertRegexMatch(value, pattern, testName) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
            throw new Error(`${testName} failed: Expected "${value}" to match pattern "${pattern}"`);
        }
        console.log(`✅ ${testName}: Matches pattern "${pattern}"`);
    }
}

module.exports = Assertions;
