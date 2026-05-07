"use client";

/**
 * loan-plan-card.tsx
 *
 * Card hiển thị phương án vay vốn gắn với khoản vay,
 * style giống LoanCollateralPicker — card section thay vì nút bấm.
 */

import { FileText, Plus, X, ExternalLink } from "lucide-react";
import Link from "next/link";

type LoanPlanInfo = { id: string; name: string };

type Props = {
  loanPlan: LoanPlanInfo | null;
  customerId: string;
  onAssign: () => void;
  onUnassign: () => void;
};

export function LoanPlanCard({ loanPlan, customerId, onAssign, onUnassign }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-500 dark:text-primary-400" />
          <h3 className="text-sm font-semibold">Phương án vay vốn</h3>
        </div>
        {loanPlan ? (
          <button
            type="button"
            onClick={onUnassign}
            className="text-xs text-red-500 hover:underline flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Bỏ gắn
          </button>
        ) : (
          <button
            type="button"
            onClick={onAssign}
            className="rounded-lg bg-primary-500 px-3 py-1 text-xs font-medium text-white hover:bg-primary-600 transition-all flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Gắn phương án
          </button>
        )}
      </div>

      {loanPlan ? (
        <Link
          href={`/report/customers/${customerId}/loan-plans/${loanPlan.id}`}
          className="flex items-center gap-3 rounded-lg border border-primary-300 dark:border-primary-500/30 bg-primary-50/50 dark:bg-primary-500/5 px-3 py-2.5 transition-colors hover:bg-primary-100/50 dark:hover:bg-primary-500/10"
        >
          <FileText className="h-4 w-4 shrink-0 text-primary-500 dark:text-primary-400" />
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-primary-700 dark:text-primary-300">
            {loanPlan.name}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary-400 dark:text-primary-500" />
        </Link>
      ) : (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">
          Chưa gắn phương án — bấm &quot;Gắn phương án&quot; để chọn từ danh sách phương án của khách hàng.
        </p>
      )}
    </div>
  );
}
