/**
 * Canonical Ingestion Model
 * 
 * Contract:
 * - Immutable / Append-only: No updates allowed.
 * - Timestamps: 'ingested_at' tracks insertion time. 'updatedAt' is disabled.
 * - Canonical Fields Only: Strictly adheres to the defined schema.
 */

const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
    event_id: {
        type: String,
        required: true,
        unique: true,
        immutable: true
    },
    event_type: {
        type: String,
        required: true,
        immutable: true
    },
    platform: {
        type: String,
        required: true,
        immutable: true
    },
    actor_id: {
        type: String,
        required: true,
        immutable: true
    },
    // The timestamp when the event occurred (client-side or source time)
    timestamp: {
        type: Date,
        required: true,
        immutable: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        immutable: true
    }
}, {
    timestamps: { 
        createdAt: "ingested_at", 
        updatedAt: false 
    },
    versionKey: false
});

module.exports = mongoose.model("Event", EventSchema);