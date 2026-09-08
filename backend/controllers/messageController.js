import mongoose from "mongoose";
import path from "path";

import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

import cloudinary from "../config/cloudinary.js";

import { getIO } from "../socket/socket.js";

// =========================
// MIME TYPE HELPER
// =========================

const getMimeTypeFromExtension = (fileName) => {
  const extension = path.extname(fileName).toLowerCase();

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",

    ".pdf": "application/pdf",

    ".txt": "text/plain",

    ".zip": "application/zip",

    ".rar": "application/x-rar-compressed",
  };

  return mimeTypes[extension] || "application/octet-stream";
};

// =========================
// UPLOAD MESSAGE MEDIA
// =========================

export const uploadMessageMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file",
      });
    }

    const file = req.file;

    // Browser/Postman MIME type
    let mimeType = file.mimetype;

    // Detect MIME type from extension
    // This fixes Postman application/octet-stream issue
    const detectedMimeType = getMimeTypeFromExtension(file.originalname);

    if (mimeType === "application/octet-stream") {
      mimeType = detectedMimeType;
    }

    const isImage = mimeType.startsWith("image/");

    // =========================
    // CLOUDINARY UPLOAD
    // =========================

    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "chatapp/messages",

            resource_type: "auto",

            ...(isImage && {
              transformation: [
                {
                  width: 1200,
                  height: 1200,
                  crop: "limit",
                  quality: "auto",
                },
              ],
            }),
          },

          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        uploadStream.end(file.buffer);
      });
    };

    const result = await uploadToCloudinary();

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,

      message: "File uploaded successfully",

      media: {
        url: result.secure_url,

        fileName: file.originalname,

        fileSize: file.size,

        mimeType,

        resourceType: result.resource_type,
      },
    });
  } catch (error) {
    console.error("Upload Message Media Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
    });
  }
};

// =========================
// SEND MESSAGE
// =========================

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;

    const {
      receiverId,
      text,
      messageType = "text",
      mediaUrl = "",
      fileName = "",
      fileSize = 0,
      mimeType = "",
    } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send message to yourself",
      });
    }

    const hasText = text?.trim();

    const hasMedia = Boolean(mediaUrl);

    if (!hasText && !hasMedia) {
      return res.status(400).json({
        success: false,
        message: "Message text or media is required",
      });
    }

    if (!["text", "image", "file"].includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message type",
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    // =========================
    // FIND / CREATE CONVERSATION
    // =========================

    let conversation = await Conversation.findOne({
      participants: {
        $all: [senderId, receiverId],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    // =========================
    // CREATE MESSAGE
    // =========================

    const message = await Message.create({
      conversation: conversation._id,

      sender: senderId,

      receiver: receiverId,

      text: hasText ? text.trim() : "",

      messageType,

      mediaUrl,

      fileName,

      fileSize,

      mimeType,

      isRead: false,
    });

    // =========================
    // UPDATE LAST MESSAGE
    // =========================

    conversation.lastMessage = message._id;

    await conversation.save();

    // =========================
    // POPULATE MESSAGE
    // =========================

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email profilePicture")
      .populate("receiver", "name email profilePicture");

    // =========================
    // SOCKET EVENT
    // =========================

    const io = getIO();

    io.to(receiverId.toString()).emit("newMessage", populatedMessage);

    io.to(senderId.toString()).emit("newMessage", populatedMessage);

    // =========================
    // RESPONSE
    // =========================

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// GET MESSAGES
// =========================

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,

      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name email profilePicture")
      .populate("receiver", "name email profilePicture")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================
// MARK MESSAGES AS READ
// =========================

export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,

      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const result = await Message.updateMany(
      {
        conversation: conversationId,

        receiver: req.user._id,

        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    );

    const readMessages = await Message.find({
      conversation: conversationId,

      receiver: req.user._id,

      isRead: true,
    }).select("sender");

    const senderIds = [
      ...new Set(readMessages.map((message) => message.sender.toString())),
    ];

    const io = getIO();

    senderIds.forEach((senderId) => {
      io.to(senderId).emit("messagesRead", {
        conversationId,

        userId: req.user._id.toString(),
      });
    });

    return res.status(200).json({
      success: true,

      message: "Messages marked as read",

      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark Messages As Read Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
