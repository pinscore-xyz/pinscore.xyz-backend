const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_URL = 'http://127.0.0.1:5000/api/events/ingest';
// Fallback secret if .env is missing or not loaded correctly (for dev/test)
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Generate a valid token
const token = jwt.sign(
    { sub: 'test-user-id', role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const runTests = async () => {
    console.log("Running Storage Integration Tests...");
    console.log(`Target: ${API_URL}`);
    console.log(`Using Secret: ${JWT_SECRET ? '***' : 'MISSING'}`);

    const eventId = uuidv4();
    const eventPayload = {
        event_id: eventId,
        event_type: "click",
        actor_id: "test-user-id",
        timestamp: new Date().toISOString(),
        metadata: { source: "integration-test" }
    };

    // Test 1: Successful Insertion
    try {
        console.log("\nTest 1: Insert New Event");
        const res = await axios.post(API_URL, eventPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 201) {
            console.log("✅ PASSED: Event inserted (201 Created)");
            console.log("Response:", res.data);
        } else {
            console.error(`❌ FAILED: Expected 201, got ${res.status}`);
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ FAILED: Request failed");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else if (error.request) {
            console.error("No response received. Network Error?");
            console.error("Code:", error.code);
            console.error("Message:", error.message);
        } else {
            console.error("Error setting up request:", error.message);
        }
        process.exit(1);
    }

    // Test 2: Duplicate Insertion (Idempotency check / 409 Conflict)
    try {
        console.log("\nTest 2: Insert Duplicate Event");
        await axios.post(API_URL, eventPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.error("❌ FAILED: Duplicate request should have failed with 409");
        process.exit(1);
    } catch (error) {
        if (error.response && error.response.status === 409) {
            console.log("✅ PASSED: Duplicate rejected (409 Conflict)");
            console.log("Response:", error.response.data);
        } else {
            console.error("❌ FAILED: Unexpected error for duplicate");
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
            } else {
                console.error("Error:", error.message);
            }
            process.exit(1);
        }
    }

    console.log("\n🎉 ALL STORAGE TESTS PASSED");
};

runTests();
