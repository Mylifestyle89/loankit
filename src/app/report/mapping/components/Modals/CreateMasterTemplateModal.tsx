"use client";

import { useMemo, useState } from "react";
import { BaseModal } from "@/components/ui/BaseModal";
import { useModalStore } from "@/lib/report/use-modal-store";

export function CreateMasterTemplateModal() {
  const isOpen = useModalStore((s) => s.isOpen && s.view === "createMasterTemplate");
  const data = useModalStore((s) => (s.view === "createMasterTemplate" ? s.data : null));
  const closeModal = useModalStore((s) => s.closeModal);

  const initialName = useMemo(() => {
    if (!data || !("initialName" in data)) return "";
    return data.initialName?.trim() ?? "";
  }, [data]);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveName = name || initialName;

  const onClose = () => {
    if (saving) return;
    setName("");
    setError("");
    closeModal();
  };

  const onSave = async () => {
    const nextName = effectiveName.trim();
    if (!nextName) {
      setError("Tên mẫu không được để trống.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/report/master-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          field_catalog: [],
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; master_template?: { id: string; name: string } };
      if (!json.ok || !json.master_template) {
        throw new Error(json.error ?? "Không thể tạo mẫu dữ liệu.");
      }
      if (data && "onSuccess" in data) {
        await data.onSuccess?.({ id: json.master_template.id, name: json.master_template.name });
      }
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không thể tạo mẫu dữ liệu.";
      setError(message);
      if (data && "onError" in data) {
        data.onError?.(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={Boolean(isOpen)}
      onClose={onClose}
      title="Tạo mẫu dữ liệu mới"
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50/80 disabled:opacity-60 dark:border-white/[0.07] dark:bg-[#141414]/90 dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Tạo mẫu"}
          </button>
        </div>
      }
    >
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="global-create-master-template-name">
        Tên mẫu
      </label>
      <input
        id="global-create-master-template-name"
        value={effectiveName}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nhập tên mẫu dữ liệu"
        className="mt-2 h-10 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100"
        autoFocus
      />
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </BaseModal>
  );
}

