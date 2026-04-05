"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({ page, pageSize, total, onPageChange }: Props) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/[0.07] px-4 py-3 text-sm">
      <span className="text-zinc-500 dark:text-slate-400">
        {from}–{to} / {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="cursor-pointer rounded-md border border-zinc-300 dark:border-white/[0.09] p-1.5 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums text-zinc-600 dark:text-slate-300">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="cursor-pointer rounded-md border border-zinc-300 dark:border-white/[0.09] p-1.5 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
