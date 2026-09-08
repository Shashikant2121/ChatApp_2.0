import mongoose from "mongoose";

import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

// ==========================================
// CREATE / GET CONVERSATION
// ==========================================

export const createConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.body;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Prevent self conversation
    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot create conversation with yourself",
      });
    }

    // Check user exists
    const otherUser = await User.findById(userId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: {
        $all: [currentUserId, userId],
      },
    })
      .populate("participants", "name email profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: [
          {
            path: "sender",
            select: "name email profilePicture",
          },
          {
            path: "receiver",
            select: "name email profilePicture",
          },
        ],
      });

    // Create conversation if not exists
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId],
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "name email profilePicture isOnline lastSeen")
        .populate({
          path: "lastMessage",
          populate: [
            {
              path: "sender",
              select: "name email profilePicture",
            },
            {
              path: "receiver",
              select: "name email profilePicture",
            },
          ],
        });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Create Conversation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// GET ALL CONVERSATIONS
// ==========================================

export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate("participants", "name email profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: [
          {
            path: "sender",
            select: "name email profilePicture",
          },
          {
            path: "receiver",
            select: "name email profilePicture",
          },
        ],
      })
      .sort({
        updatedAt: -1,
      });

    const conversationsWithUnreadCount = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          receiver: currentUserId,
          isRead: false,
        });

        return {
          ...conversation.toObject(),
          unreadCount,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      conversations: conversationsWithUnreadCount,
    });
  } catch (error) {
    console.error("Get Conversations Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// GET CONVERSATION BY USER
// ==========================================

export const getConversationByUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Find conversation
    const conversation = await Conversation.findOne({
      participants: {
        $all: [currentUserId, userId],
      },
    })
      .populate("participants", "name email profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: [
          {
            path: "sender",
            select: "name email profilePicture",
          },
          {
            path: "receiver",
            select: "name email profilePicture",
          },
        ],
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Get Conversation By User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
