class TestHelpers {
    async withRetry(name, fn, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries - 1) throw error;
                console.warn(`⚠️ [${name}] Attempt ${i + 1} failed, retrying...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    generateTestData(overrides = {}) {
        return {
            hospital_id: '00000000-0000-0000-0000-000000000000',
            user_id: '00000000-0000-0000-0000-000000000000',
            patient_data: { type: 'emergency' },
            ...overrides
        };
    }
}

module.exports = TestHelpers;
