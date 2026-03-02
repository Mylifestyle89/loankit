"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PlaceholderSidebar } from "@/components/placeholder-sidebar";

type FieldCatalogItem = {
  field_key: string;
  label_vi: string;
  group: string;
  type: string;
};

type Props = {
  docxPath: string;
  onClose: () => void;
  onSaved?: () => void;
  fieldCatalog?: FieldCatalogItem[];
};

type EditorConfig = {
  config: Record<string, unknown> & { token?: string };
  documentServerUrl: string;
};

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        containerId: string,
        config: Record<string, unknown>,
      ) => { destroyEditor: () => void };
    };
  }
}

export function OnlyOfficeEditorModal({ docxPath, onClose, onSaved, fieldCatalog }: Props) {
  const { t } = useLanguage();
  const editorInstanceRef = useRef<{ destroyEditor: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Once the editor is created, stop rendering React overlays inside the editor
  // container — OnlyOffice SDK takes full ownership of that DOM subtree.
  const [editorMounted, setEditorMounted] = useState(false);

  // Stable refs for callbacks to avoid useEffect re-triggers
  const onCloseRef = useRef(onClose);
  const onSavedRef = useRef(onSaved);
  onCloseRef.current = onClose;
  onSavedRef.current = onSaved;

  const destroy = useCallback(() => {
    try {
      editorInstanceRef.current?.destroyEditor();
    } catch {
      // ignore
    }
    editorInstanceRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    destroy();
    onSavedRef.current?.();
    onCloseRef.current();
  }, [destroy]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 0. Health check — fail fast if Docker/OnlyOffice is not running
        const healthRes = await fetch("/api/onlyoffice/health", { cache: "no-store" })
          .catch(() => null);
        const healthData = healthRes
          ? ((await healthRes.json()) as { available?: boolean })
          : null;
        if (!healthData?.available) {
          throw new Error(
            "OnlyOffice Document Server không khả dụng.\n\n" +
            "Hãy chạy: docker-compose -f docker-compose.onlyoffice.yml up -d\n" +
            "sau đó chờ ~30 giây và thử lại.",
          );
        }
        if (cancelled) return;

        // 1. Fetch editor config from our API
        const res = await fetch(
          `/api/onlyoffice/config?path=${encodeURIComponent(docxPath)}`,
        );
        const data = (await res.json()) as { ok?: boolean; error?: string } & EditorConfig;
        if (!data.ok || !data.config) {
          throw new Error(data.error || "Failed to get OnlyOffice config.");
        }
        if (cancelled) return;

        const { config, documentServerUrl } = data;

        // 2. Load OnlyOffice API script if not already loaded
        if (!window.DocsAPI) {
          const scriptId = "onlyoffice-api-script";
          const existing = document.getElementById(scriptId);
          if (existing) {
            // Script tag exists but DocsAPI not ready yet — wait for it
            await new Promise<void>((resolve, reject) => {
              let elapsed = 0;
              const check = () => {
                if (window.DocsAPI) return resolve();
                elapsed += 200;
                if (elapsed > 10_000) return reject(new Error("Timeout chờ OnlyOffice API."));
                setTimeout(check, 200);
              };
              check();
            });
          } else {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script");
              script.id = scriptId;
              script.src = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
              script.onload = () => resolve();
              script.onerror = () =>
                reject(new Error(
                  "Không thể tải OnlyOffice API script.\n" +
                  "Kiểm tra Docker container đang chạy và port 8080 mở.",
                ));
              document.head.appendChild(script);
            });
          }
        }
        if (cancelled) return;

        if (!window.DocsAPI) {
          throw new Error("DocsAPI not available after script load.");
        }

        // 3. Initialize editor — after this, OnlyOffice owns the container DOM
        const editorConfig = {
          ...config,
          width: "100%",
          height: "100%",
          type: "desktop",
          events: {
            onDocumentReady: () => {
              if (!cancelled) setLoading(false);
            },
            onError: (event: { data?: { errorCode?: number; errorDescription?: string } }) => {
              const code = event?.data?.errorCode;
              // OnlyOffice fires benign onError events with empty data during
              // initialization (e.g. connectivity probes, plugin loads).
              // Only treat errors with an actual errorCode as fatal.
              if (!code) {
                console.warn("[OnlyOffice] Non-fatal error event (ignored):", event);
                return;
              }
              console.error("[OnlyOffice] Error:", code, event);
              if (!cancelled) {
                const desc = event?.data?.errorDescription;
                const msg = desc
                  ? `OnlyOffice error ${code}: ${desc}`
                  : `OnlyOffice error code: ${code}`;
                setError(msg);
                setLoading(false);
              }
            },
            onRequestClose: () => {
              handleClose();
            },
          },
        };

        setEditorMounted(true);
        editorInstanceRef.current = new window.DocsAPI.DocEditor(
          "onlyoffice-editor-container",
          editorConfig,
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to initialize editor.");
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      destroy();
    };
  }, [docxPath, destroy, handleClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-[#0f1629]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-2 dark:border-white/[0.08]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              OnlyOffice Editor
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {docxPath}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-300 dark:hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
            {t("template.editor.modal.close")}
          </button>
        </div>

        {/* Editor area + Placeholder sidebar */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Main editor — OnlyOffice takes full DOM ownership of the container */}
          <div className="relative flex-1">
            <div id="onlyoffice-editor-container" className="h-full w-full" />
          </div>

          {/*
           * Overlays rendered as a SIBLING of the editor, not inside the same
           * parent that OnlyOffice mutates. This avoids the "insertBefore" crash
           * caused by React trying to reconcile DOM that OnlyOffice has replaced.
           */}
          {!editorMounted && loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-[#0f1629]/80">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("template.editor.onlyofficeLoading")}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 dark:bg-[#0f1629]/95">
              <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/10">
                <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
                <p className="whitespace-pre-line text-sm font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  {t("template.editor.modal.close")}
                </button>
              </div>
            </div>
          )}

          {/* Placeholder sidebar */}
          {fieldCatalog && fieldCatalog.length > 0 && (
            <PlaceholderSidebar fieldCatalog={fieldCatalog} />
          )}
        </div>
      </div>
    </div>
  );
}
