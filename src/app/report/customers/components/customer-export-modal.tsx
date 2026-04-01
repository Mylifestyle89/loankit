"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";

type Customer = { id: string; customer_code: string; customer_name: string };
type Template = { id: string; name: string };

type Props = {
  customers: Customer[];
  onClose: () => void;
  onError: (msg: string) => void;
};

export function CustomerExportModal({ customers, onClose, onError }: Props) {
  const [exporting, setExporting] = useState(false);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set(customers.map((c) => c.id)));
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"json" | "xlsx">("json");
  const [includeRelations, setIncludeRelations] = useState(true);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  // Load templates on mount
  if (!templatesLoaded) {
    setTemplatesLoaded(true);
    fetch("/api/report/field-templates")
      .then((res) => res.json())
      .then((data: { ok?: boolean; field_templates?: Template[] }) => {
        if (data.ok) {
          setAllTemplates(data.field_templates || []);
          setSelectedTemplates(new Set((data.field_templates || []).map((t) => t.id)));
        }
      })
      .catch(() => onError("Không thể tải danh sách template."));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/report/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: Array.from(selectedCustomers),
          templateIds: Array.from(selectedTemplates),
          format: exportFormat,
          includeRelations,
        }),
      });
      if (!res.ok) throw new Error("Tải file thất bại");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data_export_${Date.now()}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Xuất dữ liệu lỗi");
    } finally {
      setExporting(false);
    }
  }

  const checkboxCls = "rounded border-zinc-300 h-4 w-4 text-violet-600 focus-visible:ring-violet-500/40 cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#161616] shadow-xl flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.07] px-6 py-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            Tùy chọn xuất dữ liệu
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 dark:text-slate-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options bar */}
        <div className="px-6 py-3 border-b border-zinc-100 dark:border-white/[0.07] flex items-center gap-6">
          {/* Format selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Định dạng:</span>
            <div className="flex rounded-lg border border-zinc-200 dark:border-white/[0.09] overflow-hidden">
              {(["json", "xlsx"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    exportFormat === fmt
                      ? "bg-violet-600 text-white"
                      : "bg-white dark:bg-[#1a1a1a] text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* Include relations */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeRelations} onChange={(e) => setIncludeRelations(e.target.checked)} className={checkboxCls} />
            <span className="text-sm">Bao gồm khoản vay, giải ngân, hoá đơn</span>
          </label>
        </div>

        {/* Selection columns */}
        <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-2 gap-8">
          {/* Customers column */}
          <div className="flex flex-col h-full border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="bg-violet-50 dark:bg-violet-500/5 px-4 py-2 font-medium flex justify-between items-center border-b border-zinc-200 dark:border-white/[0.07]">
              <span>Khách hàng ({selectedCustomers.size}/{customers.length})</span>
              <button
                onClick={() => setSelectedCustomers(selectedCustomers.size === customers.length ? new Set() : new Set(customers.map((c) => c.id)))}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {selectedCustomers.size === customers.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {customers.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-violet-50 dark:hover:bg-white/[0.04] rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(selectedCustomers);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setSelectedCustomers(next);
                    }}
                    className={checkboxCls}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{c.customer_name}</span>
                    <span className="text-xs text-zinc-500 dark:text-slate-400">{c.customer_code}</span>
                  </div>
                </label>
              ))}
              {customers.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">Không có khách hàng nào</p>}
            </div>
          </div>

          {/* Templates column */}
          <div className="flex flex-col h-full border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="bg-violet-50 dark:bg-violet-500/5 px-4 py-2 font-medium flex justify-between items-center border-b border-zinc-200 dark:border-white/[0.07]">
              <span>Mẫu Dữ Liệu ({selectedTemplates.size}/{allTemplates.length})</span>
              <button
                onClick={() => setSelectedTemplates(selectedTemplates.size === allTemplates.length ? new Set() : new Set(allTemplates.map((t) => t.id)))}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {selectedTemplates.size === allTemplates.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {allTemplates.map((t) => (
                <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-violet-50 dark:hover:bg-white/[0.04] rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(selectedTemplates);
                      if (e.target.checked) next.add(t.id);
                      else next.delete(t.id);
                      setSelectedTemplates(next);
                    }}
                    className={checkboxCls}
                  />
                  <span className="text-sm">{t.name}</span>
                </label>
              ))}
              {allTemplates.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">Chưa có mẫu nào</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-zinc-100 dark:border-white/[0.07] p-6">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors">
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || (selectedCustomers.size === 0 && selectedTemplates.size === 0)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:shadow-md hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-50 transition-all duration-200"
          >
            {exporting ? "Đang xử lý..." : `Xuất File ${exportFormat.toUpperCase()}`}
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
