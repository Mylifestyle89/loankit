import { useCallback, useState } from "react";

import type { TagFormat, TagSuggestion } from "@/services/auto-tagging.service";

type AutoTaggingState = {
  file: File | null;
  docxPath: string;
  format: TagFormat;
  analyzing: boolean;
  applying: boolean;
  error: string;
  suggestions: TagSuggestion[];
  accepted: boolean[];
  documentPreview: string;
  resultPath: string;
  resultUrl: string;
};

const INITIAL: AutoTaggingState = {
  file: null,
  docxPath: "",
  format: "square",
  analyzing: false,
  applying: false,
  error: "",
  suggestions: [],
  accepted: [],
  documentPreview: "",
  resultPath: "",
  resultUrl: "",
};

export function useAutoTagging(t: (key: string) => string) {
  const [state, setState] = useState<AutoTaggingState>(INITIAL);

  const setFile = useCallback((file: File | null) => {
    setState((s) => ({ ...s, file, docxPath: "", suggestions: [], accepted: [], resultPath: "", resultUrl: "", error: "" }));
  }, []);

  const setFormat = useCallback((format: TagFormat) => {
    setState((s) => ({ ...s, format }));
  }, []);

  const toggleSuggestion = useCallback((index: number) => {
    setState((s) => {
      const next = [...s.accepted];
      next[index] = !next[index];
      return { ...s, accepted: next };
    });
  }, []);

  const toggleAll = useCallback((on: boolean) => {
    setState((s) => ({ ...s, accepted: s.suggestions.map(() => on) }));
  }, []);

  const analyzeDocument = useCallback(
    async (headersRaw: string, fieldLabels?: Record<string, string>) => {
      const file = state.file;
      if (!file) {
        setState((s) => ({ ...s, error: t("autoTagging.err.noFile") }));
        return;
      }

      const headers = [...new Set(headersRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean))];
      if (headers.length === 0) {
        setState((s) => ({ ...s, error: t("autoTagging.err.noHeaders") }));
        return;
      }

      setState((s) => ({ ...s, analyzing: true, error: "", suggestions: [], accepted: [], resultPath: "", resultUrl: "" }));

      try {
        const form = new FormData();
        form.append("file", file);
        form.append("headers", JSON.stringify(headers));
        if (fieldLabels) form.append("fieldLabels", JSON.stringify(fieldLabels));

        const res = await fetch("/api/report/auto-tagging/analyze", { method: "POST", body: form });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          docxPath?: string;
          suggestions?: TagSuggestion[];
          documentPreview?: string;
        };

        if (!data.ok || !data.suggestions) {
          throw new Error(data.error ?? t("autoTagging.err.analyzeFailed"));
        }

        setState((s) => ({
          ...s,
          docxPath: data.docxPath ?? "",
          suggestions: data.suggestions ?? [],
          accepted: (data.suggestions ?? []).map((sg) => sg.confidence >= 0.5),
          documentPreview: data.documentPreview ?? "",
          analyzing: false,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          analyzing: false,
          error: err instanceof Error ? err.message : t("autoTagging.err.analyzeFailed"),
        }));
      }
    },
    [state.file, t],
  );

  const applyTags = useCallback(async () => {
    const acceptedSuggestions = state.suggestions.filter((_, i) => state.accepted[i]);
    if (acceptedSuggestions.length === 0) {
      setState((s) => ({ ...s, error: t("autoTagging.err.noAccepted") }));
      return;
    }
    if (!state.docxPath) {
      setState((s) => ({ ...s, error: t("autoTagging.err.noFile") }));
      return;
    }

    setState((s) => ({ ...s, applying: true, error: "" }));

    try {
      const res = await fetch("/api/report/auto-tagging/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docxPath: state.docxPath,
          accepted: acceptedSuggestions.map(({ header, matchedText }) => ({ header, matchedText })),
          format: state.format,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        templatePath?: string;
        downloadUrl?: string;
      };

      if (!data.ok) throw new Error(data.error ?? t("autoTagging.err.applyFailed"));

      setState((s) => ({
        ...s,
        applying: false,
        resultPath: data.templatePath ?? "",
        resultUrl: data.downloadUrl ?? "",
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        applying: false,
        error: err instanceof Error ? err.message : t("autoTagging.err.applyFailed"),
      }));
    }
  }, [state.suggestions, state.accepted, state.docxPath, state.format, t]);

  const reset = useCallback(() => setState(INITIAL), []);

  return {
    ...state,
    setFile,
    setFormat,
    toggleSuggestion,
    toggleAll,
    analyzeDocument,
    applyTags,
    reset,
  };
}
