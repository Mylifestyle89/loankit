"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle, Clock, Loader2 } from "lucide-react";

import { BaseModal } from "@/components/ui/base-modal";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useNotificationStore } from "./use-notification-store";

const PAGE_SIZE = 25;
const TYPE_ICONS: Record<string, typeof Bell> = {
  invoice_due_soon: Clock,
  invoice_overdue: AlertTriangle,
  duplicate_invoice: AlertTriangle,
};

type AppNotification = {
  id: string;
  createdAt: string;
  readAt: string | null;
  type: string;
  title: string;
  message: string;
  metadata: string;
};


type Props = { onClose: () => void };

export function NotificationHistoryModal({ onClose }: Props) {
  const router = useRouter();
  const { fetchNotifications } = useNotificationStore();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchPage = useCallback(async (skip: number, unreadOnly: boolean, append: boolean) => {
    if (skip === 0) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/notifications?limit=${PAGE_SIZE}&skip=${skip}&unreadOnly=${unreadOnly}`,
      );
      const data = await res.json() as { notifications: AppNotification[]; total: number };
      setTotal(data.total);
      setItems((prev) => append ? [...prev, ...data.notifications] : data.notifications);
    } finally {
      if (skip === 0) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  // Reload when filter changes
  useEffect(() => {
    void fetchPage(0, filter === "unread", false);
  }, [filter, fetchPage]);

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    void fetchNotifications();
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setTotal(filter === "unread" ? 0 : total);
      void fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  }

  function handleClick(notif: AppNotification) {
    if (!notif.readAt) void handleMarkRead(notif.id);
    try {
      const meta = JSON.parse(notif.metadata) as Record<string, string>;
      if (meta.disbursementId) {
        router.push(`/report/disbursements/${meta.disbursementId}`);
        onClose();
      }
    } catch { /* ignore */ }
  }

  const hasMore = items.length < total;

  return (
    <BaseModal
      open
      onClose={onClose}
      title="Lịch sử thông báo"
      maxWidthClassName="max-w-lg"
      footer={null}
    >
      {/* Filter + mark all */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 rounded-lg bg-zinc-100 dark:bg-white/5 p-1">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-white dark:bg-white/10 text-zinc-800 dark:text-slate-200 shadow-sm"
                  : "text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"
              }`}
            >
              {f === "all" ? "Tất cả" : "Chưa đọc"}
            </button>
          ))}
        </div>
        <button
          onClick={() => void handleMarkAllRead()}
          disabled={markingAll}
          className="cursor-pointer text-xs text-brand-500 dark:text-brand-400 hover:underline disabled:opacity-50"
        >
          {markingAll ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
        </button>
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400 dark:text-slate-500">
            {filter === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}
          </p>
        ) : (
          items.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04] ${
                  !n.readAt ? "bg-brand-50/40 dark:bg-brand-500/5" : ""
                }`}
              >
                <Icon className="mt-1 h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {!n.readAt && (
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    )}
                    <p className="truncate text-xs font-medium text-zinc-800 dark:text-slate-200">
                      {n.title}
                    </p>
                  </div>
                  <p className="line-clamp-1 text-xs text-zinc-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-400 dark:text-slate-500 whitespace-nowrap ml-2">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </button>
            );
          })
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="pt-2 text-center">
            <button
              onClick={() => void fetchPage(items.length, filter === "unread", true)}
              disabled={loadingMore}
              className="cursor-pointer text-xs text-brand-500 dark:text-brand-400 hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            >
              {loadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
              {loadingMore ? "Đang tải..." : `Tải thêm (còn ${total - items.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Total count */}
      {!loading && total > 0 && (
        <p className="mt-3 text-center text-[11px] text-zinc-400 dark:text-slate-500">
          Hiển thị {items.length}/{total} thông báo
        </p>
      )}
    </BaseModal>
  );
}
