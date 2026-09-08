import { useEffect, useRef, useState } from "react";

import { sendMessage, uploadMessageMedia } from "../../services/messageService";

import socket from "../../services/socket";

import { useAuth } from "../../context/AuthContext";

function MessageInput({ conversation, user, onMessageSent }) {
  const { user: currentUser } = useAuth();

  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const isTypingRef = useRef(false);

  // ==============================
  // STOP TYPING
  // ==============================

  const stopTyping = () => {
    if (!currentUser?._id || !user?._id) {
      return;
    }

    if (!isTypingRef.current) {
      return;
    }

    socket.emit("stopTyping", {
      senderId: currentUser._id,
      receiverId: user._id,
    });

    isTypingRef.current = false;
  };

  // ==============================
  // HANDLE TYPING
  // ==============================

  const handleTyping = (value) => {
    setMessage(value);

    if (!currentUser?._id || !user?._id) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      socket.emit("typing", {
        senderId: currentUser._id,
        receiverId: user._id,
      });

      isTypingRef.current = true;
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  // ==============================
  // FILE SELECT
  // ==============================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // 10 MB LIMIT
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10 MB");

      e.target.value = "";

      return;
    }

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".pdf",
      ".txt",
      ".zip",
      ".rar",
    ];

    const fileName = file.name.toLowerCase();

    const isAllowed = allowedExtensions.some((extension) =>
      fileName.endsWith(extension),
    );

    if (!isAllowed) {
      alert(
        "Only JPG, JPEG, PNG, WEBP, GIF, PDF, TXT, ZIP and RAR files are allowed",
      );

      e.target.value = "";

      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(file);

      setPreview(objectUrl);
    } else {
      setPreview("");
    }
  };

  // ==============================
  // REMOVE FILE
  // ==============================

  const removeSelectedFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==============================
  // SEND MESSAGE
  // ==============================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const text = message.trim();

    if (!text && !selectedFile) {
      return;
    }

    if (!user?._id) {
      console.error("Receiver user not found");
      return;
    }

    if (!conversation?._id) {
      console.error("Conversation not found");
      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      stopTyping();

      let mediaUrl = "";
      let fileName = "";
      let fileSize = 0;
      let mimeType = "";
      let messageType = "text";

      // ==============================
      // UPLOAD FILE
      // ==============================

      if (selectedFile) {
        const uploadData = await uploadMessageMedia(selectedFile);

        mediaUrl = uploadData.media.url;
        fileName = uploadData.media.fileName;
        fileSize = uploadData.media.fileSize;
        mimeType = uploadData.media.mimeType;

        if (mimeType.startsWith("image/")) {
          messageType = "image";
        } else {
          messageType = "file";
        }
      }

      // ==============================
      // SEND
      // ==============================

      const data = await sendMessage(
        user._id,
        text,
        messageType,
        mediaUrl,
        fileName,
        fileSize,
        mimeType,
      );

      setMessage("");

      removeSelectedFile();

      if (onMessageSent && data.message) {
        onMessageSent(data.message);
      }
    } catch (error) {
      console.error("Send Message Error:", error);

      alert(error.response?.data?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // CLEANUP
  // ==============================

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTypingRef.current && currentUser?._id && user?._id) {
        socket.emit("stopTyping", {
          senderId: currentUser._id,
          receiverId: user._id,
        });
      }

      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [currentUser, user, preview]);

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-2.5 py-2.5 backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/95 sm:px-5 sm:py-4">
      <div className="mx-auto min-w-0 max-w-4xl">
        {/* ==============================
            FILE PREVIEW
        ============================== */}

        {selectedFile && (
          <div className="mb-2.5 flex min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/80 p-2.5 shadow-sm transition-colors dark:border-blue-900/50 dark:bg-blue-950/40 sm:mb-3 sm:gap-3 sm:p-3">
            {/* IMAGE PREVIEW */}

            {preview ? (
              <div className="relative shrink-0">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-14 w-14 rounded-xl object-cover shadow-sm ring-2 ring-white dark:ring-slate-800 sm:h-16 sm:w-16"
                />

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white shadow-sm">
                  ✓
                </span>
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm ring-1 ring-blue-100 dark:bg-slate-800 dark:ring-blue-900/50 sm:h-16 sm:w-16 sm:text-2xl">
                📄
              </div>
            )}

            {/* FILE INFO */}

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
                {selectedFile.name}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 sm:mt-1 sm:text-xs">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {/* REMOVE */}

            <button
              type="button"
              onClick={removeSelectedFile}
              disabled={loading}
              aria-label="Remove attachment"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg text-slate-400 shadow-sm transition hover:bg-red-50 hover:text-red-500 active:scale-95 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 disabled:opacity-50"
              title="Remove attachment"
            >
              ×
            </button>
          </div>
        )}

        {/* ==============================
            MESSAGE FORM
        ============================== */}

        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 items-end gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-blue-700 dark:focus-within:bg-slate-900 dark:focus-within:shadow-blue-950/20 sm:gap-2 sm:p-2"
        >
          {/* ATTACHMENT */}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label="Attach file"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 active:scale-95 dark:text-slate-500 dark:hover:bg-blue-950/50 dark:hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10 sm:text-lg"
            title="Attach file"
          >
            📎
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.zip,.rar"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* TEXT INPUT */}

          <input
            type="text"
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder={
              selectedFile ? "Add a message..." : "Type a message..."
            }
            disabled={loading}
            className="h-9 min-w-0 flex-1 bg-transparent px-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition-colors dark:text-slate-100 dark:placeholder:text-slate-500 disabled:cursor-not-allowed sm:h-10 sm:px-2"
          />

          {/* EMOJI */}

          <button
            type="button"
            onClick={() => handleTyping(`${message} 😊`)}
            disabled={loading}
            aria-label="Add emoji"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-slate-400 transition hover:bg-yellow-50 hover:text-yellow-500 active:scale-95 dark:text-slate-500 dark:hover:bg-yellow-950/30 dark:hover:text-yellow-400 sm:flex"
            title="Add emoji"
          >
            😊
          </button>

          {/* SEND */}

          <button
            type="submit"
            disabled={loading || (!message.trim() && !selectedFile)}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-blue-200 transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-300/30 active:scale-95 dark:shadow-blue-950/40 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700 sm:h-10 sm:w-10"
            title="Send message"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 14-7-5 14-2-6-7-1Z"
                />
              </svg>
            )}
          </button>
        </form>

        {/* HINT */}

        <p className="mt-2 hidden text-center text-[10px] text-slate-400 dark:text-slate-600 sm:block">
          Press Enter to send • Max file size 10MB
        </p>
      </div>
    </div>
  );
}

export default MessageInput;
