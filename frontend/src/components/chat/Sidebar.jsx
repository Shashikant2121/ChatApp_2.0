import { useEffect, useState } from "react";

import { getConversations } from "../../services/conversationService";
import { markMessagesAsRead } from "../../services/messageService";
import { getUsers } from "../../services/userService";

import socket from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

import ProfileModal from "../profile/ProfileModal";

import { useNavigate } from "react-router-dom";

function Sidebar({ selectedUser, setSelectedUser, mobileOpen, onCloseMobile }) {
  const { user: currentUser, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // FETCH CONVERSATIONS
  // ==========================================

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getConversations();

      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Fetch Conversations Error:", error);

      setError(error.response?.data?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FETCH USERS
  // ==========================================

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);

      const data = await getUsers();

      setUsers(data.users || []);
    } catch (error) {
      console.error("Fetch Users Error:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    fetchConversations();
    fetchUsers();
  }, [currentUser]);

  // ==========================================
  // USER STATUS
  // ==========================================

  useEffect(() => {
    const handleUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => ({
          ...conversation,

          participants: conversation.participants?.map((user) => {
            if (user._id?.toString() === userId?.toString()) {
              return {
                ...user,
                isOnline,
                lastSeen,
              };
            }

            return user;
          }),
        })),
      );

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id?.toString() === userId?.toString()
            ? {
                ...user,
                isOnline,
                lastSeen,
              }
            : user,
        ),
      );

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
  }, [setSelectedUser]);

  // ==========================================
  // NEW MESSAGE
  // ==========================================

  useEffect(() => {
    const handleNewMessage = (message) => {
      const conversationId = message.conversation?._id || message.conversation;

      if (!conversationId) {
        return;
      }

      const messageConversationId = conversationId.toString();

      setConversations((prevConversations) => {
        const existingConversation = prevConversations.find(
          (conversation) =>
            conversation._id?.toString() === messageConversationId,
        );

        if (existingConversation) {
          const otherUser = existingConversation.participants?.find(
            (user) => user._id?.toString() !== currentUser?._id?.toString(),
          );

          const isCurrentChat =
            selectedUser?._id?.toString() === otherUser?._id?.toString();

          const senderId =
            message.sender?._id?.toString() || message.sender?.toString();

          const currentUserId = currentUser?._id?.toString();

          const isMessageMine = senderId === currentUserId;

          const shouldIncreaseUnread = !isMessageMine && !isCurrentChat;

          const updatedConversation = {
            ...existingConversation,

            lastMessage: message,

            updatedAt: message.createdAt || new Date().toISOString(),

            unreadCount: shouldIncreaseUnread
              ? (existingConversation.unreadCount || 0) + 1
              : 0,
          };

          const remainingConversations = prevConversations.filter(
            (conversation) =>
              conversation._id?.toString() !== messageConversationId,
          );

          return [updatedConversation, ...remainingConversations];
        }

        const sender = message.sender;
        const receiver = message.receiver;

        if (!sender || !receiver) {
          return prevConversations;
        }

        const currentUserId = currentUser?._id?.toString();

        const senderId = sender?._id?.toString() || sender?.toString();

        const receiverId = receiver?._id?.toString() || receiver?.toString();

        const otherUserId = senderId === currentUserId ? receiverId : senderId;

        const otherUser = users.find(
          (user) => user._id?.toString() === otherUserId,
        );

        if (!otherUser) {
          fetchConversations();

          return prevConversations;
        }

        const newConversation = {
          _id: messageConversationId,

          participants: [currentUser, otherUser],

          lastMessage: message,

          updatedAt: message.createdAt || new Date().toISOString(),

          unreadCount: senderId === currentUserId ? 0 : 1,
        };

        return [newConversation, ...prevConversations];
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [currentUser, selectedUser, users]);

  // ==========================================
  // OTHER USER
  // ==========================================

  const getOtherUser = (conversation) => {
    if (!conversation?.participants || !currentUser?._id) {
      return null;
    }

    return conversation.participants.find(
      (user) => user._id?.toString() !== currentUser._id?.toString(),
    );
  };

  // ==========================================
  // FILTER CHATS
  // ==========================================

  const filteredConversations = conversations.filter((conversation) => {
    const otherUser = getOtherUser(conversation);

    if (!otherUser) {
      return false;
    }

    return otherUser.name?.toLowerCase().includes(search.toLowerCase());
  });

  // ==========================================
  // FILTER USERS
  // ==========================================

  const filteredUsers = users.filter(
    (user) =>
      user._id?.toString() !== currentUser?._id?.toString() &&
      (user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())),
  );

  // ==========================================
  // SELECT CONVERSATION
  // ==========================================

  const handleSelectConversation = async (conversation) => {
    const otherUser = getOtherUser(conversation);

    if (!otherUser) {
      return;
    }

    setConversations((prevConversations) =>
      prevConversations.map((item) =>
        item._id === conversation._id
          ? {
              ...item,
              unreadCount: 0,
            }
          : item,
      ),
    );

    setSelectedUser(otherUser);

    onCloseMobile?.();

    try {
      await markMessagesAsRead(conversation._id);

      socket.emit("messagesRead", {
        senderId: otherUser._id,
        conversationId: conversation._id,
      });
    } catch (error) {
      console.error("Mark Messages Read Error:", error);
    }
  };

  // ==========================================
  // SELECT USER
  // ==========================================

  const handleSelectUser = (user) => {
    setSelectedUser(user);

    setSearch("");
    setShowUsers(false);

    onCloseMobile?.();
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const handleSearchChange = (e) => {
    const value = e.target.value;

    setSearch(value);
    setShowUsers(value.trim().length > 0);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    if (logoutLoading) {
      return;
    }

    try {
      setLogoutLoading(true);

      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  // ==========================================
  // PROFILE UPDATED
  // ==========================================

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user._id === updatedUser._id
          ? {
              ...user,
              ...updatedUser,
            }
          : user,
      ),
    );

    setConversations((prevConversations) =>
      prevConversations.map((conversation) => ({
        ...conversation,

        participants: conversation.participants?.map((user) =>
          user._id === updatedUser._id
            ? {
                ...user,
                ...updatedUser,
              }
            : user,
        ),
      })),
    );

    setSelectedUser((prevUser) => {
      if (prevUser?._id === updatedUser._id) {
        return {
          ...prevUser,
          ...updatedUser,
        };
      }

      return prevUser;
    });
  };

  // ==========================================
  // FORMAT TIME
  // ==========================================

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    const messageDate = new Date(date);
    const today = new Date();

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return messageDate.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  };

  // ==========================================
  // LAST MESSAGE PREVIEW
  // ==========================================

  const getLastMessagePreview = (lastMessage) => {
    if (!lastMessage) {
      return "No messages yet";
    }

    if (lastMessage.messageType === "image") {
      return "📷 Image";
    }

    if (lastMessage.messageType === "file") {
      return `📎 ${lastMessage.fileName || "File"}`;
    }

    return lastMessage.text || "Message";
  };

  return (
    <>
      {/* ==========================================
          MOBILE OVERLAY
      ========================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* ==========================================
          SIDEBAR
      ========================================== */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          flex w-[88vw] max-w-[360px]
          min-w-0 shrink-0 flex-col
          overflow-hidden
          border-r border-slate-200
          bg-white shadow-2xl
          transition-transform duration-300 ease-out
          dark:border-slate-800
          dark:bg-slate-950
          dark:shadow-black/40

          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

          md:relative
          md:z-auto
          md:w-[350px]
          md:max-w-none
          md:translate-x-0
          md:shadow-none
        `}
      >
        {/* ==========================================
            BRAND HEADER
        ========================================== */}

        <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
          {/* DECORATION */}

          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10" />

          <div className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-white/10" />

          {/* BRAND ROW */}

          <div className="relative mb-4 flex items-center justify-between sm:mb-5">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl shadow-lg ring-1 ring-white/20 backdrop-blur sm:h-11 sm:w-11 sm:rounded-2xl sm:text-2xl">
                💬
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  ChatApp
                </h1>

                <p className="truncate text-[10px] font-medium text-blue-100 sm:text-[11px]">
                  Connect. Chat. Share.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* THEME BUTTON */}

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base text-white ring-1 ring-white/10 backdrop-blur transition hover:bg-white/20 active:scale-95 sm:text-lg"
                title={
                  theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
                }
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>

              {/* MOBILE CLOSE */}

              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xl text-white transition hover:bg-white/20 active:scale-95 md:hidden"
                title="Close sidebar"
              >
                ×
              </button>
            </div>
          </div>

          {/* PROFILE CARD */}

          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="group relative flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-2.5 text-left shadow-lg backdrop-blur-md transition hover:bg-white/15 sm:gap-3 sm:p-3"
          >
            <div className="relative shrink-0">
              {currentUser?.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.name}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white/40 sm:h-11 sm:w-11"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-bold text-blue-600 ring-2 ring-white/30 sm:h-11 sm:w-11 sm:text-lg">
                  {currentUser?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}

              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-indigo-600 bg-emerald-400 sm:h-3.5 sm:w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white sm:text-sm">
                {currentUser?.name}
              </p>

              <p className="truncate text-[10px] text-blue-100 sm:text-xs">
                {currentUser?.bio || currentUser?.email}
              </p>
            </div>

            <span className="shrink-0 text-sm text-white/60 transition group-hover:text-white sm:text-base">
              ✏️
            </span>
          </button>

          {/* SEARCH */}

          <div className="relative mt-3 sm:mt-4">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search people or chats..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/15 pl-9 pr-10 text-xs text-white outline-none placeholder:text-blue-100/70 backdrop-blur-md transition focus:bg-white/20 focus:ring-2 focus:ring-white/30 sm:h-11 sm:pl-10 sm:pr-4 sm:text-sm"
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setShowUsers(false);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg bg-white/10 text-xs text-white transition hover:bg-white/20"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ==========================================
            USER SEARCH RESULTS
        ========================================== */}

        {showUsers && (
          <div className="max-h-64 shrink-0 overflow-y-auto border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:max-h-72">
            <div className="flex items-center justify-between px-4 py-3 sm:px-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                People
              </span>

              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                {filteredUsers.length}
              </span>
            </div>

            {usersLoading ? (
              <div className="p-5 text-center text-sm text-slate-400">
                Searching...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-5 text-center">
                <div className="mb-2 text-3xl">🔎</div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                  No users found
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="group flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50/70 dark:hover:bg-slate-800 sm:px-5"
                >
                  <div className="relative shrink-0">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 font-bold text-white">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}

                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        user.isOnline
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {user.name}
                    </h3>

                    <p className="truncate text-xs text-slate-400">
                      {user.email}
                    </p>
                  </div>

                  <span className="shrink-0 text-slate-300 transition group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400">
                    →
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* ==========================================
            CHAT LIST
        ========================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/60 dark:bg-slate-950">
          {/* SECTION HEADER */}

          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Recent Chats
              </span>

              {!loading && filteredConversations.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {filteredConversations.length}
                </span>
              )}
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="space-y-3 p-3 sm:p-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-3 rounded-2xl p-3"
                >
                  <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800 sm:h-12 sm:w-12" />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />

                    <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-900" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="p-5 text-center sm:p-6">
              <div className="mb-3 text-3xl">⚠️</div>

              <p className="text-sm font-medium text-red-500">{error}</p>

              <button
                type="button"
                onClick={fetchConversations}
                className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              >
                Try Again
              </button>
            </div>
          )}

          {/* EMPTY */}

          {!loading && !error && filteredConversations.length === 0 && (
            <div className="px-5 py-12 text-center sm:px-6 sm:py-14">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                💬
              </div>

              <p className="font-semibold text-slate-600 dark:text-slate-300">
                {search ? "No chats found" : "No conversations yet"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Search for someone above to start chatting.
              </p>
            </div>
          )}

          {/* CONVERSATIONS */}

          {!loading &&
            !error &&
            filteredConversations.length > 0 &&
            filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(conversation);

              if (!otherUser) {
                return null;
              }

              const isSelected =
                selectedUser?._id?.toString() === otherUser._id?.toString();

              const lastMessage = conversation.lastMessage;

              const unreadCount = conversation.unreadCount || 0;

              const isLastMessageMine =
                lastMessage?.sender?._id?.toString() ===
                currentUser?._id?.toString();

              return (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation)}
                  className={`group relative flex w-full min-w-0 items-center gap-2.5 border-b px-3.5 py-3 text-left transition-all duration-200 sm:gap-3 sm:px-4 sm:py-3.5 ${
                    isSelected
                      ? "border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-blue-500/10"
                      : "border-slate-100 bg-transparent hover:bg-white dark:border-slate-900 dark:hover:bg-slate-900"
                  }`}
                >
                  {/* SELECTED INDICATOR */}

                  {isSelected && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-gradient-to-b from-blue-500 to-violet-500" />
                  )}

                  {/* AVATAR */}

                  <div className="relative shrink-0">
                    {otherUser.profilePicture ? (
                      <img
                        src={otherUser.profilePicture}
                        alt={otherUser.name}
                        className={`h-11 w-11 rounded-full object-cover ring-2 transition sm:h-12 sm:w-12 ${
                          isSelected
                            ? "ring-blue-300 dark:ring-blue-500/40"
                            : "ring-transparent"
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold text-white shadow-sm transition sm:h-12 sm:w-12 sm:text-base ${
                          isSelected
                            ? "shadow-blue-200 dark:shadow-blue-950"
                            : ""
                        }`}
                      >
                        {otherUser.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}

                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-950 sm:h-3 sm:w-3 ${
                        otherUser.isOnline
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                  </div>

                  {/* CHAT INFO */}

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <h3
                        className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${
                          unreadCount > 0
                            ? "font-bold text-slate-800 dark:text-white"
                            : "font-semibold text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {otherUser.name}
                      </h3>

                      {lastMessage && (
                        <span
                          className={`shrink-0 whitespace-nowrap text-[9px] sm:text-[10px] ${
                            unreadCount > 0
                              ? "font-semibold text-blue-600 dark:text-blue-400"
                              : "text-slate-400"
                          }`}
                        >
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
                      <p
                        className={`min-w-0 flex-1 truncate text-[11px] sm:text-xs ${
                          unreadCount > 0
                            ? "font-semibold text-slate-700 dark:text-slate-300"
                            : "text-slate-400"
                        }`}
                      >
                        {isLastMessageMine && (
                          <span className="font-medium text-blue-500">
                            You:{" "}
                          </span>
                        )}

                        {getLastMessagePreview(lastMessage)}
                      </p>

                      {unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-1.5 text-[9px] font-bold text-white shadow-sm sm:text-[10px]">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {/* ==========================================
            BOTTOM ACCOUNT BAR
        ========================================== */}

        <div className="shrink-0 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 sm:p-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {/* PROFILE */}

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-900 sm:gap-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold text-white">
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  currentUser?.name?.charAt(0)?.toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {currentUser?.name}
                </p>

                <p className="truncate text-[10px] text-slate-400">
                  View profile
                </p>
              </div>
            </button>

            {/* LOGOUT */}

            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              aria-label="Logout"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-500/10 sm:h-10 sm:w-10"
              title="Logout"
            >
              {logoutLoading ? (
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15l3-3m0 0l-3-3m3 3H3"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ==========================================
          PROFILE MODAL
      ========================================== */}

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </>
  );
}

export default Sidebar;
