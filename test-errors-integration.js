const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_URL = 'http://127.0.0.1:5000/api/events/ingest';
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const token = jwt.sign({ sub: 'test-user', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

const assertError = (res, status, errorType) => {
    if (res.status !== status) {
        console.error(`❌ FAILED [${errorType}]: Expected ${status}, got ${res.status}`);
        return false;
    }
    if (res.data.success !== false) {
        console.error(`❌ FAILED [${errorType}]: success field is not false`);
        return false;
    }
    if (!res.data.message) {
        console.error(`❌ FAILED [${errorType}]: Missing 'message' field`);
        return false;
    }
    console.log(`✅ PASSED [${errorType}]: ${status} ${res.statusText} - ${res.data.message}`);
    return true;
};

const runTests = async () => {
    console.log("Running Error Standardization Tests...");
    let passed = true;

    // Test 1: Auth Missing Token (401)
    try {
        await axios.post(API_URL, {});
        console.error("❌ FAILED [Auth Error]: Request succeeded but should have failed");
        passed = false;
    } catch (error) {
        if (!error.response) {
            console.error("❌ FAILED [Auth Error]: No response received", error.message);
            passed = false;
        } else if (!assertError(error.response, 401, "Auth Error")) {
            console.error("DEBUG: Got response:", JSON.stringify(error.response.data));
            passed = false;
        }
    }

    // Test 2: Validation Error (400) - Empty body with valid token
    try {
        await axios.post(API_URL, {}, { headers: { Authorization: `Bearer ${token}` } });
        console.error("❌ FAILED [Validation Error]: Request succeeded but should have failed");
        passed = false;
    } catch (error) {
        if (!error.response) {
            console.error("❌ FAILED [Validation Error]: No response received", error.message);
            passed = false;
        } else if (!assertError(error.response, 400, "Validation Error")) {
            console.error("DEBUG: Got response:", JSON.stringify(error.response.data));
            passed = false;
        }
    }

    // Test 3: Conflict Error (409) - Duplicate ID
    // First insert a valid event
    // const { v4: uuidv4 } = require('uuid'); // Redundant
    const eventId = uuidv4();
    const payload = {
        event_id: eventId,
        event_type: 'click',
        actor_id: 'tester',
        timestamp: new Date().toISOString(),
        metadata: {}
    };

    try {
        await axios.post(API_URL, payload, { headers: { Authorization: `Bearer ${token}` } });
        // Now try duplicate
        await axios.post(API_URL, payload, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
        if (!error.response || !assertError(error.response, 409, "Conflict Error")) passed = false;
    }

    // Test 4: Verify JSON Structure
    console.log("\nVerifying JSON Structure...");
    // We already checked success: false and message in assertError.
    // Let's manually double check one response body to be sure.
    try {
        await axios.post(API_URL, { invalid: "payload" }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
        if (error.response) {
            console.log("Sample Validation Error Body:", JSON.stringify(error.response.data, null, 2));
            if (error.response.data.errors) {
                console.log("✅ PASSED: 'errors' array present for validation error");
            } else {
                console.error("❌ FAILED: 'errors' array missing for validation error");
                passed = false;
            }
        }
    }

    if (passed) {
        console.log("\n🎉 ALL ERROR HANDLING TESTS PASSED");
    } else {
        console.error("\n💥 SOME TESTS FAILED");
        process.exit(1);
    }
};

runTests();
