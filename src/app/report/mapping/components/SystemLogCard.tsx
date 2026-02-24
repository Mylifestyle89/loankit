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
};

const toneMap: Record<
  SystemLogType,
  { dot: string; rail: string; badge: string; text: string; label: string }
> = {
  ai: {
    dot: "bg-indigo-500",
    rail: "bg-indigo-300/40",
    badge: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30",
    text: "text-indigo-100",
    label: "AI",
  },
  system: {
    dot: "bg-slate-400",
    rail: "bg-slate-400/30",
    badge: "bg-slate-500/20 text-slate-300 ring-1 ring-slate-400/30",
    text: "text-slate-100",
    label: "System",
  },
  error: {
    dot: "bg-rose-500",
    rail: "bg-rose-300/40",
    badge: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30",
    text: "text-rose-100",
    label: "Error",
  },
};

export function SystemLogCard({ logs, endRef, title = "Live log", emptyText = "Chờ dữ liệu..." }: Props) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950 font-mono text-[11px]">
      <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-indigo-500" />
        {title}
      </div>

      <div className="max-h-40 min-h-[96px] overflow-y-auto p-3">
        {logs.length === 0 ? (
          <span className="text-zinc-500">{emptyText}</span>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const tone = toneMap[log.type];
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
                  <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
                        {tone.label}
                      </span>
                      <span className="text-[10px] text-zinc-500">
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

