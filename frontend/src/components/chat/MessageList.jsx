import { useEffect, useRef, useState } from "react";

import { getMessages, markMessagesAsRead } from "../../services/messageService";

import { useAuth } from "../../context/AuthContext";

import socket from "../../services/socket";

function MessageList({ conversation, newMessage }) {
  const { user: currentUser } = useAuth();

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  // ==============================
  // FETCH MESSAGES
  // ==============================

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);

        const data = await getMessages(conversation._id);

        setMessages(data.messages || []);
      } catch (error) {
        console.error("Fetch Messages Error:", error);

        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    if (conversation?._id) {
      fetchMessages();
    }
  }, [conversation]);

  // ==============================
  // NEW MESSAGE FROM SOCKET
  // ==============================

  useEffect(() => {
    if (!conversation?._id) {
      return;
    }

    const handleNewMessage = (message) => {
      const messageConversationId =
        message.conversation?._id || message.conversation;

      if (messageConversationId?.toString() !== conversation._id.toString()) {
        return;
      }

      setMessages((prevMessages) => {
        const alreadyExists = prevMessages.some(
          (existingMessage) => existingMessage._id === message._id,
        );

        if (alreadyExists) {
          return prevMessages;
        }

        return [...prevMessages, message];
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [conversation]);

  // ==============================
  // MESSAGE SENT FROM INPUT
  // ==============================

  useEffect(() => {
    if (!newMessage) {
      return;
    }

    const messageConversationId =
      newMessage.conversation?._id || newMessage.conversation;

    if (messageConversationId?.toString() !== conversation?._id?.toString()) {
      return;
    }

    setMessages((prevMessages) => {
      const alreadyExists = prevMessages.some(
        (message) => message._id === newMessage._id,
      );

      if (alreadyExists) {
        return prevMessages;
      }

      return [...prevMessages, newMessage];
    });
  }, [newMessage, conversation]);

  // ==============================
  // READ RECEIPTS
  // ==============================

  useEffect(() => {
    if (!conversation?._id) {
      return;
    }

    const handleMessagesRead = ({ conversationId }) => {
      if (conversationId?.toString() !== conversation._id.toString()) {
        return;
      }

      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          const senderId = message.sender?._id || message.sender;

          if (senderId?.toString() === currentUser?._id?.toString()) {
            return {
              ...message,
              isRead: true,
            };
          }

          return message;
        }),
      );
    };

    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [conversation, currentUser]);

  // ==============================
  // MARK RECEIVED MESSAGES READ
  // ==============================

  useEffect(() => {
    if (!conversation?._id || !currentUser?._id || messages.length === 0) {
      return;
    }

    const hasUnreadMessages = messages.some((message) => {
      const receiverId = message.receiver?._id || message.receiver;

      return (
        receiverId?.toString() === currentUser._id.toString() && !message.isRead
      );
    });

    if (!hasUnreadMessages) {
      return;
    }

    const markAsRead = async () => {
      try {
        await markMessagesAsRead(conversation._id);
      } catch (error) {
        console.error("Mark Messages As Read Error:", error);
      }
    };

    markAsRead();
  }, [messages, conversation, currentUser]);

  // ==============================
  // AUTO SCROLL
  // ==============================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ==============================
  // FORMAT FILE SIZE
  // ==============================

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ==============================
  // FILE ICON
  // ==============================

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes("pdf")) {
      return "📕";
    }

    if (mimeType?.includes("zip") || mimeType?.includes("rar")) {
      return "🗜️";
    }

    if (mimeType?.includes("text")) {
      return "📄";
    }

    return "📎";
  };

  // ==============================
  // FORMAT TIME
  // ==============================

  const formatMessageTime = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==============================
  // FORMAT DATE
  // ==============================

  const formatMessageDate = (date) => {
    return new Date(date).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 shadow-sm dark:bg-blue-500/10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent" />
          </div>

          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-3 py-5 transition-colors duration-300 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20 sm:px-5">
      {/* ==============================
          DECORATIVE BACKGROUND
      ============================== */}

      <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-100/30 blur-3xl dark:bg-blue-500/5" />

      <div className="pointer-events-none absolute bottom-20 right-0 h-64 w-64 rounded-full bg-violet-100/20 blur-3xl dark:bg-violet-500/5" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-3">
        {/* ==============================
            EMPTY STATE
        ============================== */}

        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-slate-100 bg-white text-4xl shadow-lg dark:border-slate-800 dark:bg-slate-900">
                💬
              </div>

              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Start the conversation
              </h3>

              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Send a message to say hello 👋
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const senderId = message.sender?._id || message.sender;

            const isMine =
              senderId?.toString() === currentUser?._id?.toString();

            const showDate =
              index === 0 ||
              new Date(message.createdAt).toDateString() !==
                new Date(messages[index - 1]?.createdAt).toDateString();

            return (
              <div key={message._id} className="animate-[fadeIn_0.2s_ease-out]">
                {/* ==============================
                    DATE SEPARATOR
                ============================== */}

                {showDate && (
                  <div className="my-5 flex items-center justify-center">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
                      {formatMessageDate(message.createdAt)}
                    </span>
                  </div>
                )}

                {/* ==============================
                    MESSAGE ROW
                ============================== */}

                <div
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group relative max-w-[85%] sm:max-w-[72%] ${
                      isMine ? "items-end" : "items-start"
                    }`}
                  >
                    {/* ==============================
                        MESSAGE BUBBLE
                    ============================== */}

                    <div
                      className={`overflow-hidden rounded-[20px] shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md ${
                        isMine
                          ? "rounded-br-md bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-blue-500/10"
                          : "rounded-bl-md border border-slate-100 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {/* ==============================
                          IMAGE
                      ============================== */}

                      {message.messageType === "image" && message.mediaUrl && (
                        <a
                          href={message.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden"
                        >
                          <img
                            src={message.mediaUrl}
                            alt={message.fileName || "Shared image"}
                            className="max-h-[360px] w-full cursor-pointer object-cover transition duration-300 hover:scale-[1.02]"
                          />
                        </a>
                      )}

                      {/* ==============================
                          FILE
                      ============================== */}

                      {message.messageType === "file" && message.mediaUrl && (
                        <a
                          href={message.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`m-2 flex min-w-[230px] items-center gap-3 rounded-2xl p-3 transition ${
                            isMine
                              ? "bg-white/15 hover:bg-white/20"
                              : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm dark:bg-slate-700">
                            {getFileIcon(message.mimeType)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${
                                isMine
                                  ? "text-white"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {message.fileName || "Attached file"}
                            </p>

                            <p
                              className={`mt-0.5 text-[11px] ${
                                isMine
                                  ? "text-blue-100"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {formatFileSize(message.fileSize)}
                            </p>
                          </div>

                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                              isMine
                                ? "bg-white/15 text-white"
                                : "bg-white text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            ↗
                          </div>
                        </a>
                      )}

                      {/* ==============================
                          TEXT
                      ============================== */}

                      {message.text && (
                        <p
                          className={`break-words whitespace-pre-wrap px-4 pt-3 text-sm leading-6 ${
                            message.messageType === "image" ? "pb-1" : ""
                          }`}
                        >
                          {message.text}
                        </p>
                      )}

                      {/* ==============================
                          TIME + READ RECEIPT
                      ============================== */}

                      <div
                        className={`flex items-center justify-end gap-1 px-3 pb-2 pt-1 text-[10px] ${
                          isMine
                            ? "text-blue-100"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        <span>{formatMessageTime(message.createdAt)}</span>

                        {isMine && (
                          <span
                            className={`text-xs transition-colors ${
                              message.isRead
                                ? "font-bold text-cyan-100"
                                : "text-blue-200"
                            }`}
                            title={message.isRead ? "Read" : "Sent"}
                          >
                            {message.isRead ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default MessageList;
