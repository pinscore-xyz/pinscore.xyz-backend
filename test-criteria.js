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
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "view", // Changed from 'impression' to allowed type
                actor_id: "user_456",
                timestamp: Date.now(), // Current time to be safe
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
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                // event_type missing
                actor_id: "user_123",
                timestamp: Date.now(),
                metadata: {}
            }
        };
        const res = createMockRes();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        validateEvent(req, res, next);
        assert(!nextCalled, "Validation before DB", "Execution stopped (next() not called)");
        assert(res.statusCode === 400, "Criteria: Missing fields -> 400", "Returned 400 Bad Request");

        const typeError = res.body.errors && res.body.errors.find(e => e.field === 'event_type');
        assert(!!typeError, "Criteria: Error messages clear", "Error specifically identified 'event_type' field");
    }

    // Test 4: Invalid Type (timestamp as weird string)
    {
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
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

    // Test 5: Future Timestamp (Criteria Check)
    {
        const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "click",
                actor_id: "user_123",
                timestamp: futureTime,
                metadata: {}
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Criteria: Future Rejected", "Future timestamp rejected");
        assert(JSON.stringify(res.body.errors).includes("5 minutes"), "Criteria: Error Message", "Error explains 5 minute limit");
    }

    // Test 6: Invalid Event Type (Criteria Check)
    {
        const req = {
            body: {
                event_id: "123e4567-e89b-12d3-a456-426614174000",
                event_type: "badevent",
                actor_id: "user_123",
                timestamp: Date.now(),
                metadata: {}
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Criteria: Invalid Type Rejected", "Invalid event_type rejected");
        assert(JSON.stringify(res.body.errors).includes("expected one of"), "Criteria: Error Message", "Error lists allowed types");
    }

    // Test 7: Invalid ID Format (Criteria Check)
    {
        const req = {
            body: {
                event_id: "not-a-uuid",
                event_type: "click",
                actor_id: "user_123",
                timestamp: Date.now(),
                metadata: {}
            }
        };
        const res = createMockRes();
        const next = () => { };

        validateEvent(req, res, next);
        assert(res.statusCode === 400, "Criteria: Invalid ID Rejected", "Non-UUID event_id rejected");
    }

    console.log("\n🎉 ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULL");
};

runTests();
