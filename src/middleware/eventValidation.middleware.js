// src/middleware/eventValidation.middleware.js

const VALID_EVENT_TYPES = [
  "engagement", "impression", "follow", "share", "comment", "save", "click"
];

const VALID_PLATFORMS = [
  "twitter", "instagram", "tiktok", "youtube", "facebook", "threads"
];

const VALID_CONTENT_TYPES = [
  "post", "video", "profile", "story", "reel", "short"
];

const VALID_SOURCES = ["api", "scraper", "manual", "webhook"];

// Validate single event
exports.validateEvent = (req, res, next) => {
  try {
    const event = req.body;
    
    // Required top-level fields
    if (!event.type) {
      return res.status(400).json({
        success: false,
        message: "Event type is required",
        field: "type"
      });
    }
    
    if (!VALID_EVENT_TYPES.includes(event.type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
        field: "type"
      });
    }
    
    if (!event.platform) {
      return res.status(400).json({
        success: false,
        message: "Platform is required",
        field: "platform"
      });
    }
    
    if (!VALID_PLATFORMS.includes(event.platform)) {
      return res.status(400).json({
        success: false,
        message: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}`,
        field: "platform"
      });
    }
    
    // Validate actor
    if (!event.actor) {
      return res.status(400).json({
        success: false,
        message: "Actor is required",
        field: "actor"
      });
    }
    
    if (!event.actor.platform_user_id || !event.actor.username) {
      return res.status(400).json({
        success: false,
        message: "Actor must have platform_user_id and username",
        field: "actor"
      });
    }
    
    // Validate subject
    if (!event.subject) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
        field: "subject"
      });
    }
    
    if (!event.subject.content_id || !event.subject.content_type || !event.subject.owner_platform_id) {
      return res.status(400).json({
        success: false,
        message: "Subject must have content_id, content_type, and owner_platform_id",
        field: "subject"
      });
    }
    
    if (!VALID_CONTENT_TYPES.includes(event.subject.content_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid content_type. Must be one of: ${VALID_CONTENT_TYPES.join(", ")}`,
        field: "subject.content_type"
      });
    }
    
    // Validate metrics
    if (!event.metrics) {
      return res.status(400).json({
        success: false,
        message: "Metrics is required",
        field: "metrics"
      });
    }
    
    if (typeof event.metrics.count !== "number") {
      return res.status(400).json({
        success: false,
        message: "Metrics.count must be a number",
        field: "metrics.count"
      });
    }
    
    // Validate metadata
    if (!event.metadata) {
      return res.status(400).json({
        success: false,
        message: "Metadata is required",
        field: "metadata"
      });
    }
    
    if (!event.metadata.source) {
      return res.status(400).json({
        success: false,
        message: "Metadata.source is required",
        field: "metadata.source"
      });
    }
    
    if (!VALID_SOURCES.includes(event.metadata.source)) {
      return res.status(400).json({
        success: false,
        message: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}`,
        field: "metadata.source"
      });
    }
    
    // Validate timestamp
    if (!event.timestamp) {
      return res.status(400).json({
        success: false,
        message: "Timestamp is required",
        field: "timestamp"
      });
    }
    
    // Try to parse timestamp
    const timestamp = new Date(event.timestamp);
    if (isNaN(timestamp.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid timestamp format. Must be ISO8601",
        field: "timestamp"
      });
    }
    
    // Ensure timestamp is not in the future
    if (timestamp > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Timestamp cannot be in the future",
        field: "timestamp"
      });
    }
    
    next();
    
  } catch (error) {
    console.error("Validation error:", error);
    res.status(400).json({
      success: false,
      message: "Event validation failed",
      error: error.message
    });
  }
};

// Validate batch events
exports.validateBatchEvents = (req, res, next) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: "Events must be an array"
      });
    }
    
    if (events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Events array cannot be empty"
      });
    }
    
    if (events.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Cannot process more than 1000 events at once"
      });
    }
    
    // Validate each event in the batch
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Quick validation of required fields
      if (!event.type || !event.platform || !event.actor || !event.subject || !event.metrics || !event.metadata || !event.timestamp) {
        return res.status(400).json({
          success: false,
          message: `Event at index ${i} is missing required fields`,
          index: i
        });
      }
    }
    
    next();
    
  } catch (error) {
    console.error("Batch validation error:", error);
    res.status(400).json({
      success: false,
      message: "Batch validation failed",
      error: error.message
    });
  }
};