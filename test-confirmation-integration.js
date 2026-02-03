const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:5000/api/events';
const API_INGEST = 'http://127.0.0.1:5000/api/events/ingest';
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const token = jwt.sign({ sub: 'test-user', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
const authHeader = { headers: { Authorization: `Bearer ${token}` } };

const runTests = async () => {
    console.log("Running Confirmation Endpoint Tests...");

    // Setup: Ingest 3 events
    console.log("Setup: Ingesting events...");
    const eventIds = [];
    const { v4: uuidv4 } = require('uuid');

    for (let i = 0; i < 3; i++) {
        const payload = {
            event_id: uuidv4(),
            event_type: 'click',
            actor_id: 'tester',
            timestamp: Date.now() + i * 1000, // Staggered timestamps
            metadata: { index: i }
        };
        try {
            await axios.post(API_INGEST, payload, authHeader);
            eventIds.push(payload.event_id);
            console.log(`  Ingested ${payload.event_id}`);
        } catch (e) {
            console.error("Setup failed:", e.message);
            process.exit(1);
        }
    }

    // Test 1: GET /api/events (List)
    try {
        console.log("\nTest 1: List Events (GET /api/events)");
        const res = await axios.get(`${API_BASE}?limit=2&page=1`, authHeader);

        if (res.status === 200 && res.data.success) {
            console.log("✅ PASSED: Status 200");

            const events = res.data.data;
            if (Array.isArray(events) && events.length === 2) {
                console.log("✅ PASSED: Pagination limit respected (got 2 events)");
            } else {
                console.error(`❌ FAILED: Expected 2 events, got ${events.length}`);
            }

            // Verify Ordering (DESC)
            const t1 = new Date(events[0].timestamp).getTime();
            const t2 = new Date(events[1].timestamp).getTime();
            if (t1 >= t2) {
                console.log("✅ PASSED: Ordering is DESC");
            } else {
                console.error("❌ FAILED: Ordering is NOT DESC");
            }
        } else {
            console.error("❌ FAILED: Invalid response format");
        }
    } catch (e) {
        console.error("❌ FAILED Test 1:", e.message);
    }

    // Test 2: GET /api/events/:id (Single)
    try {
        const targetId = eventIds[0];
        console.log(`\nTest 2: Get Single Event (GET /api/events/${targetId})`);
        const res = await axios.get(`${API_BASE}/${targetId}`, authHeader);

        if (res.status === 200 && res.data.success) {
            const event = res.data.data;
            if (event.event_id === targetId) {
                console.log("✅ PASSED: Correct event returned");
            } else {
                console.error("❌ FAILED: ID mismatch");
            }

            // Verify Raw Data (no mutation)
            if (event.metadata && typeof event.metadata.index === 'number') {
                console.log("✅ PASSED: Metadata intact");
            } else {
                console.error("❌ FAILED: Metadata missing or mutated");
            }
        }
    } catch (e) {
        console.error("❌ FAILED Test 2:", e.message);
    }

    // Test 3: Auth Failure
    try {
        console.log("\nTest 3: Auth Failure");
        await axios.get(API_BASE); // No token
        console.error("❌ FAILED: Should have rejected unauthenticated request");
    } catch (e) {
        if (e.response && e.response.status === 401) {
            console.log("✅ PASSED: 401 Unauthorized received");
        } else {
            console.error("❌ FAILED: Unexpected error", e.message);
        }
    }

    console.log("\n🎉 ALL CONFIRMATION TESTS COMPLETED");
};

runTests();
