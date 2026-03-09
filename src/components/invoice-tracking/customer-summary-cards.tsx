"use client";

import { useState } from "react";
import { fmtDisplay as fmt } from "@/lib/invoice-tracking-format-helpers";

type CustomerSummary = {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  totalInvoices: number;
  totalAmount: number;
  pendingCount: number;
  overdueCount: number;
};

type Props = {
  customers: CustomerSummary[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onEmailUpdated: () => void;
};

export function CustomerSummaryCards({ customers, selectedCustomerId, onSelectCustomer, onEmailUpdated }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-slate-300">Theo khách hàng</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <CustomerCard
            key={c.customerId}
            customer={c}
            isSelected={selectedCustomerId === c.customerId}
            onSelect={onSelectCustomer}
            onEmailUpdated={onEmailUpdated}
          />
        ))}
      </div>
    </div>
  );
}

function CustomerCard({
  customer: c,
  isSelected,
  onSelect,
  onEmailUpdated,
}: {
  customer: CustomerSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEmailUpdated: () => void;
}) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState(c.customerEmail ?? "");
  const [saving, setSaving] = useState(false);

  async function saveEmail() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${c.customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Lưu email thất bại");
        return;
      }
      setEditingEmail(false);
      onEmailUpdated();
    } catch {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const borderColor = isSelected
    ? "border-violet-400 dark:border-violet-500/50 ring-2 ring-violet-500/20"
    : "border-zinc-200 dark:border-white/[0.07]";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(isSelected ? "" : c.customerId)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(isSelected ? "" : c.customerId); } }}
      className={`cursor-pointer text-left rounded-xl border ${borderColor} bg-white dark:bg-[#161616] p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-500/20`}
    >
      <div className="flex items-start justify-between">
        <p className="font-semibold text-sm truncate">{c.customerName}</p>
        {c.overdueCount > 0 && (
          <span className="ml-2 shrink-0 rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
            {c.overdueCount} quá hạn
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-3 text-xs text-zinc-500 dark:text-slate-400">
        <span>{c.totalInvoices} HĐ</span>
        <span>{c.pendingCount} chờ</span>
        <span className="font-medium text-zinc-700 dark:text-slate-300">{fmt(c.totalAmount)} VND</span>
      </div>

      {/* Email section */}
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        {editingEmail ? (
          <div className="flex gap-1.5">
            <input
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded border border-zinc-300 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") void saveEmail(); if (e.key === "Escape") setEditingEmail(false); }}
            />
            <button type="button" onClick={() => void saveEmail()} disabled={saving}
              className="cursor-pointer rounded bg-violet-500 px-2 py-1 text-xs text-white hover:bg-violet-600 disabled:opacity-50">
              {saving ? "..." : "Lưu"}
            </button>
            <button type="button" onClick={() => setEditingEmail(false)}
              className="cursor-pointer rounded border border-zinc-300 dark:border-white/[0.09] px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-white/[0.05]">
              Hủy
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingEmail(true)}
            className="cursor-pointer text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            {c.customerEmail ? `✉ ${c.customerEmail}` : "+ Thêm email"}
          </button>
        )}
      </div>
    </div>
  );
}
