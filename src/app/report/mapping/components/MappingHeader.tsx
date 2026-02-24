import { Save, BookOpen, Undo2 } from "lucide-react";

type MappingHeaderProps = {
  t: (key: string) => string;
  activeVersionId: string;
  activeVersionStatus?: "draft" | "published" | string;
  message: string;
  error: string;
  saving: boolean;
  onSaveDraft: () => void;
  onOpenFunctionList?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  undoCount?: number;
};

export function MappingHeader({
  t,
  activeVersionId,
  activeVersionStatus,
  message,
  error,
  saving,
  onSaveDraft,
  onOpenFunctionList,
  canUndo = false,
  onUndo,
  undoCount = 0,
}: MappingHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-blue-chill-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t("mapping.title")}</h2>
        <p className="mt-1 text-sm text-blue-chill-800">
          {t("mapping.activeVersion")}: <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
          {activeVersionStatus ?? t("mapping.unknown")})
        </p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>
      <div className="rounded-xl border border-blue-chill-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          {onUndo ? (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-2 rounded-md border border-blue-chill-300 bg-white px-4 py-2 text-sm font-medium text-blue-chill-800 hover:bg-blue-chill-50 disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4" />
              {t("mapping.undo")} ({undoCount}/5)
            </button>
          ) : null}
          {onOpenFunctionList ? (
            <button
              type="button"
              onClick={onOpenFunctionList}
              className="flex items-center gap-2 rounded-md border border-blue-chill-300 bg-white px-4 py-2 text-sm font-medium text-blue-chill-800 hover:bg-blue-chill-50"
            >
              <BookOpen className="h-4 w-4" />
              Danh sách hàm
            </button>
          ) : null}
          <button
            onClick={onSaveDraft}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-blue-chill-700 px-4 py-2 text-sm text-white hover:bg-blue-chill-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? t("mapping.saving") : t("mapping.saveDraft")}
          </button>
        </div>
      </div>
    </div>
  );
}
