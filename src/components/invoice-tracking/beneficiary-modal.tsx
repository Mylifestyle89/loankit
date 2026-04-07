"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type Beneficiary = {
  id: string;
  name: string;
  accountNumber: string | null;
  bankName: string | null;
};

type Props = {
  loanId: string;
  contractNumber: string;
  onClose: () => void;
};

type ImportRow = { name: string; accountNumber: string; bankName: string };

const thCls = "px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-slate-400";
const tdCls = "px-3 py-1.5";
const inputCls =
  "w-full rounded border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-2 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
const btnCls =
  "cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

export function BeneficiaryModal({ loanId, contractNumber, onClose }: Props) {
  const { t } = useLanguage();

  const [rows, setRows] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New row being added inline
  const [newName, setNewName] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [newBank, setNewBank] = useState("");

  // Excel import state
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadBeneficiaries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${loanId}/beneficiaries`);
      const data = await res.json();
      if (data.ok) setRows(data.beneficiaries ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [loanId]);

  useEffect(() => { void loadBeneficiaries(); }, [loadBeneficiaries]);

  // --- Add new row ---
  async function handleAddRow() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/loans/${loanId}/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          accountNumber: newAccount.trim() || undefined,
          bankName: newBank.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
      setRows((prev) => [...prev, data.beneficiary]);
      setNewName(""); setNewAccount(""); setNewBank("");
    } catch { setError("Network error."); }
    setSaving(false);
  }

  // --- Delete row ---
  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/beneficiaries/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) setRows((prev) => prev.filter((r) => r.id !== id));
      else setError(data.error ?? "Failed to delete.");
    } catch { setError("Network error."); }
  }

  // --- Excel import ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Parse client-side with dynamic import
    parseExcel(file);
    e.target.value = "";
  }

  async function parseExcel(file: File) {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

      const NAME_ALIASES = ["đơn vị thụ hưởng", "tên đơn vị", "tên", "name", "beneficiary"];
      const ACCOUNT_ALIASES = ["số tài khoản", "stk", "account", "account number"];
      const BANK_ALIASES = ["ngân hàng thụ hưởng", "ngân hàng", "bank", "bank name"];

      function findHeader(headers: string[], aliases: string[]) {
        return headers.find((h) => aliases.some((a) => h.toLowerCase().includes(a)));
      }

      const headers = Object.keys(json[0] ?? {});
      const nameKey = findHeader(headers, NAME_ALIASES);
      const accountKey = findHeader(headers, ACCOUNT_ALIASES);
      const bankKey = findHeader(headers, BANK_ALIASES);

      if (!nameKey) { setError("Không tìm thấy cột 'Đơn vị thụ hưởng' trong file."); return; }

      const parsed: ImportRow[] = json
        .map((r) => ({
          name: String(r[nameKey] ?? "").trim(),
          accountNumber: accountKey ? String(r[accountKey] ?? "").trim() : "",
          bankName: bankKey ? String(r[bankKey] ?? "").trim() : "",
        }))
        .filter((r) => r.name);

      if (parsed.length === 0) { setError("File không có dữ liệu hợp lệ."); return; }
      setImportPreview(parsed);
      setError("");
    } catch { setError("Không đọc được file Excel."); }
  }

  async function handleConfirmImport() {
    if (!importPreview?.length) return;
    setImporting(true);
    setError("");
    try {
      const formData = new FormData();
      // Send as JSON since we already parsed client-side — use the server bulk route
      const res = await fetch(`/api/loans/${loanId}/beneficiaries/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: importPreview }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Import failed."); setImporting(false); return; }
      setImportPreview(null);
      void loadBeneficiaries();
    } catch { setError("Network error."); }
    setImporting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-[#141414]/90 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.07] px-6 py-4">
          <h3 className="text-lg font-semibold">
            {t("beneficiaries.title") ?? "Đơn vị thụ hưởng"} - {contractNumber}
          </h3>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-white/[0.06]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-200 dark:border-white/[0.07]">
          <button type="button" onClick={() => fileRef.current?.click()} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09] hover:bg-brand-50/50 dark:hover:bg-white/[0.06] flex items-center gap-1.5`}>
            <Upload className="h-3.5 w-3.5" /> {t("beneficiaries.importExcel") ?? "Import Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-3">
          {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {/* Import Preview */}
          {importPreview && (
            <div className="mb-4 rounded-lg border border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-800/20 p-3">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">
                {t("beneficiaries.importPreview") ?? "Xem trước"}: {importPreview.length} {t("beneficiaries.rows") ?? "dòng"}
              </p>
              <div className="max-h-40 overflow-auto rounded border border-brand-200 dark:border-brand-600/30">
                <table className="w-full text-sm">
                  <thead><tr className="bg-brand-100 dark:bg-brand-800/30">
                    <th className={thCls}>{t("beneficiaries.name") ?? "Đơn vị thụ hưởng"}</th>
                    <th className={thCls}>{t("beneficiaries.accountNumber") ?? "Số tài khoản"}</th>
                    <th className={thCls}>{t("beneficiaries.bankName") ?? "Ngân hàng"}</th>
                  </tr></thead>
                  <tbody>
                    {importPreview.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-brand-200 dark:border-brand-600/30">
                        <td className={tdCls}>{r.name}</td>
                        <td className={tdCls}>{r.accountNumber || "—"}</td>
                        <td className={tdCls}>{r.bankName || "—"}</td>
                      </tr>
                    ))}
                    {importPreview.length > 10 && (
                      <tr><td colSpan={3} className="px-3 py-1 text-xs text-brand-500 dark:text-brand-400">...+{importPreview.length - 10} dòng</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={handleConfirmImport} disabled={importing} className={`${btnCls} bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50`}>
                  {importing ? "Importing..." : (t("beneficiaries.confirmImport") ?? "Xác nhận import")}
                </button>
                <button type="button" onClick={() => setImportPreview(null)} className={`${btnCls} text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]`}>
                  {t("common.cancel") ?? "Hủy"}
                </button>
              </div>
            </div>
          )}

          {/* Beneficiary table */}
          {loading ? (
            <p className="text-sm text-zinc-500 dark:text-slate-400">{t("loans.loading") ?? "Đang tải..."}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/[0.07]">
                  <th className={thCls}>{t("beneficiaries.name") ?? "Đơn vị thụ hưởng"}</th>
                  <th className={thCls}>{t("beneficiaries.accountNumber") ?? "Số tài khoản"}</th>
                  <th className={thCls}>{t("beneficiaries.bankName") ?? "Ngân hàng"}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-200 dark:border-white/[0.07] hover:bg-brand-50/30 dark:hover:bg-white/[0.04] transition-colors duration-150">
                    <td className={tdCls}>{r.name}</td>
                    <td className={tdCls}>{r.accountNumber || "—"}</td>
                    <td className={tdCls}>{r.bankName || "—"}</td>
                    <td className={tdCls}>
                      <button type="button" onClick={() => handleDelete(r.id)} className="cursor-pointer rounded p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-150">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Inline add row */}
                <tr className="border-t border-dashed border-zinc-200 dark:border-white/[0.07]">
                  <td className={tdCls}>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("beneficiaries.namePlaceholder") ?? "Tên đơn vị..."} className={inputCls}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRow(); } }} />
                  </td>
                  <td className={tdCls}>
                    <input type="text" value={newAccount} onChange={(e) => setNewAccount(e.target.value)} placeholder={t("beneficiaries.accountPlaceholder") ?? "Số TK..."} className={inputCls}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRow(); } }} />
                  </td>
                  <td className={tdCls}>
                    <input type="text" value={newBank} onChange={(e) => setNewBank(e.target.value)} placeholder={t("beneficiaries.bankPlaceholder") ?? "Ngân hàng..."} className={inputCls}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRow(); } }} />
                  </td>
                  <td className={tdCls}>
                    <button type="button" onClick={handleAddRow} disabled={saving || !newName.trim()} className="cursor-pointer rounded p-1 text-brand-500 hover:text-brand-500 disabled:opacity-30 transition-colors duration-150">
                      <Plus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-zinc-200 dark:border-white/[0.07] px-6 py-3">
          <button type="button" onClick={onClose} className={`${btnCls} text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]`}>
            {t("common.close") ?? "Đóng"}
          </button>
        </div>
      </div>
    </div>
  );
}
