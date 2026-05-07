"use client";

import { useState } from "react";
import { Shield, Check } from "lucide-react";

import { COLLATERAL_TYPES } from "@/app/report/customers/[id]/components/collateral-config";

export type PickerCollateral = {
  id: string;
  name: string;
  collateral_type: string;
  total_value: number | null;
  obligation: number | null;
};

type Props = {
  collaterals: PickerCollateral[];
  initialSelectedIds: string[];
  onSave: (selectedIds: string[]) => Promise<void>;
};

const TYPE_LABELS = Object.fromEntries(COLLATERAL_TYPES.map((t) => [t.value, t.label]));

function fmtVND(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function LoanCollateralPicker({ collaterals, initialSelectedIds, onSave }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Group by type
  const grouped = collaterals.reduce<Record<string, PickerCollateral[]>>((acc, c) => {
    (acc[c.collateral_type] ??= []).push(c);
    return acc;
  }, {});

  const hasChanged = (() => {
    const initial = new Set(initialSelectedIds);
    if (initial.size !== selectedIds.size) return true;
    for (const id of selectedIds) if (!initial.has(id)) return true;
    return false;
  })();

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  }

  function toggleAll() {
    if (selectedIds.size === collaterals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(collaterals.map((c) => c.id)));
    }
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await onSave(Array.from(selectedIds));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // Running totals
  const selected = collaterals.filter((c) => selectedIds.has(c.id));
  const totalValue = selected.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const totalObl = selected.reduce((s, c) => s + (c.obligation ?? 0), 0);

  if (collaterals.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary-500 dark:text-primary-400" />
          <h3 className="text-sm font-semibold">Tài sản bảo đảm cho khoản vay</h3>
          <span className="text-xs text-zinc-400">({selectedIds.size}/{collaterals.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleAll}
            className="text-xs text-primary-500 dark:text-primary-400 hover:underline">
            {selectedIds.size === collaterals.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !hasChanged}
            className="rounded-lg bg-primary-500 px-3 py-1 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center gap-1">
            {saved ? <><Check className="h-3 w-3" /> Đã lưu</> : saving ? "..." : "Lưu"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-1.5">{error}</p>
      )}

      {selectedIds.size === 0 && (
        <p className="text-xs text-primary-500 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 rounded-lg px-3 py-1.5">
          Chưa chọn TSBĐ — sẽ dùng tất cả khi xuất báo cáo
        </p>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <p className="text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1.5">
            {TYPE_LABELS[type] ?? type}
          </p>
          <div className="space-y-1">
            {items.map((c) => (
              <label key={c.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                  selectedIds.has(c.id)
                    ? "border-primary-300 dark:border-primary-500/30 bg-primary-50/50 dark:bg-primary-500/5"
                    : "border-zinc-100 dark:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                }`}>
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c.id)}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-primary-500 focus:ring-primary-500" />
                <span className="flex-1 min-w-0 truncate text-sm">{c.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-slate-400">
                  {fmtVND(c.total_value)} đ
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {selectedIds.size > 0 && (
        <div className="flex gap-4 pt-2 border-t border-zinc-100 dark:border-white/[0.06] text-xs">
          <span className="text-zinc-500 dark:text-slate-400">
            Tổng giá trị: <strong className="text-zinc-700 dark:text-slate-200">{fmtVND(totalValue)} đ</strong>
          </span>
          <span className="text-zinc-500 dark:text-slate-400">
            Tổng NVBĐ: <strong className="text-zinc-700 dark:text-slate-200">{fmtVND(totalObl)} đ</strong>
          </span>
        </div>
      )}
    </div>
  );
}
