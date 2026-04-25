# Phase 02 — Modal Selector + Button Hook

## Overview
Tạo `loan-plan-selector-modal.tsx` + hook nút "Thêm khoản vay" trong customer-loans-section để mở modal.

## Files

### 1. NEW: `src/app/report/customers/[id]/components/loan-plan-selector-modal.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; name: string; status: string; financials_json: string };

export function LoanPlanSelectorModal({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/loan-plans?customerId=${customerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPlans(d.plans); })
      .finally(() => setLoading(false));
  }, [customerId]);

  function handleContinue() {
    const base = `/report/loans/new?customerId=${customerId}`;
    router.push(selected ? `${base}&planId=${selected}` : base);
    onClose();
  }

  // Extract loanAmount from financials_json for display
  function getLoanAmount(plan: Plan) {
    try {
      const fin = JSON.parse(plan.financials_json || "{}");
      return fin.loanAmount ? `${(fin.loanAmount / 1_000_000).toFixed(0)}tr` : "";
    } catch { return ""; }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
          Chọn phương án vay vốn
        </h3>

        {loading ? (
          <p className="text-sm text-zinc-400">Đang tải...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có phương án nào.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {plans.map((p) => (
              <label key={p.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${selected === p.id
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-zinc-200 dark:border-white/[0.08] hover:border-brand-300"}`}>
                <input type="radio" name="plan" value={p.id}
                  checked={selected === p.id}
                  onChange={() => setSelected(p.id)}
                  className="h-4 w-4 text-brand-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{p.name}</p>
                  <p className="text-xs text-zinc-400">
                    {getLoanAmount(p)}
                    {getLoanAmount(p) && " · "}
                    <span className={p.status === "approved"
                      ? "text-green-600 dark:text-green-400"
                      : "text-amber-600 dark:text-amber-400"}>
                      {p.status === "approved" ? "Đã duyệt" : "Nháp"}
                    </span>
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={handleContinue}
            className="flex-1 rounded-lg bg-brand-500 text-white text-sm font-medium py-2 hover:bg-brand-600 transition-colors">
            {selected ? "Tiếp tục với phương án này" : "Tiếp tục không có phương án"}
          </button>
          <button onClick={onClose}
            className="px-4 rounded-lg border border-zinc-200 dark:border-white/[0.09] text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2. MODIFY: `src/app/report/customers/[id]/components/customer-loans-section.tsx`

**Thêm state + modal trigger:**

```tsx
// Thêm import
import { LoanPlanSelectorModal } from "./loan-plan-selector-modal";

// Thêm state trong component
const [showPlanSelector, setShowPlanSelector] = useState(false);

// Thay Link "Thêm khoản vay" bằng button
<button
  onClick={() => setShowPlanSelector(true)}
  className="... bg-brand-500 ..."
>
  <Plus className="h-3.5 w-3.5" /> Thêm khoản vay
</button>

// Thêm modal ở cuối JSX
{showPlanSelector && (
  <LoanPlanSelectorModal
    customerId={customerId}
    onClose={() => setShowPlanSelector(false)}
  />
)}
```

## Todo

- [ ] Tạo file `loan-plan-selector-modal.tsx`
- [ ] Import + thêm state `showPlanSelector` vào `customer-loans-section.tsx`
- [ ] Thay `<Link href={addLoanHref}>` bằng `<button onClick={() => setShowPlanSelector(true)}>`
- [ ] Render `<LoanPlanSelectorModal>` conditionally
- [ ] Test: modal mở, list plans, chọn plan → navigate đúng URL, không chọn → navigate không có planId

## Notes
- Modal không block navigation khi plans = [] → user vẫn tạo được loan bình thường
- `getLoanAmount` fail-safe: try/catch, không crash nếu financials_json rỗng
