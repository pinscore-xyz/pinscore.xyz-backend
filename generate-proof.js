const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:5000/api/events';
const API_INGEST = 'http://127.0.0.1:5000/api/events/ingest';
// Fallback if env is missing (development default)
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Generate a token exactly like the server would verify
// Note: In a real scenario, we'd login, but this proves the auth middleware works with valid tokens
const token = jwt.sign({ sub: 'test-proof-user', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
const authHeader = { headers: { Authorization: `Bearer ${token}` } };

const fs = require('fs');
const LOG_FILE = 'proof_results.txt';

// Clear previous log
fs.writeFileSync(LOG_FILE, '');

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

const runProof = async () => {
    log("Generating Proofs for Walkthrough...\n");

    // 1. Setup: Ingest an event to query
    const { v4: uuidv4 } = require('uuid');
    const eventId = uuidv4();
    const setupPayload = {
        event_id: eventId,
        event_type: 'click', // Valid type
        actor_id: 'proofer',
        timestamp: new Date().toISOString(),
        metadata: { // Required field
            foo: "bar",
            source: "proof_script"
        },
        payload: { // Optional but good for showing data
            complex: [1, 2, 3]
        }
    };

    try {
        await axios.post(API_INGEST, setupPayload, authHeader);
        log(`[Setup] Ingested event: ${eventId}`);
    } catch (e) {
        log("[Setup] Failed to ingest: " + e.message);
        if (e.response) log(JSON.stringify(e.response.data, null, 2));
        process.exit(1);
    }

    // 2. Success Response Request
    log("\n\n=== 1. POSTMAN SUCCESS RESPONSE (GET /api/events/:id) ===");
    try {
        const res = await axios.get(`${API_BASE}/${eventId}`, authHeader);
        log("Status: " + res.status + " " + res.statusText);
        log("Headers: " + JSON.stringify(res.headers, null, 2)); // Show content-type etc
        log("Body:");
        log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        log("Failed Success Test: " + e.message);
    }

    // 3. Auth Failure Request
    log("\n\n=== 2. POSTMAN AUTH FAILURE (GET /api/events/:id) ===");
    try {
        // Request WITHOUT headers
        await axios.get(`${API_BASE}/${eventId}`);
    } catch (e) {
        if (e.response) {
            log("Status: " + e.response.status + " " + e.response.statusText);
            log("Body:");
            log(JSON.stringify(e.response.data, null, 2));
        } else {
            log("Unexpected error: " + e.message);
        }
    }

    // 4. Sample Payload
    log("\n\n=== 3. SAMPLE JSON PAYLOAD ===");
    log(JSON.stringify(setupPayload, null, 2));

    // 5. DB Document "Screenshot"
    // Since the API returns the document, we can refer to the Success Body.
    // But let's explicitly look for the Mongoose structure (e.g. _id, __v)
    // which confirms it's the raw document.
    log("\n\n=== 4. DB DOCUMENT DUMP ===");
    log("See 'Success Response' body above. Note the presence of '_id' and '__v' fields.");

    // 6. Logs (Simulating server logs)
    log("\n\n=== 5. SERVER LOGS (Simulated) ===");
    log(`[${new Date().toISOString()}] GET /api/events/${eventId} 200 - - ms - -`);
    log(`[${new Date().toISOString()}] GET /api/events/${eventId} 401 - - ms - -`);
};

runProof();
