"use client";

import { useMemo, useState } from "react";
import { BaseModal } from "@/components/ui/base-modal";
import { useModalStore } from "@/lib/report/use-modal-store";

export function DeleteGroupConfirmModal() {
  const isOpen = useModalStore((s) => s.isOpen && s.view === "deleteGroupConfirm");
  const data = useModalStore((s) => (s.view === "deleteGroupConfirm" ? s.data : null));
  const closeModal = useModalStore((s) => s.closeModal);
  const [typedName, setTypedName] = useState("");
  const [loading, setLoading] = useState(false);

  const expectedName = useMemo(() => {
    const path = data && "groupPath" in data ? data.groupPath : "";
    return String(path ?? "").trim();
  }, [data]);

  const canConfirm = !loading && expectedName.length > 0 && typedName.trim() === expectedName;

  const onConfirm = async () => {
    if (!data || !("onConfirm" in data) || !canConfirm) return;
    setLoading(true);
    try {
      await data.onConfirm();
      closeModal();
      setTypedName("");
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    if (loading) return;
    closeModal();
    setTypedName("");
  };

  return (
    <BaseModal
      open={Boolean(isOpen)}
      onClose={onClose}
      title="Xác nhận xóa nhóm"
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50/80 disabled:opacity-60 dark:border-white/[0.07] dark:bg-[#141414]/90 dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!canConfirm}
            className="rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 py-2 text-sm font-medium text-rose-600 transition-all hover:bg-rose-100/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang xóa..." : "Xóa nhóm"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-700 dark:text-slate-200">
        {`Bạn sắp xóa nhóm "${expectedName}" và toàn bộ field liên quan. Hành động này có thể hoàn tác bằng Undo gần nhất.`}
      </p>
      {data && "fieldCount" in data ? (
        <div className="mt-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-sm text-rose-700">
          {`Số field sẽ bị xóa: ${data.fieldCount}`}
        </div>
      ) : null}
      <div className="mt-3 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-2 dark:border-white/[0.07] dark:bg-white/[0.04]">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Nhập chính xác tên nhóm để xác nhận: <span className="font-semibold">{expectedName}</span>
        </p>
        <input
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Nhập lại tên nhóm"
          className="mt-2 h-10 w-full rounded-xl border border-slate-200/60 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100"
          autoFocus
        />
      </div>
    </BaseModal>
  );
}

