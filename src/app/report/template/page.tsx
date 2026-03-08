"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DocxTemplateEditorModal } from "@/components/docx-template-editor-modal";
import { OnlyOfficeEditorModal } from "@/components/onlyoffice-editor-modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useLanguage } from "@/components/language-provider";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";

import { FieldInjectionToolbar } from "./_components/field-injection-toolbar";
import { FieldReferencePanel } from "./_components/field-reference-panel";
import { TemplateFolderBrowser } from "./_components/template-folder-browser";
import { TemplateValidationReportModal } from "./_components/template-validation-report-modal";
import { useFieldInjection } from "./_components/use-field-injection";
import { useTemplateUploadValidation } from "./_components/use-template-upload-validation";

type TemplateProfile = { id: string; template_name: string; docx_path: string; placeholder_inventory_path: string; active: boolean };
type TemplateApiResponse = { ok: boolean; error?: string; templates?: TemplateProfile[]; active_template_id?: string };

export default function TemplatePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateProfile[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"configured" | "folder">("configured");

  // Editor state (shared between configured + folder modes)
  const [showEditor, setShowEditor] = useState(false);
  const [editorBuffer, setEditorBuffer] = useState<ArrayBuffer | null>(null);
  const [openingEditor, setOpeningEditor] = useState(false);
  const [editorSource, setEditorSource] = useState<"managed" | "local" | "folder">("managed");
  const [activeEditorPath, setActiveEditorPath] = useState("");
  const [localDocxName, setLocalDocxName] = useState("");
  const localDocxInputRef = useRef<HTMLInputElement | null>(null);

  // OnlyOffice
  const [onlyofficeAvailable, setOnlyofficeAvailable] = useState<boolean | null>(null);
  const [editorType, setEditorType] = useState<"onlyoffice" | "eigenpal">("onlyoffice");
  const [showOnlyofficeEditor, setShowOnlyofficeEditor] = useState(false);
  const [onlyofficeDocxPath, setOnlyofficeDocxPath] = useState("");

  // Field injection hook
  const fi = useFieldInjection(templates.length > 0);

  // Upload-and-validate flow
  const validation = useTemplateUploadValidation(fi.selectedFieldTemplateId);
  const validateInputRef = useRef<HTMLInputElement | null>(null);

  function handleUploadValidate() {
    if (!fi.selectedFieldTemplateId) {
      setError("Vui lòng chọn field template trước khi kiểm tra.");
      return;
    }
    validateInputRef.current?.click();
  }

  function handleValidateFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(""); setMessage("");
    void validation.validateFile(file);
  }

  async function handleValidationSave(savePath: string) {
    await validation.saveFile(savePath);
    validation.reset();
    setMessage("Đã lưu template thành công.");
  }

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/report/template", { cache: "no-store" });
    const data = (await res.json()) as TemplateApiResponse;
    if (!data.ok) { setError(data.error ?? t("template.err.load")); setLoading(false); return; }
    setTemplates(data.templates ?? []);
    setActiveTemplateId((prev) => prev || (data.active_template_id ?? data.templates?.[0]?.id ?? ""));
    setLoading(false);
  }, [t]);

  useEffect(() => { const timer = window.setTimeout(() => void loadTemplates(), 0); return () => window.clearTimeout(timer); }, [loadTemplates]);

  useEffect(() => {
    fetch("/api/onlyoffice/health")
      .then((r) => r.json() as Promise<{ available: boolean }>)
      .then((d) => { setOnlyofficeAvailable(d.available); if (!d.available) setEditorType("eigenpal"); })
      .catch(() => { setOnlyofficeAvailable(false); setEditorType("eigenpal"); });
  }, []);

  const selectedTemplate = templates.find((tp) => tp.id === activeTemplateId);
  const profileDocxPath = selectedTemplate?.docx_path ?? "";

  function openProfileDocx() {
    if (!profileDocxPath) return;
    void getSignedFileUrl(profileDocxPath, true).then((url) => window.open(url, "_blank", "noopener,noreferrer")).catch(() => setError("Failed to generate download URL."));
  }

  function openProfileEditor() {
    if (!profileDocxPath) return;
    setError(""); setMessage("");
    if (editorType === "onlyoffice" && onlyofficeAvailable) {
      setOnlyofficeDocxPath(profileDocxPath); setShowOnlyofficeEditor(true);
      return;
    }
    openEigenpalEditor(profileDocxPath, "managed");
  }

  function openEigenpalEditor(docxPath: string, source: "managed" | "local" | "folder") {
    setOpeningEditor(true); setEditorSource(source); setActiveEditorPath(docxPath);
    void (async () => {
      try {
        const signedUrl = await getSignedFileUrl(docxPath, true);
        const res = await fetch(signedUrl);
        if (!res.ok) throw new Error("Không thể tải file DOCX.");
        setEditorBuffer(await res.arrayBuffer()); setShowEditor(true);
      } catch (e) { setError(e instanceof Error ? e.message : "Lỗi mở editor."); }
      finally { setOpeningEditor(false); }
    })();
  }

  function openLocalDocx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setOpeningEditor(true); setError(""); setMessage("");
    setEditorSource("local"); setLocalDocxName(file.name);
    void file.arrayBuffer().then((buf) => { setEditorBuffer(buf); setShowEditor(true); })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể mở file."))
      .finally(() => setOpeningEditor(false));
  }

  // Folder browser: open editor (OnlyOffice or Eigenpal fallback)
  function handleOpenEditor(docxPath: string) {
    setError(""); setMessage("");
    if (editorType === "onlyoffice" && onlyofficeAvailable) {
      setOnlyofficeDocxPath(docxPath); setShowOnlyofficeEditor(true);
      return;
    }
    openEigenpalEditor(docxPath, "folder");
  }

  async function saveEditorDocx(buffer: ArrayBuffer) {
    if (editorSource === "local") {
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = localDocxName || "edited-template.docx";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMessage("Đã tải file DOCX đã chỉnh sửa về máy.");
      return;
    }
    const savePath = activeEditorPath || profileDocxPath;
    const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(savePath)}`, {
      method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: buffer,
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? "Lỗi lưu DOCX.");
    setMessage(t("template.editor.modal.saved"));
    if (editorSource === "managed") await loadTemplates();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-800 dark:border-t-violet-400" /></div>;
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-500/10 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950/30 dark:via-[#141414] dark:to-fuchsia-950/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-500/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">{t("nav.template")}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("template.desc")}</p>
            {message && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          {onlyofficeAvailable && (
            <SegmentedControl value={editorType} onChange={(v) => setEditorType(v as "onlyoffice" | "eigenpal")} options={[
              { value: "onlyoffice", label: "OnlyOffice" },
              { value: "eigenpal", label: t("template.editor.eigenpal") },
            ]} />
          )}
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-white/[0.05] p-1">
        {(["configured", "folder"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab ? "bg-white dark:bg-[#1e1e1e] shadow-sm text-violet-700 dark:text-violet-400" : "text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"}`}>
            {tab === "configured" ? "Mẫu đã cấu hình" : "Duyệt folder mẫu"}
          </button>
        ))}
      </div>

      {/* Tab: Configured templates */}
      {activeTab === "configured" && templates.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] p-4 shadow-sm">
          <h3 className="text-base font-bold tracking-tight">{t("template.editor.title")}</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("template.editor.desc")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select value={activeTemplateId} onChange={(e) => setActiveTemplateId(e.target.value)} aria-label={t("template.editor.title")} className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] dark:text-slate-100 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
              {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.template_name} {tpl.active ? `(${t("template.active")})` : ""}</option>)}
            </select>
            <button type="button" onClick={openProfileDocx} disabled={!profileDocxPath} className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm shadow-sm hover:border-violet-200 dark:hover:border-violet-500/20 disabled:opacity-50">{t("template.editor.openDocx")}</button>
            <button type="button" onClick={openProfileEditor} disabled={!profileDocxPath || openingEditor} className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/25 hover:brightness-110 disabled:opacity-50">
              {openingEditor ? t("template.editor.modal.loading") : t("template.editor.openEditor")}
            </button>
            <input ref={localDocxInputRef} type="file" accept=".docx" aria-label="Chọn file DOCX" className="hidden" onChange={openLocalDocx} />
            <button type="button" onClick={() => localDocxInputRef.current?.click()} disabled={openingEditor} className="rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm shadow-sm hover:border-violet-200 dark:hover:border-violet-500/20 disabled:opacity-50">
              {openingEditor ? "Đang mở..." : "Chọn file từ máy"}
            </button>
          </div>
          <FieldInjectionToolbar
            fieldTemplates={fi.fieldTemplates} selectedFieldTemplateId={fi.selectedFieldTemplateId} onFieldTemplateChange={fi.setSelectedFieldTemplateId}
            groups={fi.groups} selectedGroup={fi.selectedGroup} onGroupChange={fi.setSelectedGroup} fieldsByGroup={fi.fieldsByGroup}
            fieldsInSelectedGroup={fi.fieldsInSelectedGroup} selectedFieldKey={fi.selectedFieldKey} onFieldKeyChange={fi.setSelectedFieldKey}
            onInject={fi.injectField} copyFeedback={fi.copyFeedback} fieldCatalogEmpty={fi.fieldCatalog.length === 0}
          />
        </div>
      )}

      {/* Tab: Folder browser + Field reference */}
      {activeTab === "folder" && (
        <>
          <input ref={validateInputRef} type="file" accept=".docx" aria-label="Chọn file DOCX để kiểm tra" className="hidden" onChange={handleValidateFileChange} />
          <TemplateFolderBrowser
            onOpenEditor={handleOpenEditor}
            editorAvailable={true}
            onUploadValidate={handleUploadValidate}
          />
          <FieldReferencePanel
            fieldTemplates={fi.fieldTemplates}
            selectedFieldTemplateId={fi.selectedFieldTemplateId}
            onFieldTemplateChange={fi.setSelectedFieldTemplateId}
            fieldsByGroup={fi.fieldsByGroup}
            groups={fi.groups}
            onCopyField={fi.injectField}
            copyFeedback={fi.copyFeedback}
          />
          {/* Validation loading/error */}
          {validation.validating && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-950/30 px-4 py-3 text-sm text-violet-700 dark:text-violet-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              Đang kiểm tra {validation.fileName}...
            </div>
          )}
          {validation.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{validation.error}</p>
          )}
          {/* Validation report modal */}
          {validation.report && (
            <TemplateValidationReportModal
              report={validation.report}
              fileName={validation.fileName}
              onSave={handleValidationSave}
              onClose={validation.reset}
            />
          )}
        </>
      )}

      {/* Shared Eigenpal Editor Modal */}
      {showEditor && editorBuffer && (
        <DocxTemplateEditorModal
          docxPath={editorSource === "local" ? localDocxName || "local-template.docx" : activeEditorPath || profileDocxPath}
          documentBuffer={editorBuffer} fieldCatalog={fi.fieldCatalog}
          onClose={() => { setShowEditor(false); setEditorBuffer(null); }}
          onSaveDocx={saveEditorDocx}
          enableAutoBackup={editorSource !== "local"} autoBackupIntervalMs={60_000}
        />
      )}

      {/* Shared OnlyOffice Editor Modal */}
      {showOnlyofficeEditor && onlyofficeDocxPath && (
        <OnlyOfficeEditorModal docxPath={onlyofficeDocxPath}
          onClose={() => { setShowOnlyofficeEditor(false); setOnlyofficeDocxPath(""); }}
          onSaved={() => void loadTemplates()} fieldCatalog={fi.fieldCatalog}
        />
      )}
    </section>
  );
}
