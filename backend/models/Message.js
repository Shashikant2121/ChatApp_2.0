import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Text message / caption
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    // Message type
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },

    // Cloudinary media URL
    mediaUrl: {
      type: String,
      default: "",
    },

    // Original file name
    fileName: {
      type: String,
      default: "",
    },

    // File size in bytes
    fileSize: {
      type: Number,
      default: 0,
    },

    // MIME type
    mimeType: {
      type: String,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
