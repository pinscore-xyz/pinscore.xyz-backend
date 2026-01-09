// src/routes/social.route.js (Updated with Analytics)
const express = require("express");
const passport = require("passport");
const authenticateToken = require("../middleware/authToken.middleware");
const { 
    getYoutubeAnalytics, 
    disconnectYoutube,
    getInstagramAnalytics,
    getTwitterAnalytics,
    getAggregatedAnalytics
} = require("../controllers/social.controller");

const router = express.Router();

// ============================================
// YOUTUBE OAUTH & ANALYTICS
// ============================================

router.get(
    "/youtube/auth",
    passport.authenticate("youtube-oauth2", {
        scope: [
            "https://www.googleapis.com/auth/youtube.readonly",
            "profile",
            "email",
        ],
    })
);

router.get(
    "/youtube/callback",
    passport.authenticate("youtube-oauth2", { failureRedirect: "/login" }),
    (req, res) => {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/dashboard/connected-accounts?success=youtube`);
    }
  "/youtube/auth",
  passport.authenticate("youtube-oauth2", {
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "profile",
      "email",
    ],
    session: false,
  })
);

router.get(
  "/youtube/callback",
  passport.authenticate("youtube-oauth2", { failureRedirect: "/login", session: false }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/connected-accounts?success=youtube`);
  }
);

router.put("/youtube/disconnect", authenticateToken, disconnectYoutube);
router.get("/analytics/youtube", authenticateToken, getYoutubeAnalytics);

// ============================================
// INSTAGRAM ANALYTICS (Template)
// ============================================

router.get("/analytics/instagram", authenticateToken, getInstagramAnalytics);

// ============================================
// TWITTER/X ANALYTICS (Template)
// ============================================

router.get("/analytics/twitter", authenticateToken, getTwitterAnalytics);

// ============================================
// AGGREGATED ANALYTICS (From Events)
// ============================================

router.get("/analytics/aggregated", authenticateToken, getAggregatedAnalytics);

// ============================================
// PLATFORM CONNECTION STATUS
// ============================================

router.get("/platforms/status", authenticateToken, async (req, res) => {
    try {
        const User = require("../schema/user.schema");
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        const status = {
            youtube: {
                connected: !!(user.youtube && user.youtube.accessToken),
                channelId: user.youtube?.channelId || null,
                channelName: user.youtube?.channelName || null,
                connectedAt: user.youtube?.connectedAt || null
            },
            instagram: {
                connected: !!(user.instagram && user.instagram.accessToken),
                username: user.instagram?.username || null,
                connectedAt: user.instagram?.connectedAt || null
            },
            twitter: {
                connected: !!(user.twitter && user.twitter.accessToken),
                username: user.twitter?.username || null,
                connectedAt: user.twitter?.connectedAt || null
            },
            facebook: {
                connected: !!(user.facebook && user.facebook.accessToken),
                username: user.facebook?.username || null,
                connectedAt: user.facebook?.connectedAt || null
            },
            tiktok: {
                connected: !!(user.tiktok && user.tiktok.accessToken),
                username: user.tiktok?.username || null,
                connectedAt: user.tiktok?.connectedAt || null
            },
            threads: {
                connected: !!(user.threads && user.threads.accessToken),
                username: user.threads?.username || null,
                connectedAt: user.threads?.connectedAt || null
            }
        };

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error("Error fetching platform status:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to fetch platform status",
            error: error.message 
        });
    }
});

module.exports = router;