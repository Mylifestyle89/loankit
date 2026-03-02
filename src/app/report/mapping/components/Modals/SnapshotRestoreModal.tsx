"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw, X, Clock, Database, Calculator } from "lucide-react";
import { useMappingDataStore } from "../../stores/use-mapping-data-store";

type SnapshotMeta = {
  filename: string;
  timestamp: string;
  source: "auto" | "manual";
  fieldCatalogCount: number;
  manualValuesCount: number;
  formulasCount: number;
};

type SnapshotData = {
  manualValues: Record<string, string | number | boolean | null>;
  formulas: Record<string, string>;
  mappingText: string;
  aliasText: string;
  fieldCatalogCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function SnapshotRestoreModal({ open, onClose }: Props) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/report/snapshots", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; snapshots?: SnapshotMeta[]; error?: string };
      if (data.ok && data.snapshots) {
        setSnapshots(data.snapshots);
      } else {
        setError(data.error ?? "Không thể tải danh sách snapshot.");
      }
    } catch {
      setError("Lỗi kết nối khi tải snapshot.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSuccessMsg("");
      void loadSnapshots();
    }
  }, [open, loadSnapshots]);

  async function handleRestore(filename: string) {
    setRestoring(filename);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/report/snapshots/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const result = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: SnapshotData;
        restored?: { manualValuesCount: number; formulasCount: number };
      };
      if (!result.ok) throw new Error(result.error ?? "Khôi phục thất bại.");

      // Apply restored data to Zustand store
      if (result.data) {
        const md = useMappingDataStore.getState();
        md.setManualValues(result.data.manualValues);
        md.setFormulas(result.data.formulas);
        if (result.data.mappingText && result.data.mappingText !== "{}") {
          md.setMappingText(result.data.mappingText);
        }
        if (result.data.aliasText && result.data.aliasText !== "{}") {
          md.setAliasText(result.data.aliasText);
        }
        // Merge manual values into values
        md.setValues((prev) => ({ ...prev, ...result.data!.manualValues }));
      }

      setSuccessMsg(
        `Đã khôi phục ${result.restored?.manualValuesCount ?? 0} giá trị, ${result.restored?.formulasCount ?? 0} công thức.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khôi phục thất bại.");
    } finally {
      setRestoring(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200/60 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md dark:border-white/[0.07] dark:bg-[#0f1629]/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4 dark:border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <History className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Khôi phục dữ liệu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chọn bản lưu tự động để khôi phục
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mx-5 mt-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Đang tải danh sách...
            </p>
          )}
          {!loading && snapshots.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Chưa có bản lưu tự động nào.
            </p>
          )}
          {!loading && snapshots.length > 0 && (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div
                  key={s.filename}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 transition-colors hover:bg-slate-100/80 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatTime(s.timestamp)}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {timeAgo(s.timestamp)}
                      </span>
                      {s.source === "manual" && (
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          thủ công
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {s.manualValuesCount} giá trị
                      </span>
                      <span className="flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        {s.formulasCount} công thức
                      </span>
                      <span>{s.fieldCatalogCount} trường</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(s.filename)}
                    disabled={restoring !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-all hover:bg-indigo-100 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                  >
                    {restoring === s.filename ? (
                      "Đang khôi phục..."
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        Khôi phục
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200/60 px-5 py-3 dark:border-white/[0.07]">
          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Hệ thống tự động lưu mỗi 60 giây. Tối đa 120 bản lưu (~2 giờ làm việc).
            Chọn &quot;Khôi phục&quot; để nạp lại giá trị đã nhập và công thức.
          </p>
        </div>
      </div>
    </div>
  );
}
