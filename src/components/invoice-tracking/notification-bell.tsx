"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore } from "./use-notification-store";
import { requestNotificationPermission } from "@/lib/notifications/browser-notifications";
import { useLanguage } from "@/components/language-provider";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell({ expanded }: { expanded: boolean }) {
  const { unreadCount, isOpen, toggle, startPolling } = useNotificationStore();
  const { t } = useLanguage();
  const permissionRequested = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startPolling();
  }, [startPolling]);

  // Compute fixed position from button bounding rect
  function getPanelPos() {
    if (!btnRef.current) return { left: 0, bottom: 0 };
    const rect = btnRef.current.getBoundingClientRect();
    return { left: rect.right + 8, bottom: window.innerHeight - rect.bottom };
  }

  const handleClick = () => {
    toggle();
    if (!permissionRequested.current) {
      permissionRequested.current = true;
      void requestNotificationPermission();
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-zinc-400 transition-all duration-150 cursor-pointer hover:bg-slate-100/70 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 ${
          expanded ? "gap-2.5 px-2.5 justify-start" : "justify-center px-0"
        }`}
      >
        <div className="relative">
          <Bell className="h-[17px] w-[17px] shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ delay: 0.07, duration: 0.14 }}
              className="truncate"
            >
              {t("notifications.title")}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isOpen && <NotificationPanel style={{ position: "fixed", ...getPanelPos() }} />}
    </div>
  );
}
