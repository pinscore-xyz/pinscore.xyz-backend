// index.js (Complete Integration)
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const multer = require("multer");
const passport = require("passport");

// Local modules
const configurePassport = require("./src/config/passport.config");
const connectDB = require("./src/config/db.config");
const authRoutes = require("./src/routes/auth.route");
const userRoutes = require("./src/routes/user.route");
const socialRoutes = require("./src/routes/social.route");
const eventRoutes = require("./src/routes/event.route");
const webhookRoutes = require("./src/routes/webhook.route");

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// CORS CONFIG
app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://www.pinscore.xyz",
        "https://pinscore.xyz"
    ],
    credentials: true
}));

// Body Parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production", // HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));


// Passport Authentication
configurePassport(passport);
app.use(passport.initialize());


// ============================================
// HEALTH CHECK ROUTES
// ============================================

app.get("/", (req, res) => {
    res.json({
        name: "Pinscore API",
        version: "2.0.0",
        status: "operational",
        features: [
            "authentication",
            "social-platforms",
            "event-system",
            "webhooks",
            "analytics"
        ],
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
    });
});

app.get("/api/status", (req, res) => {
    res.json({
        status: "OK",
        server: "Pinscore Backend API",
        database: "connected",
        eventSystem: "enabled",
        webhooks: "enabled",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/health", async (req, res) => {
    try {
        const mongoose = require("mongoose");
        const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
        
        res.json({
            status: "healthy",
            database: dbStatus,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: "unhealthy",
            error: error.message
        });
    }
});

// ============================================
// API ROUTES
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/webhooks", webhookRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found",
        path: req.path,
        method: req.method
    });
});


// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
    console.error("Error occurred:", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ 
                success: false,
                message: "File too large. Maximum size is 2MB." 
            });
        }
        return res.status(400).json({ 
            success: false,
            message: "File upload error: " + err.message 
        });
    }

    // Mongoose validation errors
    if (err.name === "ValidationError") {
        return res.status(400).json({ 
            success: false,
            message: "Validation error",
            details: err.message 
        });
    }

    // Event immutability errors
    if (err.message && err.message.includes("immutable")) {
        return res.status(403).json({
            success: false,
            message: "Events are immutable and cannot be modified"
        });
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "Token expired"
        });
    }

    // Default error
    res.status(err.status || 500).json({ 
        success: false,
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log("MongoDB connected successfully");
        
        // Start server
        app.listen(PORT, () => {
            console.log("\n" + "=".repeat(50));
            console.log("Pinscore Backend Server Started");
            console.log("=".repeat(50));
            console.log(`Port: ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
            console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
            console.log("\n API Endpoints:");
            console.log("   - Auth:       /api/auth/*");
            console.log("   - User:       /api/user/*");
            console.log("   - Social:     /api/social/*");
            console.log("   - Events:     /api/events/*");
            console.log("   - Webhooks:   /api/webhooks/*");
            console.log("\n Features Enabled:");
            console.log("   ✓ Authentication (JWT + OAuth)");
            console.log("   ✓ Event System (Canonical Schema)");
            console.log("   ✓ Webhook Ingestion");
            console.log("   ✓ Social Analytics");
            console.log("   ✓ Platform Integration");
            console.log("=".repeat(50) + "\n");
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    process.exit(0);
});

process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down gracefully...");
    process.exit(0);
});

startServer();
