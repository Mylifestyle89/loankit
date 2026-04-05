"use client";

import { useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import { inputCls, btnCls } from "./shared-form-styles";

/* ── Types ── */

export type BranchItem = {
  id: string;
  name: string;
  name_uppercase: string | null;
  address: string | null;
  branch_code: string | null;
  phone: string | null;
  fax: string | null;
  tax_code: string | null;
  tax_issued_date: string | null;
  tax_issued_place: string | null;
  district: string | null;
  province: string | null;
};

export const BRANCH_FIELDS: { key: keyof Omit<BranchItem, "id">; label: string }[] = [
  { key: "name", label: "Tên chi nhánh/PGD" },
  { key: "name_uppercase", label: "Tên gọi in hoa" },
  { key: "address", label: "Địa chỉ trụ sở" },
  { key: "branch_code", label: "Mã CN" },
  { key: "phone", label: "Điện thoại" },
  { key: "fax", label: "Fax" },
  { key: "tax_code", label: "Mã số thuế CN" },
  { key: "tax_issued_date", label: "Ngày cấp MST" },
  { key: "tax_issued_place", label: "Nơi cấp MST" },
  { key: "district", label: "Quận/Huyện" },
  { key: "province", label: "Tỉnh/TP" },
];

/* ── Branch Form ── */

export function BranchForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: BranchItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const f of BRANCH_FIELDS) obj[f.key] = (initial as Record<string, string | null> | undefined)?.[f.key] ?? "";
    return obj;
  });
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    setError("");
    try {
      const url = initial ? `/api/branches/${initial.id}` : "/api/branches";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "Lỗi không xác định"); return; }
      onSaved();
    } catch { setError("Lỗi kết nối"); } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {BRANCH_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {f.label}{f.key === "name" ? " *" : ""}
            </span>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className={inputCls}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className={`${btnCls} bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-sm`}>
          {saving ? "..." : initial ? "Cập nhật" : "Thêm"}
        </button>
        <button type="button" onClick={onCancel} className={`${btnCls} border border-zinc-200 dark:border-white/[0.09]`}>
          Hủy
        </button>
      </div>
    </div>
  );
}

/* ── Branch Card (select-active pattern) ── */

export function BranchCard({
  item,
  isActive,
  onSelect,
  onRefresh,
}: {
  item: BranchItem;
  isActive: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Xóa chi nhánh này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { alert(data.error ?? "Xóa thất bại"); return; }
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <BranchForm
        initial={item}
        onSaved={() => { setEditing(false); onRefresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        isActive
          ? "border-amber-400 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/10 ring-1 ring-amber-400/30"
          : "border-zinc-200 dark:border-white/[0.07] hover:border-amber-200 dark:hover:border-amber-500/20"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isActive && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            <span className="text-sm font-semibold">{item.name}</span>
            {item.branch_code && <span className="text-xs text-zinc-400">({item.branch_code})</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mt-1">
            {BRANCH_FIELDS.slice(1).map((f) => {
              const val = (item as unknown as Record<string, string | null>)[f.key];
              if (!val) return null;
              return (
                <div key={f.key} className="flex flex-col">
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{f.label}</span>
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-white/[0.05]">
            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
