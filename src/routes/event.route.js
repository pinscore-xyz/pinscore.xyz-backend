// src/routes/event.route.js
const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const authenticateToken = require("../middleware/authToken.middleware");
const eventValidation = require("../middleware/eventValidation.middleware");

// Public event ingestion (for webhooks, scrapers)
router.post(
  "/ingest",
  eventValidation.validateEvent,
  eventController.ingestEvent
);

// Batch event ingestion
router.post(
  "/ingest/batch",
  eventValidation.validateBatchEvents,
  eventController.batchIngestEvents
);

// Protected routes (require authentication)
router.get(
  "/user/events",
  authenticateToken,
  eventController.getEventsByUser
);

router.get(
  "/user/summary",
  authenticateToken,
  eventController.getEventsSummary
);

router.get(
  "/platform/:platform",
  authenticateToken,
  eventController.getEventsByPlatform
);

router.get(
  "/:eventId",
  authenticateToken,
  eventController.getEventById
);

module.exports = router;