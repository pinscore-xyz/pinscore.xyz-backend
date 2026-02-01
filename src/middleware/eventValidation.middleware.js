const { z } = require("zod");

// Define the event schema based on the user contract
const eventSchema = z.object({
  event_id: z.union([z.string().uuid(), z.string().min(1, "event_id must be a valid string")]).describe("event_id (UUID / string)"),
  event_type: z.string({ required_error: "event_type is required", invalid_type_error: "event_type must be a string" }).min(1, "event_type cannot be empty"),
  actor_id: z.string({ required_error: "actor_id is required" }).min(1, "actor_id cannot be empty"),
  timestamp: z.union([
    z.number().int().positive("timestamp must be a positive integer"),
    z.string().datetime({ message: "timestamp must be a valid ISO 8601 string" })
  ], { required_error: "timestamp is required" }),
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