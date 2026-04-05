"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, FileDown, X } from "lucide-react";
import { type DownloadItem, openDownloadedFile } from "@/lib/download-toast-store";

const AUTO_DISMISS_MS = 8_000;

type Props = {
  item: DownloadItem;
  onRemove: (id: string) => void;
};

export function DownloadToastItem({ item, onRemove }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  const displayName =
    item.filename.length > 35
      ? `${item.filename.slice(0, 18)}…${item.filename.slice(-14)}`
      : item.filename;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="pointer-events-auto flex w-72 items-center gap-2.5 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-md dark:border-white/[0.08] dark:bg-[#1a1a1a]/95"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
        <FileDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-800 dark:text-slate-200" title={item.filename}>
          {displayName}
        </p>
        <p className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Hoàn thành
        </p>
      </div>

      <button
        type="button"
        onClick={() => openDownloadedFile(item)}
        className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
        title="Tải lại"
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="shrink-0 rounded-md p-1 text-zinc-300 transition-colors hover:text-zinc-500 dark:text-slate-600 dark:hover:text-slate-400"
        title="Đóng"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
