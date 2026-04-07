"use client";

type DeleteConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  expectedName: string;
  typedName: string;
  setTypedName: (value: string) => void;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  open,
  title,
  message,
  expectedName,
  typedName,
  setTypedName,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!open) return null;
  const canConfirm = !loading && expectedName.trim() !== "" && typedName.trim() === expectedName.trim();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/60 bg-white/90 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md dark:border-white/[0.07] dark:bg-[#141414]/90">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{message}</p>
        <div className="mt-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-sm text-rose-700">
          Nhập chính xác tên để xác nhận: <span className="font-semibold">{expectedName}</span>
        </div>
        <input
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Nhập lại tên để xác nhận"
          className="mt-3 h-10 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-100"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(loading)}
            className="rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50/80 disabled:opacity-60 dark:border-white/[0.07] dark:bg-[#141414]/90 dark:text-slate-200 dark:hover:bg-white/[0.05]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 py-2 text-sm font-medium text-rose-600 transition-all hover:bg-rose-100/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang xóa..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
