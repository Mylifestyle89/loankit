"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, Plus, X } from "lucide-react";
import { KHCN_DISBURSEMENT_TEMPLATES, type KhcnDisbursementTemplateKey } from "@/services/khcn-disbursement-template-config";

type Disbursement = {
  id: string;
  amount: number;
  disbursementDate: string;
  status: string;
  description: string | null;
  purpose: string | null;
  debtAmount: number | null;
  currentOutstanding: number | null;
};

type Props = {
  customerId: string;
  loanId: string | null;
};

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("vi-VN");
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const TEMPLATE_KEYS = Object.keys(KHCN_DISBURSEMENT_TEMPLATES) as KhcnDisbursementTemplateKey[];

export function CustomerDisbursementSection({ customerId, loanId }: Props) {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    amount: "",
    disbursementDate: new Date().toISOString().split("T")[0],
    purpose: "",
    debtAmount: "",
    currentOutstanding: "",
    description: "",
  });

  const loadDisbursements = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${loanId}/disbursements`);
      const data = await res.json() as { ok: boolean; disbursements?: Disbursement[] };
      if (data.ok) setDisbursements(data.disbursements ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [loanId]);

  useEffect(() => { void loadDisbursements(); }, [loadDisbursements]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!loanId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/loans/${loanId}/disbursements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          disbursementDate: form.disbursementDate,
          purpose: form.purpose || null,
          debtAmount: form.debtAmount ? Number(form.debtAmount) : null,
          currentOutstanding: form.currentOutstanding ? Number(form.currentOutstanding) : null,
          description: form.description || null,
          status: "active",
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? "Lỗi tạo giải ngân"); return; }
      setShowForm(false);
      setForm({ amount: "", disbursementDate: new Date().toISOString().split("T")[0], purpose: "", debtAmount: "", currentOutstanding: "", description: "" });
      await loadDisbursements();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  async function handleGenerate(templateKey: KhcnDisbursementTemplateKey, disbursementId?: string) {
    setGenerating(templateKey);
    setError("");
    try {
      const res = await fetch("/api/report/templates/khcn/disbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, loanId, templateKey, disbursementId }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setError(err.error ?? "Lỗi tạo file");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename\*=UTF-8''(.+)/.exec(cd);
      const filename = match ? decodeURIComponent(match[1]) : `giai_ngan_${templateKey}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { setError("Network error"); }
    finally { setGenerating(null); }
  }

  if (!loanId) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6">
        <p className="text-sm text-zinc-400">Chưa có khoản vay. Hãy tạo khoản vay trước.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-slate-200">Lịch sử giải ngân</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo giải ngân
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Tạo lần giải ngân mới</p>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-zinc-400" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <label className="block col-span-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">Số tiền giải ngân *</span>
              <input type="number" required value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm" />
            </label>
            <label className="block col-span-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">Ngày giải ngân *</span>
              <input type="date" required value={form.disbursementDate} onChange={(e) => setForm((p) => ({ ...p, disbursementDate: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">Mục đích giải ngân</span>
              <input type="text" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm" />
            </label>
            <label className="block col-span-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">Dư nợ hiện tại</span>
              <input type="number" value={form.currentOutstanding} onChange={(e) => setForm((p) => ({ ...p, currentOutstanding: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm" />
            </label>
            <label className="block col-span-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">Số tiền nhận nợ</span>
              <input type="number" value={form.debtAmount} onChange={(e) => setForm((p) => ({ ...p, debtAmount: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-slate-300">Ghi chú</span>
              <input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full rounded-md border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-sm" />
            </label>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={saving}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
                {saving ? "..." : "Lưu"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-lg border border-zinc-200 dark:border-white/[0.09] px-4 py-1.5 text-xs text-zinc-600 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disbursement history */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        </div>
      ) : disbursements.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 text-center">
          <p className="text-sm text-zinc-400">Chưa có lần giải ngân nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disbursements.map((d) => (
            <div key={d.id} className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{formatVND(d.amount)} đ</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{formatDate(d.disbursementDate)}</p>
                  {d.purpose && <p className="text-xs text-zinc-500 dark:text-slate-400">Mục đích: {d.purpose}</p>}
                  {d.currentOutstanding != null && (
                    <p className="text-xs text-zinc-500 dark:text-slate-400">Dư nợ HT: {formatVND(d.currentOutstanding)} đ</p>
                  )}
                </div>
              </div>

              {/* Template generate buttons for this disbursement */}
              <div className="border-t border-zinc-100 dark:border-white/[0.05] pt-3">
                <p className="text-xs font-medium text-zinc-500 dark:text-slate-400 mb-2">In mẫu biểu</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={generating === key}
                      onClick={() => handleGenerate(key, d.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] px-2.5 py-1 text-xs text-zinc-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-50 transition-colors"
                    >
                      <FileDown className="h-3 w-3" />
                      {KHCN_DISBURSEMENT_TEMPLATES[key].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick generate without specific disbursement (use latest) */}
      {disbursements.length > 0 && (
        <div className="rounded-xl border border-zinc-100 dark:border-white/[0.05] bg-zinc-50/50 dark:bg-white/[0.02] p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-slate-400 mb-2">In mẫu theo dữ liệu mới nhất</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_KEYS.map((key) => (
              <button
                key={`quick-${key}`}
                type="button"
                disabled={generating === key}
                onClick={() => handleGenerate(key)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-2.5 py-1 text-xs text-zinc-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-50 transition-colors"
              >
                <FileDown className="h-3 w-3" />
                {KHCN_DISBURSEMENT_TEMPLATES[key].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
