import express from "express";

import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  uploadMessageMedia,
} from "../controllers/messageController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Upload image/file
router.post("/upload", upload.single("file"), uploadMessageMedia);

// Send message
router.post("/", sendMessage);

// Get messages
router.get("/:conversationId", getMessages);

// Mark messages as read
router.patch("/:conversationId/read", markMessagesAsRead);

export default router;
