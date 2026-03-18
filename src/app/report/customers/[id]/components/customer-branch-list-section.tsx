"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { btnCls } from "./shared-form-styles";
import { BranchForm, BranchCard, BranchItem } from "./customer-branch-form";

/* ── Branch List Subtab ── */

export function BranchListSection({
  activeBranchId,
  onActiveBranchChange,
}: {
  activeBranchId: string | null;
  onActiveBranchChange: (id: string | null) => void;
}) {
  const [items, setItems] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/branches");
    const data = await res.json();
    if (data.ok) setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function selectBranch(branchId: string) {
    const newId = branchId === activeBranchId ? null : branchId;
    const prevId = activeBranchId;
    onActiveBranchChange(newId);
    try {
      const res = await fetch("/api/config/branch-staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_branch_id: newId }),
      });
      const data = await res.json();
      if (!data.ok) { onActiveBranchChange(prevId); alert(data.error ?? "Lỗi lưu"); }
    } catch { onActiveBranchChange(prevId); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Chi nhánh/PGD ({items.length})
          {activeBranchId && <span className="ml-2 text-xs text-violet-600 dark:text-violet-400">• 1 đang chọn</span>}
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`${btnCls} inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/25 hover:brightness-110`}
        >
          <Plus className="h-3.5 w-3.5" /> Thêm CN/PGD
        </button>
      </div>

      {showForm && (
        <BranchForm
          onSaved={() => { setShowForm(false); void load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có chi nhánh nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <BranchCard
              key={item.id}
              item={item}
              isActive={item.id === activeBranchId}
              onSelect={() => selectBranch(item.id)}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
