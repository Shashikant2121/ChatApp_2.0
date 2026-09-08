import express from "express";

import {
  createConversation,
  getConversations,
  getConversationByUser,
} from "../controllers/conversationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:userId", getConversationByUser);

export default router;
