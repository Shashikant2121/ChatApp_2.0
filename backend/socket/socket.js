import { Server } from "socket.io";
import User from "../models/User.js";

let io;

// Track connected sockets for every user
const connectedUsers = new Map();

// ==============================
// INITIALIZE SOCKET
// ==============================

export const initializeSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://chat-app-2-0.vercel.app",
    process.env.CLIENT_URL,
  ].filter(Boolean);

  console.log("Socket.IO allowed origins:", allowedOrigins);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests without origin
        // Example: server-to-server requests
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        console.log("❌ Socket.IO CORS blocked:", origin);

        return callback(new Error("Not allowed by Socket.IO CORS"), false);
      },
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // ==============================
    // JOIN USER ROOM
    // ==============================

    socket.on("join", async (userId) => {
      try {
        if (!userId) {
          return;
        }

        const userRoom = userId.toString();

        socket.join(userRoom);

        socket.userId = userRoom;

        // Get existing sockets
        const userSockets = connectedUsers.get(userRoom) || new Set();

        userSockets.add(socket.id);

        connectedUsers.set(userRoom, userSockets);

        // User is online
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: null,
        });

        console.log(`👤 User ${userId} joined room`);
        console.log(`Active sockets for ${userId}:`, userSockets.size);

        // Broadcast online status
        io.emit("userStatusChanged", {
          userId: userRoom,
          isOnline: true,
          lastSeen: null,
        });
      } catch (error) {
        console.error("❌ Socket Join Error:", error);
      }
    });

    // ==============================
    // TYPING
    // ==============================

    socket.on("typing", ({ receiverId, senderId }) => {
      if (!receiverId || !senderId) {
        return;
      }

      io.to(receiverId.toString()).emit("userTyping", {
        senderId: senderId.toString(),
      });
    });

    // ==============================
    // STOP TYPING
    // ==============================

    socket.on("stopTyping", ({ receiverId, senderId }) => {
      if (!receiverId || !senderId) {
        return;
      }

      io.to(receiverId.toString()).emit("userStoppedTyping", {
        senderId: senderId.toString(),
      });
    });

    // ==============================
    // MESSAGES READ
    // ==============================

    socket.on("messagesRead", ({ senderId, conversationId }) => {
      if (!senderId || !conversationId) {
        return;
      }

      io.to(senderId.toString()).emit("messagesRead", {
        conversationId: conversationId.toString(),
      });
    });

    // ==============================
    // DISCONNECT
    // ==============================

    socket.on("disconnect", async () => {
      try {
        console.log("🔴 User disconnected:", socket.id);

        const userId = socket.userId;

        if (!userId) {
          return;
        }

        const userSockets = connectedUsers.get(userId);

        if (userSockets) {
          userSockets.delete(socket.id);

          // Remove user from map
          // only when no sockets remain
          if (userSockets.size === 0) {
            connectedUsers.delete(userId);

            const lastSeen = new Date();

            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen,
            });

            console.log(`👤 User ${userId} is offline`);

            // Broadcast offline status
            io.emit("userStatusChanged", {
              userId,
              isOnline: false,
              lastSeen,
            });
          } else {
            console.log(
              `User ${userId} still has ${userSockets.size} active socket(s)`,
            );
          }
        }
      } catch (error) {
        console.error("❌ Socket Disconnect Error:", error);
      }
    });
  });

  return io;
};

// ==============================
// GET SOCKET.IO INSTANCE
// ==============================

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  return io;
};
