const express = require("express");
const router = express.Router();
const eventsController = require("../controllers/events.controller");
const authenticateToken = require("../middleware/authToken.middleware");

// POST /api/events/ingest
router.post("/ingest", authenticateToken, eventsController.ingestEvent);

module.exports = router;
