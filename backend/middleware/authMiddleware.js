import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    // Token nahi mila
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // JWT verify
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error("JWT Verify Error:", jwtError.message);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // User ID check
    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // User database se find karo
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Request mein user attach karo
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication server error",
    });
  }
};

export default authMiddleware;
