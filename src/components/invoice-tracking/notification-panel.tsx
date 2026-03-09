"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, Clock } from "lucide-react";
import { useNotificationStore } from "./use-notification-store";
import { useLanguage } from "@/components/language-provider";

const TYPE_ICONS: Record<string, typeof Bell> = {
  invoice_due_soon: Clock,
  invoice_overdue: AlertTriangle,
  duplicate_invoice: AlertTriangle,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationPanel() {
  const { notifications, markRead, markAllRead, close } = useNotificationStore();
  const { t } = useLanguage();
  const router = useRouter();

  function handleClick(notif: { id: string; readAt: string | null; metadata: string }) {
    if (!notif.readAt) void markRead(notif.id);
    try {
      const meta = JSON.parse(notif.metadata) as Record<string, string>;
      if (meta.disbursementId) {
        router.push(`/report/disbursements/${meta.disbursementId}`);
      }
    } catch {
      /* ignore malformed metadata */
    }
    close();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-slate-200/60 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a] z-[60]"
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-2.5 dark:border-white/[0.07]">
        <span className="text-sm font-semibold">{t("notifications.title")}</span>
        <button
          onClick={() => void markAllRead()}
          className="cursor-pointer text-xs text-indigo-600 hover:underline dark:text-indigo-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded"
        >
          {t("notifications.markAllRead")}
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-slate-500">
            {t("notifications.empty")}
          </p>
        ) : (
          notifications.slice(0, 20).map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-white/[0.04] ${
                  !n.readAt ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-slate-200">{n.title}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{n.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-400 dark:text-slate-500">
                  {timeAgo(n.createdAt)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
