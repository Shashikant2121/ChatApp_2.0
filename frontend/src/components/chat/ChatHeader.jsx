import { useEffect, useState } from "react";

function ChatHeader({ user, onOpenSidebar }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // ==========================================
  // UPDATE CURRENT TIME
  // ==========================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // FORMAT LAST SEEN
  // ==========================================

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) {
      return "Offline";
    }

    const date = new Date(lastSeen);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `last seen today at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return `last seen yesterday at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    return `last seen ${date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  };

  // ==========================================
  // AVATAR FALLBACK
  // ==========================================

  const avatar =
    user?.profilePicture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || "User",
    )}&background=6366f1&color=fff&size=128`;

  // Prevent unused-state optimization warnings
  void currentTime;

  if (!user) {
    return null;
  }

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/95 sm:px-5">
      {/* ==========================================
          LEFT SECTION
      ========================================== */}

      <div className="flex min-w-0 items-center">
        {/* MOBILE SIDEBAR BUTTON */}

        <button
          type="button"
          aria-label="Open chats"
          onClick={onOpenSidebar}
          className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* USER INFORMATION */}

        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {/* AVATAR */}

          <div className="relative shrink-0">
            <div
              className={`h-10 w-10 overflow-hidden rounded-xl border-2 bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl ${
                user.isOnline
                  ? "border-emerald-400/60"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <img
                src={avatar}
                alt={user.name || "User"}
                className="h-full w-full object-cover"
              />
            </div>

            {/* ONLINE DOT */}

            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 sm:h-3.5 sm:w-3.5 ${
                user.isOnline
                  ? "bg-emerald-500"
                  : "bg-slate-400 dark:bg-slate-600"
              }`}
            />
          </div>

          {/* NAME + STATUS */}

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="max-w-[140px] truncate text-sm font-bold text-slate-800 dark:text-white xs:max-w-[160px] sm:max-w-[260px]">
                {user.name}
              </h2>

              {user.isOnline && (
                <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:inline-block">
                  Online
                </span>
              )}
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              {user.isOnline ? (
                <>
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />

                  <p className="truncate text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Active now
                  </p>
                </>
              ) : (
                <p className="max-w-[150px] truncate text-[11px] text-slate-400 dark:text-slate-500 sm:max-w-none">
                  {formatLastSeen(user.lastSeen)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          HEADER ACTIONS
      ========================================== */}

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {/* STATUS */}

        <div
          className={`hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex ${
            user.isOnline
              ? "border-emerald-100 bg-emerald-50 dark:border-emerald-500/10 dark:bg-emerald-500/5"
              : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              user.isOnline
                ? "bg-emerald-500"
                : "bg-slate-400 dark:bg-slate-600"
            }`}
          />

          <span
            className={`text-[10px] font-semibold ${
              user.isOnline
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400"
            }`}
          >
            {user.isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* MORE BUTTON */}

        <button
          type="button"
          aria-label="More options"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200"
          title="More options"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;
