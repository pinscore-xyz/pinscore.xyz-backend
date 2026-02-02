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
        const hasTypeError = res.body.errors.some(e => e.field === 'event_type' && (e.message.includes('required') || e.message.includes('expected string') || e.message.includes('one of')));
        assert(hasTypeError, `Should report missing event_type. Got: ${JSON.stringify(res.body.errors)}`);
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
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "click",
                actor_id: "user_123",
                timestamp: Date.now(),
                // metadata missing
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400");
    }

    // Test 5: Future Timestamp > 5 mins
    console.log("\nTest 5: Future Timestamp");
    {
        const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // +10 mins
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "click",
                actor_id: "user_123",
                timestamp: futureTime,
                metadata: { source: "test" }
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400 for future timestamp");
        assert(res.body.errors && JSON.stringify(res.body.errors).includes("5 minutes"), "Should mention time constraint");
    }

    // Test 6: Old Timestamp < 2020
    console.log("\nTest 6: Old Timestamp");
    {
        const oldTime = "2019-12-31T23:59:59Z";
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "click",
                actor_id: "user_123",
                timestamp: oldTime,
                metadata: { source: "test" }
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400 for old timestamp");
        assert(res.body.errors && JSON.stringify(res.body.errors).includes("2020"), "Should mention 2020 constraint");
    }

    // Test 7: Invalid Event Type
    console.log("\nTest 7: Invalid Event Type");
    {
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "badevent",
                actor_id: "user_123",
                timestamp: new Date().toISOString(),
                metadata: { source: "test" }
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400 for invalid event_type");
        assert(res.body.errors && JSON.stringify(res.body.errors).includes("expected one of"), `Should list allowed types. Got: ${JSON.stringify(res.body.errors)}`);
    }

    // Test 8: Invalid Event ID (not UUID)
    console.log("\nTest 8: Invalid Event ID");
    {
        const req = {
            body: {
                event_id: "not-a-uuid",
                event_type: "click",
                actor_id: "user_123",
                timestamp: new Date().toISOString(),
                metadata: { source: "test" }
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Should return 400 for invalid event_id");
        assert(res.body.errors && JSON.stringify(res.body.errors).includes("UUID"), "Should mention UUID");
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
