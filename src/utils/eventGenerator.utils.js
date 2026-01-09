// src/utils/eventGenerator.utils.js
const { v4: uuidv4 } = require("uuid");

/**
 * Generate a unique event ID
 */
exports.generateEventId = () => {
  return `evt_${uuidv4()}`;
};

/**
 * Generate current ISO8601 timestamp
 */
exports.getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Validate ISO8601 timestamp format
 */
exports.isValidTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

/**
 * Calculate time difference in milliseconds
 */
exports.calculateLatency = (eventTimestamp, ingestedAt) => {
  const event = new Date(eventTimestamp);
  const ingested = new Date(ingestedAt);
  return ingested - event;
};

/**
 * Create a basic event template
 */
exports.createEventTemplate = (type, platform) => {
  return {
    id: exports.generateEventId(),
    type,
    platform,
    timestamp: exports.getCurrentTimestamp(),
    ingested_at: exports.getCurrentTimestamp()
  };
};

/**
 * Validate event time constraints
 */
exports.validateEventTime = (timestamp) => {
  const eventDate = new Date(timestamp);
  const now = new Date();
  
  // Cannot be in the future
  if (eventDate > now) {
    return {
      valid: false,
      error: "Event timestamp cannot be in the future"
    };
  }
  
  // Cannot be older than 1 year (configurable)
  const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
  if (eventDate < oneYearAgo) {
    return {
      valid: false,
      error: "Event timestamp cannot be older than 1 year"
    };
  }
  
  return { valid: true };
};

/**
 * Batch event ID generation
 */
exports.generateBatchEventIds = (count) => {
  return Array.from({ length: count }, () => exports.generateEventId());
};

/**
 * Create error event for failed ingestions
 */
exports.createErrorEvent = (originalEvent, error) => {
  return {
    original_event: originalEvent,
    error_message: error.message,
    error_timestamp: exports.getCurrentTimestamp(),
    status: "failed"
  };
};