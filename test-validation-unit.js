const { validateEvent } = require('./src/middleware/eventValidation.middleware');

// Mock helpers
const createMockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

const createMockNext = () => {
    return jest.fn(); // Using a simple function if jest is not available, but let's manual mock
};

let passed = true;

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        passed = false;
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
};

const runTests = () => {
    console.log("Running Validation Tests...");

    // Test 1: Valid Event
    console.log("\nTest 1: Valid Event");
    {
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "click",
                actor_id: "user_123",
                timestamp: "2023-10-27T10:00:00Z",
                metadata: { source: "web" }
            }
        };
        const res = createMockRes();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        validateEvent(req, res, next);
        assert(nextCalled, "Valid event should call next()");
        assert(!res.statusCode, "Valid event should not set status code");
    }

    // Test 2: Missing event_type
    console.log("\nTest 2: Missing event_type");
    {
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                // event_type missing
                actor_id: "user_123",
                timestamp: "2023-10-27T10:00:00Z",
                metadata: { source: "web" }
            }
        };
        const res = createMockRes();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        validateEvent(req, res, next);
        assert(!nextCalled, "Invalid event should NOT call next()");
        assert(res.statusCode === 400, "Should return 400 Bad Request");
        assert(res.body.message === "Event validation failed", "Should return correct error message");
        // Check strictness for required field error
        const hasTypeError = res.body.errors.some(e => e.field === 'event_type' && (e.message.includes('required') || e.message.includes('expected string')));
        assert(hasTypeError, "Should report missing event_type");
    }

    // Test 3: Invalid timestamp format
    console.log("\nTest 3: Invalid timestamp");
    {
        const req = {
            body: {
                event_id: "123",
                event_type: "click",
                actor_id: "user_123",
                timestamp: "not-a-date",
                metadata: {}
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400");
        // Zod union error often says "Invalid input" for both limbs
        // But checking if we get errors
        assert(res.body.errors && res.body.errors.length > 0, "Should return validation errors");
    }

    // Test 4: Missing metadata
    console.log("\nTest 4: Missing metadata");
    {
        const req = {
            body: {
                event_id: "123",
                event_type: "click",
                actor_id: "user_123",
                timestamp: 1234567890
                // metadata missing
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400");
    }

    if (passed) {
        console.log("\n🎉 ALL TESTS PASSED");
        process.exit(0);
    } else {
        console.log("\n💥 SOME TESTS FAILED");
        process.exit(1);
    }
};

runTests();
