import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

import { initializeSocket } from "./socket/socket.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// Create HTTP Server
// --------------------------------------------------

const server = http.createServer(app);

// --------------------------------------------------
// Allowed Frontend Origins
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:5173",
  "https://chat-app-2-0.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

console.log("Allowed CORS Origins:", allowedOrigins);

// --------------------------------------------------
// CORS
// --------------------------------------------------

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an origin
      // Postman, server-to-server requests, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);

      return callback(new Error("Not allowed by CORS"), false);
    },

    credentials: true,
  }),
);

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(express.json());
app.use(cookieParser());

// --------------------------------------------------
// Database
// --------------------------------------------------

connectDB();

// --------------------------------------------------
// Socket.IO
// --------------------------------------------------

initializeSocket(server);

// --------------------------------------------------
// Routes
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ChatApp Backend is running 🚀",
    environment: process.env.NODE_ENV || "development",
  });
});

// --------------------------------------------------
// Root Route
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ChatApp Backend API is running 🚀",
  });
});

// --------------------------------------------------
// Error Handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// --------------------------------------------------
// Start Server
// --------------------------------------------------

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
