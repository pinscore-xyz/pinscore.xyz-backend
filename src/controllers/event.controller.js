// src/controllers/event.controller.js
const Event = require("../schema/event.schema");
const User = require("../schema/user.schema");

// Ingest Single Event
exports.ingestEvent = async (req, res) => {
  try {
    const eventData = req.body;
    
    // Validate required fields
    const requiredFields = ["type", "platform", "actor", "subject", "metrics", "metadata", "timestamp"];
    const missingFields = requiredFields.filter(field => !eventData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }
    
    // Optional: Link to Pinscore user if owner exists
    if (eventData.subject?.owner_platform_id) {
      const user = await User.findOne({
        [`${eventData.platform}.id`]: eventData.subject.owner_platform_id
      });
      
      if (user) {
        eventData.pinscore_user_id = user._id;
      }
    }
    
    // Create event using static method
    const event = await Event.createEvent(eventData);
    
    res.status(201).json({
      success: true,
      message: "Event ingested successfully",
      data: {
        event_id: event.id,
        ingested_at: event.ingested_at
      }
    });
    
  } catch (error) {
    console.error("Event ingestion error:", error);
    
    if (error.message.includes("immutable")) {
      return res.status(403).json({
        success: false,
        message: "Events are immutable and cannot be modified"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to ingest event",
      error: error.message
    });
  }
};

// Batch Ingest Events
exports.batchIngestEvents = async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Events array is required and must not be empty"
      });
    }
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (const eventData of events) {
      try {
        // Optional: Link to Pinscore user
        if (eventData.subject?.owner_platform_id) {
          const user = await User.findOne({
            [`${eventData.platform}.id`]: eventData.subject.owner_platform_id
          });
          
          if (user) {
            eventData.pinscore_user_id = user._id;
          }
        }
        
        const event = await Event.createEvent(eventData);
        results.successful.push(event.id);
      } catch (error) {
        results.failed.push({
          event: eventData,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Ingested ${results.successful.length} events`,
      data: results
    });
    
  } catch (error) {
    console.error("Batch ingestion error:", error);
    res.status(500).json({
      success: false,
      message: "Batch ingestion failed",
      error: error.message
    });
  }
};

// Query Events by Platform
exports.getEventsByPlatform = async (req, res) => {
  try {
    const { platform } = req.params;
    const { startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const query = { platform };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Event.countDocuments(query);
    
    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query events",
      error: error.message
    });
  }
};

// Query Events by User's Content
exports.getEventsByUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { platform, type, startDate, endDate, limit = 100 } = req.query;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const query = {
      pinscore_user_id: userId
    };
    
    if (platform) query.platform = platform;
    if (type) query.type = type;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: events
    });
    
  } catch (error) {
    console.error("User events query error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query user events",
      error: error.message
    });
  }
};

// Get Event Analytics Summary
exports.getEventsSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;
    
    const matchStage = {
      pinscore_user_id: mongoose.Types.ObjectId(userId)
    };
    
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }
    
    const summary = await Event.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            platform: "$platform",
            type: "$type"
          },
          count: { $sum: "$metrics.count" },
          events: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.platform",
          types: {
            $push: {
              type: "$_id.type",
              count: "$count",
              events: "$events"
            }
          },
          totalEvents: { $sum: "$events" }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate summary",
      error: error.message
    });
  }
};

// Get Single Event by ID
exports.getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findOne({ id: eventId });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    res.json({
      success: true,
      data: event
    });
    
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve event",
      error: error.message
    });
  }
};