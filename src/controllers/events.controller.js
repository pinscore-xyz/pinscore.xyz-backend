const Event = require("../schema/event.schema");

exports.ingestEvent = async (req, res) => {
    try {
        const payload = req.body;

        // Basic validation: Payload must be a non-empty object
        if (!payload || Object.keys(payload).length === 0) {
            return res.status(400).json({ message: "Payload cannot be empty" });
        }

        const event = new Event({
            payload: payload,
            userId: req.user.userId || req.user.id || req.user._id, // Handle different JWT payload structures
        });

        await event.save();

        return res.status(201).json({ message: "Event received" });
    } catch (error) {
        console.error("Ingestion error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
