// src/schema/user.schema.js (Updated with Event Attribution)
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    trim: true
  },
  username: { 
    type: String, 
    required: false,
    unique: true, 
    sparse: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: false 
  },
  profilePicture: {
    url: { type: String, default: null },
    public_id: { type: String, default: null }
  },
  otp: String,
  otpExpiration: Date,
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  // Platform Connections (OAuth tokens + platform IDs)
  twitter: {
    id: String,
    username: String,
    accessToken: String,
    refreshToken: String,
    connectedAt: Date
  },

  instagram: {
    id: String,
    username: String,
    accessToken: String,
    connectedAt: Date
  },

  youtube: {
    channelId: String,
    channelName: String,
    username: String,
    accessToken: String,
    refreshToken: String,
    connectedAt: Date
  },

  facebook: {
    id: String,
    username: String,
    accessToken: String,
    connectedAt: Date
  },

  tiktok: {
    id: String,
    username: String,
    accessToken: String,
    refreshToken: String,
    connectedAt: Date
  },

  threads: {
    id: String,
    username: String,
    accessToken: String,
    connectedAt: Date
  },

  // Event Attribution Fields
  eventStats: {
    lastEventIngested: Date,
    totalEvents: { type: Number, default: 0 },
    platformBreakdown: {
      twitter: { type: Number, default: 0 },
      instagram: { type: Number, default: 0 },
      youtube: { type: Number, default: 0 },
      facebook: { type: Number, default: 0 },
      tiktok: { type: Number, default: 0 },
      threads: { type: Number, default: 0 }
    }
  },

  // Pinscore Metrics (Derived from events - computed separately)
  pinscore: {
    total: { type: Number, default: 0 },
    velocity: { type: Number, default: 0 },
    lastUpdated: Date
  }
});

// Indexes for event attribution
userSchema.index({ "twitter.id": 1 });
userSchema.index({ "instagram.id": 1 });
userSchema.index({ "youtube.channelId": 1 });
userSchema.index({ "facebook.id": 1 });
userSchema.index({ "tiktok.id": 1 });
userSchema.index({ "threads.id": 1 });

// Virtual to check if user has any connected platforms
userSchema.virtual("hasConnectedPlatforms").get(function() {
  return !!(
    this.twitter?.id ||
    this.instagram?.id ||
    this.youtube?.channelId ||
    this.facebook?.id ||
    this.tiktok?.id ||
    this.threads?.id
  );
});

// Method to get all connected platform IDs
userSchema.methods.getConnectedPlatformIds = function () {
  return {
    ...(this.twitter?.id && { twitter: this.twitter.id }),
    ...(this.instagram?.id && { instagram: this.instagram.id }),
    ...(this.youtube?.channelId && { youtube: this.youtube.channelId }),
    ...(this.facebook?.id && { facebook: this.facebook.id }),
    ...(this.tiktok?.id && { tiktok: this.tiktok.id }),
    ...(this.threads?.id && { threads: this.threads.id })
  };
};

// Method to update event stats (called after event ingestion)
userSchema.methods.updateEventStats = async function(platform) {
  this.eventStats.totalEvents += 1;
  this.eventStats.platformBreakdown[platform] += 1;
  this.eventStats.lastEventIngested = new Date();
  
  return await this.save();
};

module.exports = mongoose.model("User", userSchema);
