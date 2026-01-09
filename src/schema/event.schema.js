// src/schema/event.schema.js
const mongoose = require("mongoose");

// Actor Sub-Schema (Who performed the action)
const actorSchema = new mongoose.Schema({
  platform_user_id: { 
    type: String, 
    required: true,
    index: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  display_name: { 
    type: String 
  },
  avatar_url: { 
    type: String 
  }
}, { _id: false });

// Subject Sub-Schema (What the action was performed on)
const subjectSchema = new mongoose.Schema({
  content_id: { 
    type: String, 
    required: true,
    index: true 
  },
  content_type: { 
    type: String, 
    required: true,
    enum: ["post", "video", "profile", "story", "reel", "short"]
  },
  owner_platform_id: { 
    type: String, 
    required: true,
    index: true 
  }
}, { _id: false });

// Metrics Sub-Schema (Raw values only - no weights or scores)
const metricsSchema = new mongoose.Schema({
  count: { 
    type: Number, 
    required: true,
    default: 1 
  },
  duration_ms: { 
    type: Number 
  },
  value: { 
    type: Number 
  }
}, { _id: false });

// Metadata Sub-Schema (Context, not logic)
const metadataSchema = new mongoose.Schema({
  source: { 
    type: String, 
    required: true,
    enum: ["api", "scraper", "manual", "webhook"]
  },
  is_verified: { 
    type: Boolean 
  },
  raw_event_id: { 
    type: String 
  },
  user_agent: { 
    type: String 
  },
  ip_address: { 
    type: String 
  }
}, { _id: false });

// Main Event Schema (Canonical)
const eventSchema = new mongoose.Schema({
  // Event Identity
  id: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  type: { 
    type: String, 
    required: true,
    enum: [
      "engagement",    // likes, reactions
      "impression",    // views, reach
      "follow",        // follows, subscribes
      "share",         // retweets, shares
      "comment",       // comments, replies
      "save",          // bookmarks, saves
      "click"          // link clicks
    ],
    index: true
  },
  
  platform: { 
    type: String, 
    required: true,
    enum: ["twitter", "instagram", "tiktok", "youtube", "facebook", "threads"],
    index: true
  },
  
  // Sub-documents
  actor: { 
    type: actorSchema, 
    required: true 
  },
  
  subject: { 
    type: subjectSchema, 
    required: true 
  },
  
  metrics: { 
    type: metricsSchema, 
    required: true 
  },
  
  metadata: { 
    type: metadataSchema, 
    required: true 
  },
  
  // Time Fields (Critical for analytics)
  timestamp: { 
    type: Date, 
    required: true,
    index: true
  },
  
  ingested_at: { 
    type: Date, 
    required: true,
    default: Date.now,
    index: true
  },
  
  // Link to Pinscore user (optional - for attribution)
  pinscore_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  }
}, {
  timestamps: false, // We manage time fields explicitly
  collection: "events"
});

// Compound Indexes for Common Queries
eventSchema.index({ platform: 1, type: 1, timestamp: -1 });
eventSchema.index({ "subject.owner_platform_id": 1, timestamp: -1 });
eventSchema.index({ "actor.platform_user_id": 1, platform: 1 });
eventSchema.index({ pinscore_user_id: 1, timestamp: -1 });

// Immutability Enforcement
eventSchema.pre("save", function(next) {
  if (!this.isNew) {
    return next(new Error("Events are immutable. Cannot update existing events."));
  }
  next();
});

eventSchema.pre("findOneAndUpdate", function(next) {
  next(new Error("Events are immutable. Use versioning for corrections."));
});

eventSchema.pre("updateOne", function(next) {
  next(new Error("Events are immutable. Use versioning for corrections."));
});

// Static Methods
eventSchema.statics.createEvent = async function(eventData) {
  const { v4: uuidv4 } = require("uuid");
  
  const event = new this({
    id: `evt_${uuidv4()}`,
    ...eventData,
    ingested_at: new Date()
  });
  
  return await event.save();
};

eventSchema.statics.queryByPlatform = function(platform, startDate, endDate) {
  return this.find({
    platform,
    timestamp: { 
      $gte: startDate, 
      $lte: endDate 
    }
  }).sort({ timestamp: -1 });
};

eventSchema.statics.queryByUser = function(platformUserId, platform) {
  return this.find({
    "subject.owner_platform_id": platformUserId,
    platform
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model("Event", eventSchema);