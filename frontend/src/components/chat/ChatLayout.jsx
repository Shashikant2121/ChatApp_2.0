import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

import { createConversation } from "../../services/conversationService";
import { markMessagesAsRead } from "../../services/messageService";

import socket from "../../services/socket";
import { useAuth } from "../../context/AuthContext";

function ChatLayout() {
  const { user: currentUser } = useAuth();

  const [selectedUser, setSelectedUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  const [newMessage, setNewMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  useEffect(() => {
    if (!currentUser?._id) return;

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);

      socket.emit("join", currentUser._id);
    };

    if (socket.connected) {
      socket.emit("join", currentUser._id);
    } else {
      socket.on("connect", handleConnect);
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [currentUser?._id]);

  // ==========================================
  // USER ONLINE / OFFLINE
  // ==========================================

  useEffect(() => {
    const handleUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
      setSelectedUser((prevUser) => {
        if (!prevUser) {
          return prevUser;
        }

        if (prevUser._id?.toString() !== userId?.toString()) {
          return prevUser;
        }

        return {
          ...prevUser,
          isOnline,
          lastSeen,
        };
      });
    };

    socket.on("userStatusChanged", handleUserStatusChanged);

    return () => {
      socket.off("userStatusChanged", handleUserStatusChanged);
    };
  }, []);

  // ==========================================
  // TYPING EVENTS
  // ==========================================

  useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    const handleUserTyping = ({ senderId }) => {
      if (!selectedUser?._id) {
        return;
      }

      if (senderId?.toString() === selectedUser._id?.toString()) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = ({ senderId }) => {
      if (!selectedUser?._id) {
        return;
      }

      if (senderId?.toString() === selectedUser._id?.toString()) {
        setIsTyping(false);
      }
    };

    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [currentUser?._id, selectedUser?._id]);

  // ==========================================
  // RESET TYPING WHEN USER CHANGES
  // ==========================================

  useEffect(() => {
    setIsTyping(false);
  }, [selectedUser?._id]);

  // ==========================================
  // SELECT USER
  // ==========================================

  const handleSelectUser = async (user) => {
    if (!user?._id) {
      return;
    }

    try {
      setSelectedUser(user);
      setConversation(null);
      setNewMessage(null);
      setIsTyping(false);

      setConversationLoading(true);

      setShowMobileSidebar(false);

      console.log("Creating conversation with:", user._id);

      const data = await createConversation(user._id);

      console.log("Conversation response:", data);

      const newConversation = data?.conversation;

      if (!newConversation?._id) {
        throw new Error("Conversation was not created.");
      }

      setConversation(newConversation);

      // ==========================================
      // MARK MESSAGES AS READ
      // ==========================================

      try {
        await markMessagesAsRead(newConversation._id);

        socket.emit("messagesRead", {
          senderId: user._id,
          conversationId: newConversation._id,
        });
      } catch (readError) {
        console.error("Mark Messages Read Error:", readError);
      }
    } catch (error) {
      console.error("Create Conversation Error:", error);

      setConversation(null);
    } finally {
      setConversationLoading(false);
    }
  };

  // ==========================================
  // MESSAGE SENT
  // ==========================================

  const handleMessageSent = (message) => {
    console.log("Message sent successfully:", message);

    setNewMessage(message);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* ======================================
          MOBILE OVERLAY
      ====================================== */}

      {showMobileSidebar && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <Sidebar
        selectedUser={selectedUser}
        setSelectedUser={handleSelectUser}
        mobileOpen={showMobileSidebar}
        onCloseMobile={() => setShowMobileSidebar(false)}
      />

      {/* ======================================
          MAIN CHAT AREA
      ====================================== */}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* ====================================
            WELCOME SCREEN
        ==================================== */}

        {!selectedUser ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl shadow-lg shadow-blue-500/20 sm:h-24 sm:w-24 sm:text-5xl">
                💬
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Welcome to ChatApp
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                Select a conversation from the sidebar to start chatting with
                your friends.
              </p>

              <button
                type="button"
                onClick={() => setShowMobileSidebar(true)}
                className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] md:hidden"
              >
                <span>☰</span>
                <span>Open Chats</span>
              </button>

              <div className="mt-8 hidden items-center justify-center gap-3 text-xs text-slate-400 md:flex dark:text-slate-500">
                <span className="h-px w-10 bg-slate-200 dark:bg-slate-800" />

                <span>Select a chat to continue</span>

                <span className="h-px w-10 bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ==================================
                CHAT HEADER
            ================================== */}

            <ChatHeader
              user={selectedUser}
              onOpenSidebar={() => setShowMobileSidebar(true)}
            />

            {/* ==================================
                MESSAGES
            ================================== */}

            <div className="min-h-0 flex-1 overflow-hidden">
              {conversationLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Loading conversation...
                    </p>
                  </div>
                </div>
              ) : conversation ? (
                <MessageList
                  conversation={conversation}
                  newMessage={newMessage}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center">
                  <div>
                    <p className="font-medium text-red-500">
                      Unable to load conversation
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Please try selecting this user again.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ==================================
                TYPING INDICATOR
            ================================== */}

            {isTyping && (
              <div className="shrink-0 px-4 pb-2 sm:px-5">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />

                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />

                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </span>

                  <span>{selectedUser.name} is typing...</span>
                </div>
              </div>
            )}

            {/* ==================================
                MESSAGE INPUT
            ================================== */}

            {conversation && (
              <MessageInput
                conversation={conversation}
                user={selectedUser}
                onMessageSent={handleMessageSent}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ChatLayout;
