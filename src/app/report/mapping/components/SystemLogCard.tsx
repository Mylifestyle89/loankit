"use client";

import { motion } from "framer-motion";
import type { RefObject } from "react";

export type SystemLogType = "ai" | "system" | "error";

export type SystemLogEntry = {
  id: string;
  message: string;
  type: SystemLogType;
  createdAt: number;
  isNewest?: boolean;
};

type Props = {
  logs: SystemLogEntry[];
  endRef: RefObject<HTMLDivElement | null>;
  title?: string;
  emptyText?: string;
  variant?: "dark" | "light";
};

const toneMap: Record<
  "dark" | "light",
  Record<SystemLogType, { dot: string; rail: string; badge: string; text: string; label: string; entryBg: string; entryBorder: string }>
> = {
  dark: {
    ai: {
      dot: "bg-indigo-500",
      rail: "bg-indigo-300/40",
      badge: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30",
      text: "text-indigo-100",
      label: "AI",
      entryBg: "bg-zinc-900/60",
      entryBorder: "border-zinc-800/80",
    },
    system: {
      dot: "bg-slate-400",
      rail: "bg-slate-400/30",
      badge: "bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/30",
      text: "text-slate-100",
      label: "System",
      entryBg: "bg-zinc-900/60",
      entryBorder: "border-zinc-800/80",
    },
    error: {
      dot: "bg-rose-500",
      rail: "bg-rose-300/40",
      badge: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30",
      text: "text-rose-100",
      label: "Error",
      entryBg: "bg-zinc-900/60",
      entryBorder: "border-zinc-800/80",
    },
  },
  light: {
    ai: {
      dot: "bg-indigo-500",
      rail: "bg-indigo-200",
      badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
      text: "text-slate-700",
      label: "AI",
      entryBg: "bg-white/80",
      entryBorder: "border-slate-200/70",
    },
    system: {
      dot: "bg-sky-400",
      rail: "bg-sky-200",
      badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
      text: "text-slate-700",
      label: "System",
      entryBg: "bg-white/80",
      entryBorder: "border-slate-200/70",
    },
    error: {
      dot: "bg-rose-500",
      rail: "bg-rose-200",
      badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      text: "text-slate-700",
      label: "Error",
      entryBg: "bg-white/80",
      entryBorder: "border-slate-200/70",
    },
  },
};

export function SystemLogCard({ logs, endRef, title = "Live log", emptyText = "Chờ dữ liệu...", variant = "dark" }: Props) {
  const cardClass =
    variant === "light"
      ? "rounded-2xl border border-slate-200/60 bg-white/80 text-xs shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md"
      : "rounded-lg border border-zinc-700 bg-zinc-950 text-xs";
  const headClass =
    variant === "light"
      ? "flex items-center gap-2 border-b border-slate-200/70 bg-slate-50/80 px-3 py-2 text-slate-600"
      : "flex items-center gap-2 border-b border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-zinc-500";
  const bodyClass = variant === "light" ? "max-h-48 min-h-[112px] overflow-y-auto p-3" : "max-h-40 min-h-[96px] overflow-y-auto p-3";
  const emptyClass = variant === "light" ? "text-slate-500" : "text-zinc-500";
  const timeClass = variant === "light" ? "text-[10px] text-slate-500" : "text-[10px] text-zinc-500";

  return (
    <div className={cardClass}>
      <div className={headClass}>
        <span className="h-2 w-2 rounded-full bg-indigo-500" />
        {title}
      </div>

      <div className={bodyClass}>
        {logs.length === 0 ? (
          <span className={emptyClass}>{emptyText}</span>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const tone = toneMap[variant][log.type];
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  className="relative pl-6"
                >
                  <span className={`absolute bottom-[-10px] left-[5px] top-[12px] w-px ${tone.rail}`} aria-hidden />
                  <span
                    className={`absolute left-0 top-1.5 h-[10px] w-[10px] rounded-full ${tone.dot} ${log.isNewest ? "animate-pulse" : ""}`}
                    aria-hidden
                  />
                  <div className={`rounded-xl border px-2.5 py-1.5 ${tone.entryBorder} ${tone.entryBg}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
                        {tone.label}
                      </span>
                      <span className={timeClass}>
                        {new Date(log.createdAt).toLocaleTimeString("vi-VN", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className={`whitespace-pre-wrap break-all ${tone.text}`}>{log.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

