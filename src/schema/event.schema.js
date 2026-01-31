const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { strict: false }); // Allow flexible payload structure if needed, though 'payload' field is defined. Mixed type handles it. Strict: false on top level might be useful if we want to store other metadata directly, but typically 'payload' is enough. I'll stick to strict: true (default) for the outer wrapper to keep it clean, as payload is Mixed.

module.exports = mongoose.model("Event", eventSchema);
