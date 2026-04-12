"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BaseModal } from "@/components/ui/base-modal";

type Plan = { id: string; name: string; status: string; financials_json: string };

type Props = {
  open: boolean;
  customerId: string;
  onClose: () => void;
  /** Khi được cung cấp: gọi callback thay vì navigate (dùng cho assign loan hiện có) */
  onSelect?: (planId: string | null) => void;
};

export function LoanPlanSelectorModal({ open, customerId, onClose, onSelect }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/loan-plans?customerId=${customerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPlans(d.plans ?? []); })
      .finally(() => setLoading(false));
  }, [open, customerId]);

  function handleContinue() {
    if (onSelect) {
      onSelect(selected);
    } else {
      const base = `/report/loans/new?customerId=${customerId}`;
      router.push(selected ? `${base}&planId=${selected}` : base);
    }
    onClose();
  }

  function getLoanAmount(plan: Plan) {
    try {
      const fin = JSON.parse(plan.financials_json || "{}");
      return fin.loanAmount ? `${(fin.loanAmount / 1_000_000).toFixed(0)}tr` : "";
    } catch { return ""; }
  }

  const footer = (
    <div className="flex gap-2">
      <button
        onClick={handleContinue}
        className="flex-1 rounded-lg bg-brand-500 text-white text-sm font-medium py-2 hover:bg-brand-600 transition-colors"
      >
        {selected ? "Tiếp tục với phương án này" : "Tiếp tục không có phương án"}
      </button>
      <button
        onClick={onClose}
        className="px-4 rounded-lg border border-zinc-200 dark:border-white/[0.09] text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
      >
        Hủy
      </button>
    </div>
  );

  return (
    <BaseModal open={open} onClose={onClose} title="Chọn phương án vay vốn" maxWidthClassName="max-w-md" footer={footer}>
      {loading ? (
        <p className="text-sm text-zinc-400 py-2">Đang tải...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-zinc-400 py-2">Chưa có phương án nào.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {plans.map((p) => {
            const loanAmt = getLoanAmount(p); // compute once per plan
            return (
              <label
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected === p.id
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-zinc-200 dark:border-white/[0.08] hover:border-brand-300"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={selected === p.id}
                  onChange={() => setSelected(p.id)}
                  className="h-4 w-4 text-brand-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{p.name}</p>
                  <p className="text-xs text-zinc-400">
                    {loanAmt}
                    {loanAmt && " · "}
                    <span className={p.status === "approved"
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"}>
                      {p.status === "approved" ? "Đã duyệt" : "Nháp"}
                    </span>
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </BaseModal>
  );
}
