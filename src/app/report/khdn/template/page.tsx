"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { DocxTemplateEditorModal } from "@/components/docx-template-editor-modal";
import { useLanguage } from "@/components/language-provider";
import { getSignedFileUrl } from "@/lib/report/signed-file-url";

import { BuildExportTab } from "./_components/build-export-tab";
import { ConfiguredTemplatesTab } from "./_components/configured-templates-tab";
import { FieldReferencePanel } from "./_components/field-reference-panel";
import { TemplateFolderBrowser } from "./_components/template-folder-browser";
import { TemplateValidationReportModal } from "./_components/template-validation-report-modal";
import { useFieldInjection } from "./_components/use-field-injection";
import { useTemplateUploadValidation } from "./_components/use-template-upload-validation";

type TemplateProfile = { id: string; template_name: string; docx_path: string; placeholder_inventory_path: string; active: boolean };
type TemplateApiResponse = { ok: boolean; error?: string; templates?: TemplateProfile[]; active_template_id?: string };

const VALID_TABS = ["configured", "folder", "export"] as const;
type TabKey = (typeof VALID_TABS)[number];
const TAB_LABELS: Record<TabKey, string> = { configured: "Chỉnh sửa mẫu", folder: "Duyệt folder mẫu", export: "Build & Export" };

function TemplatePageInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL-synced tab
  const tabParam = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "configured";
  function setActiveTab(tab: TabKey) { router.replace(`?tab=${tab}`, { scroll: false }); }

  // Core state
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateProfile[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editorBuffer, setEditorBuffer] = useState<ArrayBuffer | null>(null);
  const [openingEditor, setOpeningEditor] = useState(false);
  const [editorSource, setEditorSource] = useState<"managed" | "local" | "folder">("managed");
  const [activeEditorPath, setActiveEditorPath] = useState("");
  const [localDocxName, setLocalDocxName] = useState("");
  const localDocxInputRef = useRef<HTMLInputElement | null>(null);

  // Field injection + validation
  const fi = useFieldInjection(templates.length > 0);
  const validation = useTemplateUploadValidation(fi.selectedFieldTemplateId);
  const validateInputRef = useRef<HTMLInputElement | null>(null);
  const [removing, setRemoving] = useState(false);

  // --- Data loading ---
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

  const selectedTemplate = templates.find((tp) => tp.id === activeTemplateId);
  const profileDocxPath = selectedTemplate?.docx_path ?? "";

  // --- Editor helpers ---
  function openProfileDocx() {
    if (!profileDocxPath) return;
    void getSignedFileUrl(profileDocxPath, true).then((url) => window.open(url, "_blank", "noopener,noreferrer")).catch(() => setError("Failed to generate download URL."));
  }

  function openProfileEditor() {
    if (!profileDocxPath) return;
    setError(""); setMessage("");
    openEigenpalEditor(profileDocxPath, "managed");
  }

  function openEigenpalEditor(docxPath: string, source: "managed" | "local" | "folder") {
    setOpeningEditor(true); setEditorSource(source); setActiveEditorPath(docxPath);
    void (async () => {
      try { const signedUrl = await getSignedFileUrl(docxPath, true); const res = await fetch(signedUrl); if (!res.ok) throw new Error("Không thể tải file DOCX."); setEditorBuffer(await res.arrayBuffer()); setShowEditor(true); }
      catch (e) { setError(e instanceof Error ? e.message : "Lỗi mở editor."); }
      finally { setOpeningEditor(false); }
    })();
  }

  function openLocalDocx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    setOpeningEditor(true); setError(""); setMessage(""); setEditorSource("local"); setLocalDocxName(file.name);
    void file.arrayBuffer().then((buf) => { setEditorBuffer(buf); setShowEditor(true); })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể mở file."))
      .finally(() => setOpeningEditor(false));
  }

  function handleOpenEditor(docxPath: string) {
    setError(""); setMessage("");
    openEigenpalEditor(docxPath, "folder");
  }

  async function saveEditorDocx(buffer: ArrayBuffer) {
    if (editorSource === "local") {
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = localDocxName || "edited-template.docx";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setMessage("Đã tải file DOCX đã chỉnh sửa về máy."); return;
    }
    const savePath = activeEditorPath || profileDocxPath;
    const res = await fetch(`/api/report/template/save-docx?path=${encodeURIComponent(savePath)}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: buffer });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? "Lỗi lưu DOCX.");
    setMessage(t("template.editor.modal.saved"));
    if (editorSource === "managed") await loadTemplates();
  }

  // --- Template CRUD ---
  async function handleRemoveTemplate() {
    if (!activeTemplateId) return;
    const tpl = templates.find((tp) => tp.id === activeTemplateId); if (!tpl) return;
    setRemoving(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/report/template?id=${encodeURIComponent(activeTemplateId)}`, { method: "DELETE" });
      const data = (await res.json()) as TemplateApiResponse;
      if (!data.ok) throw new Error(data.error ?? "Xóa thất bại.");
      setTemplates(data.templates ?? []); setActiveTemplateId(data.active_template_id ?? data.templates?.[0]?.id ?? "");
      setMessage(`Đã loại bỏ mẫu "${tpl.template_name}".`);
    } catch (e) { setError(e instanceof Error ? e.message : "Xóa thất bại."); }
    finally { setRemoving(false); }
  }

  async function handleRegisterTemplate(docxPath: string, templateName: string) {
    const res = await fetch("/api/report/template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template_name: templateName, docx_path: docxPath }) });
    const data = (await res.json()) as TemplateApiResponse;
    if (!data.ok) throw new Error(data.error ?? "Đăng ký thất bại.");
    setMessage(`Đã đăng ký mẫu "${templateName}".`);
    if (data.templates) { setTemplates(data.templates); setActiveTemplateId(data.active_template_id ?? data.templates[0]?.id ?? ""); }
  }

  function handleUploadValidate() {
    if (!fi.selectedFieldTemplateId) { setError("Vui lòng chọn field template trước khi kiểm tra."); return; }
    validateInputRef.current?.click();
  }

  function handleValidateFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    setError(""); setMessage(""); void validation.validateFile(file);
  }

  async function handleValidationSave(savePath: string) {
    await validation.saveFile(savePath); validation.reset(); setMessage("Đã lưu template thành công.");
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" /></div>;
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-500/10 bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950/30 dark:via-[#242220] dark:to-brand-900/20 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl dark:bg-brand-500/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-brand-600 dark:text-brand-400">{t("nav.template")}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">{t("template.desc")}</p>
            {message && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      </div>

      {/* 3-tab switch */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 dark:bg-white/[0.05] p-1">
        {VALID_TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab ? "bg-white dark:bg-[#1e1e1e] shadow-sm text-brand-600 dark:text-brand-400" : "text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-slate-300"}`}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab: Configured templates */}
      {activeTab === "configured" && (
        <ConfiguredTemplatesTab
          templates={templates} activeTemplateId={activeTemplateId} onActiveTemplateChange={setActiveTemplateId}
          profileDocxPath={profileDocxPath} openingEditor={openingEditor} removing={removing}
          onOpenDocx={openProfileDocx} onOpenEditor={openProfileEditor}
          onOpenLocal={() => localDocxInputRef.current?.click()} onRemoveTemplate={handleRemoveTemplate}
          fi={{ fieldTemplates: fi.fieldTemplates, selectedFieldTemplateId: fi.selectedFieldTemplateId, setSelectedFieldTemplateId: fi.setSelectedFieldTemplateId,
            groups: fi.groups, selectedGroup: fi.selectedGroup, setSelectedGroup: fi.setSelectedGroup, fieldsByGroup: fi.fieldsByGroup,
            fieldsInSelectedGroup: fi.fieldsInSelectedGroup, selectedFieldKey: fi.selectedFieldKey, setSelectedFieldKey: fi.setSelectedFieldKey,
            injectField: fi.injectField, copyFeedback: fi.copyFeedback, fieldCatalog: fi.fieldCatalog }}
        />
      )}

      {/* Tab: Folder browser + Field reference */}
      {activeTab === "folder" && (
        <>
          <input ref={validateInputRef} type="file" accept=".docx" aria-label="Chọn file DOCX để kiểm tra" className="hidden" onChange={handleValidateFileChange} />
          <TemplateFolderBrowser onOpenEditor={handleOpenEditor} editorAvailable={true} onUploadValidate={handleUploadValidate} onRegisterTemplate={handleRegisterTemplate} />
          <FieldReferencePanel fieldTemplates={fi.fieldTemplates} selectedFieldTemplateId={fi.selectedFieldTemplateId} onFieldTemplateChange={fi.setSelectedFieldTemplateId}
            fieldsByGroup={fi.fieldsByGroup} groups={fi.groups} onCopyField={fi.injectField} copyFeedback={fi.copyFeedback} />
          {validation.validating && (
            <div className="flex items-center gap-2 rounded-lg border border-brand-200 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-900/30 px-4 py-3 text-sm text-brand-600 dark:text-brand-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" /> Đang kiểm tra {validation.fileName}...
            </div>
          )}
          {validation.error && <p className="text-sm text-red-600 dark:text-red-400">{validation.error}</p>}
          {validation.report && <TemplateValidationReportModal report={validation.report} fileName={validation.fileName} onSave={handleValidationSave} onClose={validation.reset} />}
        </>
      )}

      {/* Tab: Build & Export */}
      {activeTab === "export" && (
        <BuildExportTab templates={templates} activeTemplateId={activeTemplateId} onMessage={setMessage} onError={setError} />
      )}

      {/* Hidden file input for local docx (used by configured tab) */}
      <input ref={localDocxInputRef} type="file" accept=".docx" aria-label="Chọn file DOCX" className="hidden" onChange={openLocalDocx} />

      {/* Editor Modal */}
      {showEditor && editorBuffer && (
        <DocxTemplateEditorModal
          docxPath={editorSource === "local" ? localDocxName || "local-template.docx" : activeEditorPath || profileDocxPath}
          documentBuffer={editorBuffer} fieldCatalog={fi.fieldCatalog}
          onClose={() => { setShowEditor(false); setEditorBuffer(null); }}
          onSaveDocx={saveEditorDocx} enableAutoBackup={editorSource !== "local"} autoBackupIntervalMs={60_000}
        />
      )}
    </section>
  );
}

// Wrap with Suspense for useSearchParams (required by Next.js App Router)
export default function TemplatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 dark:border-brand-700 dark:border-t-brand-400" /></div>}>
      <TemplatePageInner />
    </Suspense>
  );
}
