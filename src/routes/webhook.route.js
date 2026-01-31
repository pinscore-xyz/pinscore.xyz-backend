// src/routes/webhook.route.js
const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");
const authenticateToken = require("../middleware/authToken.middleware");

// YouTube webhooks
router.get("/youtube", webhookController.handleYouTubeWebhook);
router.post("/youtube", webhookController.handleYouTubeWebhook);

// Instagram webhooks
router.get("/instagram", webhookController.handleInstagramWebhook);
router.post("/instagram", webhookController.handleInstagramWebhook);

// Twitter webhooks
router.get("/twitter", webhookController.handleTwitterWebhook);
router.post("/twitter", webhookController.handleTwitterWebhook);

// Get webhook statistics
router.get("/stats", authenticateToken, webhookController.getWebhookStats);

module.exports = router;