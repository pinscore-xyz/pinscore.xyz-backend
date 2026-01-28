// src/controllers/webhook.controller.js
const Event = require("../schema/event.schema");
const User = require("../schema/user.schema");

/**
 * YouTube Webhook Handler
 * Handles PubSubHubbub notifications
 */
exports.handleYouTubeWebhook = async (req, res) => {
    try {
        // YouTube sends GET request for verification
        if (req.method === "GET") {
            const challenge = req.query["hub.challenge"];
            if (challenge) {
                return res.status(200).send(challenge);
            }
        }

        // POST request contains actual notification
        const notification = req.body;
        
        // Parse YouTube notification
        // (YouTube sends Atom feed format)
        const channelId = notification.channelId;
        const videoId = notification.videoId;
        const action = notification.action; // new_video, updated_video, etc.

        // Find user by channel ID
        const user = await User.findOne({ "youtube.channelId": channelId });
        if (!user) {
            console.log(`No user found for YouTube channel: ${channelId}`);
            return res.status(200).send("OK");
        }

        // Create event based on notification
        await Event.createEvent({
            type: "impression",
            platform: "youtube",
            actor: {
                platform_user_id: channelId,
                username: user.youtube.channelName || "unknown"
            },
            subject: {
                content_id: videoId,
                content_type: "video",
                owner_platform_id: channelId
            },
            metrics: {
                count: 1
            },
            metadata: {
                source: "webhook",
                raw_event_id: videoId,
                action: action
            },
            timestamp: new Date().toISOString(),
            pinscore_user_id: user._id
        });

        res.status(200).send("OK");
    } catch (error) {
        console.error("YouTube webhook error:", error);
        res.status(500).json({ 
            success: false,
            message: "Webhook processing failed" 
        });
    }
};

/**
 * Instagram Webhook Handler
 * Handles Graph API webhooks
 */
exports.handleInstagramWebhook = async (req, res) => {
    try {
        // Instagram sends GET request for verification
        if (req.method === "GET") {
            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challenge = req.query["hub.challenge"];

            // Verify the webhook
            if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
                return res.status(200).send(challenge);
            } else {
                return res.status(403).send("Forbidden");
            }
        }

        // POST request contains actual notification
        const body = req.body;

        // Instagram sends batch updates
        if (body.object === "instagram") {
            for (const entry of body.entry) {
                const userId = entry.id;
                
                // Find user
                const user = await User.findOne({ "instagram.id": userId });
                if (!user) continue;

                // Process each change
                for (const change of entry.changes) {
                    const field = change.field;
                    const value = change.value;

                    let eventType = "engagement";
                    
                    // Map Instagram fields to event types
                    if (field === "likes") eventType = "engagement";
                    if (field === "comments") eventType = "comment";
                    if (field === "follows") eventType = "follow";

                    await Event.createEvent({
                        type: eventType,
                        platform: "instagram",
                        actor: {
                            platform_user_id: value.from?.id || "unknown",
                            username: value.from?.username || "unknown"
                        },
                        subject: {
                            content_id: value.media_id || userId,
                            content_type: value.media_type || "post",
                            owner_platform_id: userId
                        },
                        metrics: {
                            count: 1
                        },
                        metadata: {
                            source: "webhook",
                            raw_event_id: value.id
                        },
                        timestamp: new Date(value.created_time * 1000).toISOString(),
                        pinscore_user_id: user._id
                    });
                }
            }
        }

        res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
        console.error("Instagram webhook error:", error);
        res.status(500).json({ 
            success: false,
            message: "Webhook processing failed" 
        });
    }
};

/**
 * Twitter/X Webhook Handler
 * Handles Account Activity API webhooks
 */
exports.handleTwitterWebhook = async (req, res) => {
    try {
        // Twitter sends GET request for CRC (Challenge Response Check)
        if (req.method === "GET") {
            const crc_token = req.query.crc_token;
            if (crc_token) {
                const crypto = require("crypto");
                const hmac = crypto
                    .createHmac("sha256", process.env.TWITTER_CONSUMER_SECRET)
                    .update(crc_token)
                    .digest("base64");
                
                return res.status(200).json({
                    response_token: `sha256=${hmac}`
                });
            }
        }

        // POST request contains actual events
        const body = req.body;

        // Process different event types
        if (body.favorite_events) {
            for (const event of body.favorite_events) {
                const user = await User.findOne({ "twitter.id": event.favorited_status.user.id_str });
                if (!user) continue;

                await Event.createEvent({
                    type: "engagement",
                    platform: "twitter",
                    actor: {
                        platform_user_id: event.user.id_str,
                        username: event.user.screen_name
                    },
                    subject: {
                        content_id: event.favorited_status.id_str,
                        content_type: "post",
                        owner_platform_id: event.favorited_status.user.id_str
                    },
                    metrics: {
                        count: 1
                    },
                    metadata: {
                        source: "webhook",
                        raw_event_id: event.favorited_status.id_str
                    },
                    timestamp: new Date(event.created_at).toISOString(),
                    pinscore_user_id: user._id
                });
            }
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Twitter webhook error:", error);
        res.status(500).json({ 
            success: false,
            message: "Webhook processing failed" 
        });
    }
};

/**
 * TikTok Webhook Handler
 */
exports.handleTikTokWebhook = async (req, res) => {
    try {
        // TikTok webhook verification
        if (req.method === "GET") {
            // Implement TikTok's verification logic
            return res.status(200).send("OK");
        }

        const body = req.body;
        
        // Process TikTok events
        // Implementation depends on TikTok's webhook format
        
        res.status(200).send("OK");
    } catch (error) {
        console.error("TikTok webhook error:", error);
        res.status(500).json({ 
            success: false,
            message: "Webhook processing failed" 
        });
    }
};

/**
 * Generic webhook handler for testing
 */
exports.handleGenericWebhook = async (req, res) => {
    try {
        console.log("Generic webhook received:", {
            method: req.method,
            headers: req.headers,
            query: req.query,
            body: req.body
        });

        res.status(200).json({
            success: true,
            message: "Webhook received",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Generic webhook error:", error);
        res.status(500).json({ 
            success: false,
            message: "Webhook processing failed" 
        });
    }
};

/**
 * Get webhook statistics
 */
exports.getWebhookStats = async (req, res) => {
    try {
        const stats = await Event.aggregate([
            {
                $match: {
                    "metadata.source": "webhook"
                }
            },
            {
                $group: {
                    _id: {
                        platform: "$platform",
                        type: "$type"
                    },
                    count: { $sum: 1 },
                    latestEvent: { $max: "$timestamp" }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error("Webhook stats error:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch webhook stats" 
        });
    }
};