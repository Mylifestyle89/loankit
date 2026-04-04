"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { METHOD_SHORT_LABELS } from "@/lib/loan-plan/loan-plan-constants";
import { inputCls } from "@/app/report/customers/[id]/components/shared-form-styles";

type LoanProduct = {
  id: string;
  code: string;
  name: string;
  customer_type: string;
  loan_method: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type FormData = Omit<LoanProduct, "id">;

const EMPTY_FORM: FormData = {
  code: "", name: "", customer_type: "individual", loan_method: "tung_lan",
  description: null, sort_order: 0, is_active: true,
};

const CUSTOMER_TYPES = [
  { value: "individual", label: "KHCN" },
  { value: "corporate", label: "KHDN" },
];

const LOAN_METHOD_OPTIONS = Object.entries(METHOD_SHORT_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const selectCls = `${inputCls} appearance-none`;

export function LoanProductsTab() {
  const [items, setItems] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/loan-products?all=true");
    const data = await res.json();
    if (data.ok) setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startCreate() {
    setCreating(true);
    setEditId(null);
    setForm({ ...EMPTY_FORM, sort_order: items.length + 1 });
  }

  function startEdit(p: LoanProduct) {
    setEditId(p.id);
    setCreating(false);
    const { id: _, ...rest } = p;
    setForm(rest);
  }

  function cancel() { setEditId(null); setCreating(false); }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editId ? `/api/loan-products/${editId}` : "/api/loan-products";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.ok) { alert(data.error ?? "Lỗi khi lưu"); return; }
      cancel();
      void load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá sản phẩm này?")) return;
    const res = await fetch(`/api/loan-products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) { alert(data.error ?? "Lỗi khi xoá"); return; }
    void load();
  }

  const methodLabel = (v: string) => METHOD_SHORT_LABELS[v] ?? v;
  const typeLabel = (v: string) => CUSTOMER_TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-slate-200">Sản phẩm tín dụng</h2>
        <button type="button" onClick={startCreate} className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
          <Plus className="h-3 w-3" /> Thêm sản phẩm
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-white/[0.06] text-left text-zinc-500 dark:text-slate-400">
                <th className="pb-2 pr-3 font-medium">Mã</th>
                <th className="pb-2 pr-3 font-medium">Tên sản phẩm</th>
                <th className="pb-2 pr-3 font-medium">Loại KH</th>
                <th className="pb-2 pr-3 font-medium">Phương thức</th>
                <th className="pb-2 pr-3 font-medium">Trạng thái</th>
                <th className="pb-2 font-medium w-20" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 dark:border-white/[0.03] hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-2 pr-3 font-mono text-violet-600 dark:text-violet-400">{p.code}</td>
                  <td className="py-2 pr-3">{p.name}</td>
                  <td className="py-2 pr-3">{typeLabel(p.customer_type)}</td>
                  <td className="py-2 pr-3">{methodLabel(p.loan_method)}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${p.is_active ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.05] dark:text-slate-400"}`}>
                      {p.is_active ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => startEdit(p)} className="p-1 rounded hover:bg-violet-50 dark:hover:bg-violet-500/10">
                      <Pencil className="h-3 w-3 text-zinc-400" />
                    </button>
                    <button type="button" onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 ml-1">
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit form */}
      {(creating || editId) && (
        <div className="rounded-lg border border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-violet-700 dark:text-violet-400">
            {creating ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-500">Mã sản phẩm</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="VD: KHCN-VLD-TL" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Tên sản phẩm</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="VD: Cho vay bổ sung VLĐ..." />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Loại khách hàng</span>
              <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })} className={selectCls}>
                {CUSTOMER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Phương thức cho vay</span>
              <select value={form.loan_method} onChange={(e) => setForm({ ...form, loan_method: e.target.value })} className={selectCls}>
                {LOAN_METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-zinc-500">Mô tả (tuỳ chọn)</span>
              <input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} className={inputCls} placeholder="Mô tả thêm..." />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              Hoạt động
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving || !form.code.trim() || !form.name.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              <Save className="h-3 w-3" /> {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button type="button" onClick={cancel} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/[0.09] px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
              <X className="h-3 w-3" /> Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
