const jwt = require("jsonwebtoken");

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Map standard 'sub' claim to 'userId' for backward compatibility with existing controllers
    req.user = { 
      userId: decoded.sub || decoded.userId, // Support both new and legacy tokens during transition
      ...decoded 
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticateToken;
