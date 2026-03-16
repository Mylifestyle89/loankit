"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { btnCls } from "./shared-form-styles";
import { DropdownOptionsProvider } from "@/lib/hooks/dropdown-options-context";
import { type CollateralItem } from "./collateral-config";
import { CollateralForm } from "./collateral-form";
import { CollateralRow } from "./collateral-display";

export function CustomerCollateralSection({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<CollateralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}/collaterals`);
    const data = await res.json();
    if (data.ok) setItems(data.collaterals ?? []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <DropdownOptionsProvider prefix="collateral.">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tài sản bảo đảm ({items.length})</h3>
          <button type="button" onClick={() => setShowForm(true)}
            className={`${btnCls} inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-500/25 hover:brightness-110`}>
            <Plus className="h-3.5 w-3.5" /> Thêm TSBĐ
          </button>
        </div>

        {showForm && (
          <CollateralForm customerId={customerId}
            onSaved={() => { setShowForm(false); void load(); }}
            onCancel={() => setShowForm(false)} />
        )}

        {items.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.08] py-8 text-center">
            <p className="text-sm text-zinc-400 dark:text-slate-500">Chưa có tài sản bảo đảm nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <CollateralRow key={item.id} item={item} customerId={customerId} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </DropdownOptionsProvider>
  );
}
