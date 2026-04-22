"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { BaseModal } from "@/components/ui/base-modal";

type CustomerSummary = {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
};

type Props = {
  customers: CustomerSummary[];
  onClose: () => void;
  onEmailUpdated: () => void;
};

function EmailRow({ customer: c, onSaved }: { customer: CustomerSummary; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(c.customerEmail ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${c.customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Lưu email thất bại");
        return;
      }
      setEditing(false);
      onSaved();
    } catch {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
      <p className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-slate-200">
        {c.customerName}
      </p>

      {editing ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            autoFocus
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="email@example.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-52 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-2.5 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            title="Lưu"
            className="cursor-pointer rounded-md bg-brand-500 p-1.5 text-white hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setValue(c.customerEmail ?? ""); }}
            title="Hủy"
            className="cursor-pointer rounded-md border border-zinc-200 dark:border-white/10 p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-xs ${c.customerEmail ? "text-zinc-500 dark:text-slate-400" : "text-zinc-300 dark:text-slate-600"}`}>
            {c.customerEmail ?? "Chưa có email"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Chỉnh sửa"
            className="cursor-pointer rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-600 dark:hover:text-slate-300 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function CustomerEmailSettingsModal({ customers, onClose, onEmailUpdated }: Props) {
  const withEmail = customers.filter((c) => c.customerEmail);
  const withoutEmail = customers.filter((c) => !c.customerEmail);
  const sorted = [...withoutEmail, ...withEmail]; // ưu tiên hiện KH chưa có email lên trước

  return (
    <BaseModal open onClose={onClose} title="Email thông báo" maxWidthClassName="max-w-lg">
      <p className="mb-3 text-xs text-zinc-400 dark:text-slate-500">
        Email nhận thông báo hóa đơn đến hạn và quá hạn cho từng khách hàng.
      </p>

      <div className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
        {sorted.map((c) => (
          <EmailRow key={c.customerId} customer={c} onSaved={onEmailUpdated} />
        ))}
      </div>

      {customers.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-slate-500">
          Không có khách hàng nào.
        </p>
      )}
    </BaseModal>
  );
}
