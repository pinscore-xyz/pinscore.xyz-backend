const { z } = require("zod");

// Define the event schema based on the user contract
const eventSchema = z.object({
  event_id: z.string().uuid("event_id must be a valid UUID"),
  event_type: z.enum([
    'click', 'view', 'identify', 'page',
    'commit.created', 'commit.completed', 'commit.abandoned',
    'ritual.started', 'ritual.completed', 'ritual.missed', 'ritual.abandoned',
    'quest.started', 'quest.stage_completed', 'quest.completed', 'quest.abandoned',
    'session.started', 'session.ended',
    'achievement.unlocked'
  ], { errorMap: () => ({ message: "event_type must be a valid system event type" }) }),
  actor_id: z.string({ required_error: "actor_id is required" }).min(1, "actor_id cannot be empty"),
  timestamp: z.union([
    z.number().int().positive("timestamp must be a positive integer"),
    z.string().datetime({ message: "timestamp must be a valid ISO 8601 string" })
  ], { required_error: "timestamp is required" }).refine((val) => {
    const date = new Date(val);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const minDate = new Date('2020-01-01');
    return date <= fiveMinutesFromNow && date >= minDate;
  }, { message: "timestamp must be between 2020-01-01 and 5 minutes in the future" }),
  metadata: z.record(z.string(), z.any(), { required_error: "metadata is required" }).refine((val) => val !== null && typeof val === 'object' && !Array.isArray(val), {
    message: "metadata must be an object"
  })
});

// Middleware for single event validation
exports.validateEvent = (req, res, next) => {
  try {
    // strict: false in DB, so we don't strip unknown fields, just validate the contract
    // "No transformation logic" -> we validate req.body but do not replace it with parsed output
    const result = eventSchema.safeParse(req.body);

    if (!result.success) {
      // Format Zod errors into a clear message
      const errors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      return res.status(400).json({
        success: false,
        message: "Event validation failed",
        errors: errors
      });
    }

    next();
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during validation",
      error: error.message
    });
  }
};

// Middleware for batch event validation
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

    // Validate each event
    const errors = [];
    events.forEach((event, index) => {
      const result = eventSchema.safeParse(event);
      if (!result.success) {
        errors.push({
          index: index,
          errors: result.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Batch validation failed",
        errors: errors
      });
    }

    next();
  } catch (error) {
    console.error("Batch validation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during batch validation",
      error: error.message
    });
  }
};