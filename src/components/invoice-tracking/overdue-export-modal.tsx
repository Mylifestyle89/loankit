"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { BaseModal } from "@/components/ui/base-modal";
import { saveFileWithPicker } from "@/lib/save-file-with-picker";

type CustomerWithDebt = {
  customerId: string;
  customerName: string;
  overdueCount: number;
  pendingCount: number;
  needsSupplementCount: number;
};

type DigestType = "overdue" | "dueSoon" | "supplement";

const TYPE_LABELS: Record<DigestType, string> = {
  overdue: "Quá hạn",
  dueSoon: "Sắp đến hạn",
  supplement: "Cần bổ sung",
};

type Props = {
  customers: CustomerWithDebt[];
  onClose: () => void;
};

export function OverdueExportModal({ customers, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<DigestType>>(
    new Set(["overdue", "dueSoon", "supplement"]),
  );
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCount = customers.length;
  const allSelected = selectedIds.size === allCount && allCount > 0;

  function toggleCustomer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(customers.map((c) => c.customerId)));
  }

  function toggleType(t: DigestType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  const fileDate = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }, []);

  async function handleDownload() {
    if (selectedIds.size === 0 || selectedTypes.size === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("customerIds", Array.from(selectedIds).join(","));
      params.set("types", Array.from(selectedTypes).join(","));
      const res = await fetch(`/api/invoices/overdue-export?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      await saveFileWithPicker(blob, `no-chung-tu-${fileDate}.xlsx`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải file thất bại");
    } finally {
      setDownloading(false);
    }
  }

  const downloadDisabled =
    downloading || selectedIds.size === 0 || selectedTypes.size === 0;

  return (
    <BaseModal
      open
      onClose={onClose}
      title="Tải danh sách nợ chứng từ"
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={downloading}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={() => void handleDownload()}
            disabled={downloadDisabled}
            className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? "Đang tải..." : "Tải XLSX"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Type filter */}
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-slate-300">
            Loại
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as DigestType[]).map((t) => (
              <label
                key={t}
                className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-2.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(t)}
                  onChange={() => toggleType(t)}
                  className="cursor-pointer"
                />
                <span>{TYPE_LABELS[t]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Customer list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-700 dark:text-slate-300">
              Khách hàng ({selectedIds.size}/{allCount})
            </p>
            <button
              onClick={toggleAll}
              disabled={allCount === 0}
              className="cursor-pointer text-xs text-brand-500 dark:text-brand-400 hover:underline disabled:opacity-50"
            >
              {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200 dark:border-white/[0.07]">
            {customers.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-400 dark:text-slate-500">
                Không có khách hàng nào có nợ chứng từ.
              </p>
            ) : (
              customers.map((c) => {
                const checked = selectedIds.has(c.customerId);
                return (
                  <label
                    key={c.customerId}
                    className="cursor-pointer flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-white/[0.04] border-b border-zinc-100 dark:border-white/[0.04] last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCustomer(c.customerId)}
                      className="cursor-pointer"
                    />
                    <span className="flex-1 truncate text-sm text-zinc-800 dark:text-slate-200">
                      {c.customerName}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-500 dark:text-slate-400">
                      {c.overdueCount > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {c.overdueCount} quá hạn
                        </span>
                      )}
                      {c.overdueCount > 0 && c.needsSupplementCount > 0 && " · "}
                      {c.needsSupplementCount > 0 && (
                        <span>{c.needsSupplementCount} bổ sung</span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </BaseModal>
  );
}
