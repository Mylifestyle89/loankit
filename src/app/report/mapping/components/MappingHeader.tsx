import { Save, Send, CheckCircle } from "lucide-react";

type MappingHeaderProps = {
  t: (key: string) => string;
  activeVersionId: string;
  activeVersionStatus?: "draft" | "published" | string;
  message: string;
  error: string;
  saving: boolean;
  publishing: boolean;
  validating: boolean;
  onSaveDraft: () => void;
  onPublishActive: () => void;
  onRunValidate: () => void;
};

export function MappingHeader({
  t,
  activeVersionId,
  activeVersionStatus,
  message,
  error,
  saving,
  publishing,
  validating,
  onSaveDraft,
  onPublishActive,
  onRunValidate,
}: MappingHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-coral-tree-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{t("mapping.title")}</h2>
        <p className="mt-1 text-sm text-coral-tree-800">
          {t("mapping.activeVersion")}: <span className="font-medium">{activeVersionId || t("mapping.na")}</span> (
          {activeVersionStatus ?? t("mapping.unknown")})
        </p>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-coral-tree-700 px-4 py-2 text-sm text-white hover:bg-coral-tree-800 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t("mapping.saving") : t("mapping.saveDraft")}
        </button>
        <button
          onClick={onPublishActive}
          disabled={publishing || !activeVersionId}
          className="flex items-center gap-2 rounded-md border border-coral-tree-300 px-4 py-2 text-sm hover:bg-coral-tree-50 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {publishing ? t("mapping.publishing") : t("mapping.publish")}
        </button>
        <button
          onClick={onRunValidate}
          disabled={validating}
          className="flex items-center gap-2 rounded-md border border-coral-tree-300 px-4 py-2 text-sm hover:bg-coral-tree-50 disabled:opacity-60"
        >
          <CheckCircle className="h-4 w-4" />
          {validating ? t("mapping.validating") : t("mapping.buildValidate")}
        </button>
      </div>
    </div>
  );
}
