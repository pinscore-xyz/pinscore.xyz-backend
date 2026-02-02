// src/models/Event.js
/**
 * Pinscore Canonical Event Model
 * 
 * Implements the schema defined in:
 * - /schemas/event.schema.json (validation)
 * - docs/architecture/system/event-schema.md (contract)
 * 
 * Contract:
 * - Immutable: Events cannot be updated after creation
 * - Append-only: Only inserts allowed
 * - Idempotent: Duplicate event_id is ignored (not error)
 */

const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  // Required Fields
  event_id: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    index: true
  },

  event_type: {
    type: String,
    required: true,
    immutable: true,
    enum: [
      "commit.created",
      "commit.completed",
      "commit.abandoned",
      "ritual.started",
      "ritual.completed",
      "ritual.missed",
      "ritual.abandoned",
      "quest.started",
      "quest.stage_completed",
      "quest.completed",
      "quest.abandoned",
      "session.started",
      "session.ended",
      "achievement.unlocked",
      "click",
      "view",
      "identify",
      "page"
    ],
    index: true
  },

  actor_id: {
    type: String,
    required: true,
    immutable: true,
    index: true
  },

  subject_id: {
    type: String,
    required: false, // Conditionally required based on event_type
    immutable: true,
    default: null,
    index: true
  },

  context: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    immutable: true,
    default: {}
  },

  occurred_at: {
    type: Date,
    required: false, // Conditionally required
    immutable: true
  },

  received_at: {
    type: Date,
    required: true,
    immutable: true,
    index: true
  },

  schema_version: {
    type: String,
    required: true,
    immutable: true,
    default: "v1"
  }
}, {
  timestamps: false, // We manage timestamps explicitly via received_at
  versionKey: false,
  collection: "events"
});

// Compound Indexes for Common Queries
EventSchema.index({ actor_id: 1, received_at: -1 });
EventSchema.index({ event_type: 1, received_at: -1 });
EventSchema.index({ subject_id: 1, received_at: -1 });

// Immutability Enforcement
EventSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("Events are immutable. Cannot update existing events."));
  }

  // Auto-set received_at if not provided
  if (!this.received_at) {
    this.received_at = new Date();
  }

  next();
});

EventSchema.pre("findOneAndUpdate", function (next) {
  next(new Error("Events are immutable. Use new event_id for corrections."));
});

EventSchema.pre("updateOne", function (next) {
  next(new Error("Events are immutable. Use new event_id for corrections."));
});

EventSchema.pre("updateMany", function (next) {
  next(new Error("Events are immutable. Batch updates not allowed."));
});

// Static Methods
EventSchema.statics.ingest = async function (eventData) {
  // Idempotency check
  const existing = await this.findOne({ event_id: eventData.event_id });
  if (existing) {
    return {
      status: "duplicate",
      event: existing,
      received_at: existing.received_at
    };
  }

  // Create new event
  const event = new this({
    ...eventData,
    received_at: new Date()
  });

  await event.save();

  return {
    status: "accepted",
    event,
    received_at: event.received_at
  };
};

EventSchema.statics.queryByActor = function (actor_id, startDate, endDate) {
  const query = { actor_id };

  if (startDate || endDate) {
    query.received_at = {};
    if (startDate) query.received_at.$gte = startDate;
    if (endDate) query.received_at.$lte = endDate;
  }

  return this.find(query).sort({ received_at: -1 });
};

EventSchema.statics.queryByType = function (event_type, startDate, endDate) {
  const query = { event_type };

  if (startDate || endDate) {
    query.received_at = {};
    if (startDate) query.received_at.$gte = startDate;
    if (endDate) query.received_at.$lte = endDate;
  }

  return this.find(query).sort({ received_at: -1 });
};

module.exports = mongoose.model("Event", EventSchema);
