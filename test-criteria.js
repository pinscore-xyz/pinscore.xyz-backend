const { validateEvent } = require('./src/middleware/eventValidation.middleware');

// Mock helpers
const createMockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        res.headersSent = true; // Mark as sent
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

const assert = (condition, criteria, message) => {
    if (!condition) {
        console.error(`❌ CRITERIA FAILED: [${criteria}] - ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ CRITERIA MET: [${criteria}] - ${message}`);
    }
};

const runTests = () => {
    console.log("Running Acceptance Criteria Verification...\n");

    // Test 1: Happy Path (ISO Timestamp)
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
        assert(nextCalled, "Valid Inputs", "Accepted valid event with ISO timestamp");
    }

    // Test 2: Happy Path (Unix Timestamp)
    {
        const req = {
            body: {
                event_id: "uuid-1234",
                event_type: "impression",
                actor_id: "user_456",
                timestamp: 1698400000000, // Unix Ms
                metadata: {}
            }
        };
        const res = createMockRes();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        validateEvent(req, res, next);
        assert(nextCalled, "Contract: timestamp (unix/ISO)", "Accepted valid event with Unix timestamp");
    }

    // Test 3: Missing Required Field (event_type)
    {
        const req = {
            body: {
                event_id: "123",
                // event_type missing
                actor_id: "user_123",
                timestamp: 1698400000000,
                metadata: {}
            }
        };
        const res = createMockRes();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        validateEvent(req, res, next);
        assert(!nextCalled, "Validation before DB", "Execution stopped (next() not called)");
        assert(res.statusCode === 400, "Criteria: Missing fields -> 400", "Returned 400 Bad Request");

        // Zod v4 issue workaround: check for "expected string" or "required" or similar
        // The default error for missing key is { code: "invalid_type", expected: "string", received: "undefined" }
        // Message: "Invalid input: expected string, received undefined"
        // Also check if we can find which field
        const typeError = res.body.errors && res.body.errors.find(e => e.field === 'event_type');
        assert(!!typeError, "Criteria: Error messages clear", "Error specifically identified 'event_type' field");
    }

    // Test 4: Invalid Type (timestamp as weird string)
    {
        const req = {
            body: {
                event_id: "123",
                event_type: "click",
                actor_id: "user_123",
                timestamp: "yesterday", // Invalid
                metadata: {}
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Criteria: Invalid types -> 400", "Returned 400 for invalid timestamp string");
    }

    // Test 5: Malformed JSON/Empty Body (simulated)
    {
        const req = { body: {} };
        // In Zod schema, fields are required, so empty object fails
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Criteria: Reject malformed", "Empty body rejected");
    }

    console.log("\n🎉 ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULL");
};

runTests();
