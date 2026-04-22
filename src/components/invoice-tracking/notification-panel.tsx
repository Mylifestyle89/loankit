"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, Clock } from "lucide-react";
import { useNotificationStore } from "./use-notification-store";
import { useLanguage } from "@/components/language-provider";
import { formatRelativeTime } from "@/lib/format-relative-time";

const TYPE_ICONS: Record<string, typeof Bell> = {
  invoice_due_soon: Clock,
  invoice_overdue: AlertTriangle,
  duplicate_invoice: AlertTriangle,
};

export function NotificationPanel({ style }: { style?: React.CSSProperties }) {
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
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={style}
      className="w-80 rounded-xl border border-slate-200/60 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a] z-[60]"
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-2.5 dark:border-white/[0.07]">
        <span className="text-sm font-semibold">{t("notifications.title")}</span>
        <button
          onClick={() => void markAllRead()}
          className="cursor-pointer text-xs text-brand-500 dark:text-brand-400 rounded px-1.5 py-0.5 hover:bg-brand-100 dark:hover:bg-brand-1000/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          {t("notifications.markAllRead")}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
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
                  !n.readAt ? "bg-brand-50/50 dark:bg-brand-500/5" : ""
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-slate-200">{n.title}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{n.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-400 dark:text-slate-500">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </button>
            );
          })
        )}
      </div>
      {/* View all history — redirect to invoice page */}
      <div className="border-t border-slate-200/60 dark:border-white/[0.07] px-4 py-2">
        <a
          href="/report/invoices?notifications=1"
          onClick={close}
          className="block w-full text-center text-xs text-brand-500 dark:text-brand-400 hover:underline py-0.5 cursor-pointer"
        >
          Xem tất cả lịch sử
        </a>
      </div>
    </motion.div>
  );
}
