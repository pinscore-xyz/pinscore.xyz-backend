// src/controllers/social.controller.js (Integrated with Event System)
const User = require("../schema/user.schema");
const Event = require("../schema/event.schema");
const axios = require("axios");

/**
 * Helper function to create events from YouTube analytics
 */
const createYouTubeEvents = async (user, stats, channelId) => {
    try {
        const timestamp = new Date().toISOString();
        const events = [];

        // Create impression events (views)
        if (stats.viewCount && parseInt(stats.viewCount) > 0) {
            events.push({
                type: "impression",
                platform: "youtube",
                actor: {
                    platform_user_id: "aggregate",
                    username: "youtube_viewers"
                },
                subject: {
                    content_id: channelId,
                    content_type: "profile",
                    owner_platform_id: channelId
                },
                metrics: {
                    count: parseInt(stats.viewCount)
                },
                metadata: {
                    source: "api",
                    raw_event_id: `yt_views_${Date.now()}`
                },
                timestamp: timestamp,
                pinscore_user_id: user._id
            });
        }

        // Create follow events (subscribers)
        if (stats.subscriberCount && parseInt(stats.subscriberCount) > 0) {
            events.push({
                type: "follow",
                platform: "youtube",
                actor: {
                    platform_user_id: "aggregate",
                    username: "youtube_subscribers"
                },
                subject: {
                    content_id: channelId,
                    content_type: "profile",
                    owner_platform_id: channelId
                },
                metrics: {
                    count: parseInt(stats.subscriberCount)
                },
                metadata: {
                    source: "api",
                    raw_event_id: `yt_subs_${Date.now()}`
                },
                timestamp: timestamp,
                pinscore_user_id: user._id
            });
        }

        // Create comment events
        if (stats.commentCount && parseInt(stats.commentCount) > 0) {
            events.push({
                type: "comment",
                platform: "youtube",
                actor: {
                    platform_user_id: "aggregate",
                    username: "youtube_commenters"
                },
                subject: {
                    content_id: channelId,
                    content_type: "profile",
                    owner_platform_id: channelId
                },
                metrics: {
                    count: parseInt(stats.commentCount)
                },
                metadata: {
                    source: "api",
                    raw_event_id: `yt_comments_${Date.now()}`
                },
                timestamp: timestamp,
                pinscore_user_id: user._id
            });
        }

        // Batch create events if any exist
        if (events.length > 0) {
            await Promise.all(events.map(eventData => Event.createEvent(eventData)));
            console.log(`✅ Created ${events.length} YouTube events for user ${user._id}`);
        }

        return events.length;
    } catch (error) {
        console.error("Error creating YouTube events:", error);
        // Don't fail the request if event creation fails
        return 0;
    }
};

exports.getYoutubeAnalytics = async (req, res) => {
    try {
        // Fetch full user from DB (token has only basic info)
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }
        
        if (!user.youtube || !user.youtube.accessToken) {
            return res.status(400).json({ 
                success: false,
                message: "YouTube not connected" 
            });
        }

        let accessToken = user.youtube.accessToken;
        let stats;
        let channelId = user.youtube.channelId;

        try {
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&access_token=${accessToken}`
            );
            stats = response.data.items[0].statistics;
            
            // Get channel ID if not stored
            if (!channelId) {
                channelId = response.data.items[0].id;
                user.youtube.channelId = channelId;
                await user.save();
            }
        } catch (error) {
            if (error.response?.status === 401 && user.youtube.refreshToken) {
                // Refresh access token
                const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
                    client_id: process.env.YOUTUBE_CLIENT_ID,
                    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
                    refresh_token: user.youtube.refreshToken,
                    grant_type: "refresh_token",
                });

                accessToken = tokenResponse.data.access_token;
                user.youtube.accessToken = accessToken;
                await user.save();

                // Retry fetch
                const retryResponse = await axios.get(
                    `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&access_token=${accessToken}`
                );
                stats = retryResponse.data.items[0].statistics;
                
                if (!channelId) {
                    channelId = retryResponse.data.items[0].id;
                    user.youtube.channelId = channelId;
                    await user.save();
                }
            } else {
                throw error;
            }
        }

        // Create events from analytics data (non-blocking)
        createYouTubeEvents(user, stats, channelId).catch(err => {
            console.error("Background event creation failed:", err);
        });

        // Format numbers for display
        const formatNumber = (num) => {
            const number = parseInt(num) || 0;
            if (number >= 1000000) {
                return (number / 1000000).toFixed(1) + "M";
            }
            if (number >= 1000) {
                return (number / 1000).toFixed(1) + "K";
            }
            return number.toString();
        };

        const metrics = {
            Impressions: formatNumber(stats.viewCount),
            Likes: "N/A",
            Comments: formatNumber(stats.commentCount),
            NewFollowers: formatNumber(stats.subscriberCount),
            Shares: "N/A",
            Saves: formatNumber(stats.videoCount),
        };

        const metricsRaw = {
            Impressions: parseInt(stats.viewCount) || 0,
            Likes: 0,
            Comments: parseInt(stats.commentCount) || 0,
            NewFollowers: parseInt(stats.subscriberCount) || 0,
            Shares: 0,
            Saves: parseInt(stats.videoCount) || 0,
        };

        const audience = [
            { id: 0, value: 45, label: "Male" },
            { id: 1, value: 35, label: "Female" },
            { id: 2, value: 20, label: "Other" },
        ];

        res.json({ 
            success: true,
            metrics, 
            metricsRaw, 
            audience 
        });
    } catch (error) {
        console.error("Error fetching YouTube analytics:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch YouTube analytics",
            error: error.message 
        });
    }
};

exports.disconnectYoutube = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }
        
        user.youtube = null;
        await user.save();
        
        res.json({ 
            success: true,
            message: "YouTube disconnected successfully" 
        });
    } catch (error) {
        console.error("Error disconnecting YouTube:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to disconnect YouTube",
            error: error.message 
        });
    }
};

// Instagram Analytics (Template for integration)
exports.getInstagramAnalytics = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.instagram || !user.instagram.accessToken) {
            return res.status(400).json({ 
                success: false,
                message: "Instagram not connected" 
            });
        }

        // Fetch Instagram insights
        const response = await axios.get(
            `https://graph.instagram.com/me/insights`,
            {
                params: {
                    metric: 'impressions,reach,profile_views',
                    period: 'day',
                    access_token: user.instagram.accessToken
                }
            }
        );

        const insights = response.data.data;

        // Create events for each metric
        const timestamp = new Date().toISOString();
        const events = [];

        for (const insight of insights) {
            if (insight.name === 'impressions') {
                events.push({
                    type: "impression",
                    platform: "instagram",
                    actor: {
                        platform_user_id: "aggregate",
                        username: "instagram_viewers"
                    },
                    subject: {
                        content_id: user.instagram.id,
                        content_type: "profile",
                        owner_platform_id: user.instagram.id
                    },
                    metrics: {
                        count: insight.values[0].value
                    },
                    metadata: {
                        source: "api",
                        raw_event_id: `ig_impressions_${Date.now()}`
                    },
                    timestamp: timestamp,
                    pinscore_user_id: user._id
                });
            }
        }

        // Batch create events
        if (events.length > 0) {
            await Promise.all(events.map(eventData => Event.createEvent(eventData)));
        }

        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        console.error("Error fetching Instagram analytics:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch Instagram analytics",
            error: error.message 
        });
    }
};

// Twitter/X Analytics (Template for integration)
exports.getTwitterAnalytics = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.twitter || !user.twitter.accessToken) {
            return res.status(400).json({ 
                success: false,
                message: "Twitter not connected" 
            });
        }

        // TODO: Implement Twitter API v2 integration
        // For now, return placeholder
        res.json({
            success: true,
            message: "Twitter analytics coming soon",
            data: {}
        });
    } catch (error) {
        console.error("Error fetching Twitter analytics:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch Twitter analytics",
            error: error.message 
        });
    }
};

// Get aggregated analytics from events
exports.getAggregatedAnalytics = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        const { startDate, endDate } = req.query;
        const query = { pinscore_user_id: user._id };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        // Aggregate events by platform and type
        const summary = await Event.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        platform: "$platform",
                        type: "$type"
                    },
                    total: { $sum: "$metrics.count" },
                    events: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.platform",
                    metrics: {
                        $push: {
                            type: "$_id.type",
                            total: "$total",
                            events: "$events"
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: summary,
            period: {
                start: startDate || "inception",
                end: endDate || "now"
            }
        });
    } catch (error) {
        console.error("Error fetching aggregated analytics:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch aggregated analytics",
            error: error.message 
        });
    }
};