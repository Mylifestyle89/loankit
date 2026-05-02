"use client";

import { useState } from "react";
import { inputCls, btnCls } from "./shared-form-styles";
import { SmartField } from "@/components/smart-field";

/* ── Types ── */

export type StaffData = {
  relationship_officer: string;
  appraiser: string;
  approver_name: string;
  approver_title: string;
};

/* ── Staff Subtab ── */

export function StaffSection({ initial }: { initial: StaffData }) {
  const [form, setForm] = useState<StaffData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      // Save to global config → syncs all customers
      const res = await fetch("/api/config/branch-staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveError(data.error ?? "Lưu thất bại");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Bộ phận làm hồ sơ</h3>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Cán bộ quan hệ khách hàng</span>
        <SmartField
          fieldKey="branch.relationship_officer"
          value={form.relationship_officer}
          onChange={(val) => setForm((p) => ({ ...p, relationship_officer: val }))}
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Người thẩm định</span>
        <SmartField
          fieldKey="branch.appraiser"
          value={form.appraiser}
          onChange={(val) => setForm((p) => ({ ...p, appraiser: val }))}
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Người phê duyệt</span>
          <SmartField
            fieldKey="branch.approver_name"
            value={form.approver_name}
            onChange={(val) => setForm((p) => ({ ...p, approver_name: val }))}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Chức vụ</span>
          <SmartField
            fieldKey="branch.approver_title"
            value={form.approver_title}
            onChange={(val) => setForm((p) => ({ ...p, approver_title: val }))}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={handleSave} disabled={saving} className={`${btnCls} bg-brand-500 text-white shadow-sm`}>
          {saving ? "..." : "Lưu"}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Đã lưu</span>}
        {saveError && <span className="text-xs text-red-600 dark:text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}
