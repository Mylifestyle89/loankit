"use client";

import { create } from "zustand";
import type {
  AutoProcessJob,
  OcrLogEntry,
  OcrProcessResponse,
  OcrSuggestionMap,
  RepeaterSuggestionMap,
} from "../types";

/** Resolves a functional or direct update value — mirrors useState semantics. */
const resolve = <T>(v: T | ((prev: T) => T), prev: T): T =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof v === "function" ? (v as any)(prev) : v;

type OcrState = {
  ocrProcessing: boolean;
  ocrSuggestionsByField: OcrSuggestionMap;
  repeaterSuggestionsByGroup: RepeaterSuggestionMap;
  ocrLogs: OcrLogEntry[];
  lastOcrMeta: OcrProcessResponse["meta"] | undefined;
  autoProcessJob: AutoProcessJob | null;
  autoProcessing: boolean;

  // ── Basic setters ──────────────────────────────────────────────────────────
  setOcrProcessing: (v: boolean) => void;
  setOcrSuggestionsByField: (
    v: OcrSuggestionMap | ((prev: OcrSuggestionMap) => OcrSuggestionMap),
  ) => void;
  setRepeaterSuggestionsByGroup: (
    v: RepeaterSuggestionMap | ((prev: RepeaterSuggestionMap) => RepeaterSuggestionMap),
  ) => void;
  setOcrLogs: (v: OcrLogEntry[] | ((prev: OcrLogEntry[]) => OcrLogEntry[])) => void;
  setLastOcrMeta: (meta: OcrProcessResponse["meta"]) => void;
  setAutoProcessJob: (job: AutoProcessJob | null) => void;
  setAutoProcessing: (v: boolean) => void;

  // ── Encapsulated actions ───────────────────────────────────────────────────
  /** Append a log entry, keeping at most 30 entries. */
  pushOcrLog: (type: OcrLogEntry["type"], message: string) => void;
  /** Accept one field suggestion and write the value to the mapping data store. */
  acceptSuggestion: (fieldKey: string) => Promise<void>;
  declineSuggestion: (fieldKey: string) => void;
  acceptAllSuggestions: () => Promise<void>;
  declineAllSuggestions: () => void;
  acceptRepeaterSuggestion: (groupPath: string) => Promise<void>;
  declineRepeaterSuggestion: (groupPath: string) => void;
  acceptAllRepeaterSuggestions: () => Promise<void>;
  declineAllRepeaterSuggestions: () => void;
  /** Clear all OCR state (call when switching customer / template). */
  reset: () => void;
};

export const useOcrStore = create<OcrState>((set, get) => {
  /**
   * Lazy dynamic import of useMappingDataStore — avoids circular module references
   * since both stores live in the same directory and neither imports the other at
   * module-load time.
   */
  const getMappingStore = async () => {
    const mod = await import("./use-mapping-data-store");
    return mod.useMappingDataStore.getState();
  };

  return {
    ocrProcessing: false,
    ocrSuggestionsByField: {},
    repeaterSuggestionsByGroup: {},
    ocrLogs: [],
    lastOcrMeta: undefined,
    autoProcessJob: null,
    autoProcessing: false,

    setOcrProcessing: (v) => set({ ocrProcessing: v }),
    setOcrSuggestionsByField: (v) =>
      set((s) => ({ ocrSuggestionsByField: resolve(v, s.ocrSuggestionsByField) })),
    setRepeaterSuggestionsByGroup: (v) =>
      set((s) => ({ repeaterSuggestionsByGroup: resolve(v, s.repeaterSuggestionsByGroup) })),
    setOcrLogs: (v) => set((s) => ({ ocrLogs: resolve(v, s.ocrLogs) })),
    setLastOcrMeta: (lastOcrMeta) => set({ lastOcrMeta }),
    setAutoProcessJob: (autoProcessJob) => set({ autoProcessJob }),
    setAutoProcessing: (v) => set({ autoProcessing: v }),

    pushOcrLog: (type, message) =>
      set((s) => ({
        ocrLogs: [
          ...s.ocrLogs.slice(-29),
          { id: crypto.randomUUID(), type, message, createdAt: Date.now() },
        ],
      })),

    acceptSuggestion: async (fieldKey) => {
      try {
        const item = get().ocrSuggestionsByField[fieldKey];
        if (!item || item.status !== "pending") return;

        const ms = await getMappingStore();
        ms.setValues((v) => ({ ...v, [fieldKey]: item.proposedValue }));
        ms.setManualValues((mv) => ({ ...mv, [fieldKey]: item.proposedValue }));

        set((s) => ({
          ocrSuggestionsByField: {
            ...s.ocrSuggestionsByField,
            [fieldKey]: { ...item, status: "accepted" },
          },
        }));
        get().pushOcrLog("system", `Đã chấp nhận OCR suggestion cho field: ${fieldKey}`);
      } catch (err) {
        get().pushOcrLog("error", `Lỗi khi chấp nhận gợi ý cho field ${fieldKey}: ${String(err)}`);
      }
    },

    declineSuggestion: (fieldKey) =>
      set((s) => {
        const item = s.ocrSuggestionsByField[fieldKey];
        if (!item || item.status !== "pending") return s;
        get().pushOcrLog("system", `Đã từ chối OCR suggestion cho field: ${fieldKey}`);
        return {
          ocrSuggestionsByField: {
            ...s.ocrSuggestionsByField,
            [fieldKey]: { ...item, status: "declined" },
          },
        };
      }),

    acceptAllSuggestions: async () => {
      try {
        const { ocrSuggestionsByField } = get();
        const next = { ...ocrSuggestionsByField };
        const patch: Record<string, string> = {};
        let count = 0;
        for (const [key, item] of Object.entries(next)) {
          if (item.status === "pending") {
            patch[key] = item.proposedValue;
            next[key] = { ...item, status: "accepted" };
            count++;
          }
        }
        if (count > 0) {
          const ms = await getMappingStore();
          ms.setValues((v) => ({ ...v, ...patch }));
          ms.setManualValues((mv) => ({ ...mv, ...patch }));
          set({ ocrSuggestionsByField: next });
          get().pushOcrLog("system", `[Bulk Accept] ${count} fields`);
        }
      } catch (err) {
        get().pushOcrLog("error", `Lỗi khi chấp nhận gợi ý hàng loạt: ${String(err)}`);
      }
    },

    declineAllSuggestions: () =>
      set((s) => {
        const next = { ...s.ocrSuggestionsByField };
        let count = 0;
        for (const key of Object.keys(next)) {
          if (next[key].status === "pending") {
            next[key] = { ...next[key], status: "declined" };
            count++;
          }
        }
        if (count > 0) get().pushOcrLog("system", `[Bulk Decline] ${count} fields`);
        return { ocrSuggestionsByField: next };
      }),

    acceptRepeaterSuggestion: async (groupPath) => {
      try {
        const item = get().repeaterSuggestionsByGroup[groupPath];
        if (!item || item.status !== "pending") return;

        const ms = await getMappingStore();
        ms.setValues((v) => ({ ...v, [groupPath]: item.rows }));

        set((s) => ({
          repeaterSuggestionsByGroup: {
            ...s.repeaterSuggestionsByGroup,
            [groupPath]: { ...item, status: "accepted" },
          },
        }));
        get().pushOcrLog(
          "system",
          `Đã chấp nhận DOCX repeater cho nhóm: ${groupPath} (${item.rows.length} bản ghi)`,
        );
      } catch (err) {
        get().pushOcrLog(
          "error",
          `Lỗi khi chấp nhận repeater cho nhóm ${groupPath}: ${String(err)}`,
        );
      }
    },

    declineRepeaterSuggestion: (groupPath) =>
      set((s) => {
        const item = s.repeaterSuggestionsByGroup[groupPath];
        if (!item || item.status !== "pending") return s;
        get().pushOcrLog("system", `Đã từ chối DOCX repeater cho nhóm: ${groupPath}`);
        return {
          repeaterSuggestionsByGroup: {
            ...s.repeaterSuggestionsByGroup,
            [groupPath]: { ...item, status: "declined" },
          },
        };
      }),

    acceptAllRepeaterSuggestions: async () => {
      try {
        const { repeaterSuggestionsByGroup } = get();
        const next = { ...repeaterSuggestionsByGroup };
        const patch: Record<string, unknown> = {};
        let count = 0;
        for (const [path, item] of Object.entries(next)) {
          if (item.status === "pending") {
            patch[path] = item.rows;
            next[path] = { ...item, status: "accepted" };
            count++;
          }
        }
        if (count > 0) {
          const ms = await getMappingStore();
          ms.setValues((v) => ({ ...v, ...patch }));
          set({ repeaterSuggestionsByGroup: next });
          get().pushOcrLog("system", `[Bulk Accept Repeater] ${count} nhóm`);
        }
      } catch (err) {
        get().pushOcrLog("error", `Lỗi khi chấp nhận repeater hàng loạt: ${String(err)}`);
      }
    },

    declineAllRepeaterSuggestions: () =>
      set((s) => {
        const next = { ...s.repeaterSuggestionsByGroup };
        let count = 0;
        for (const key of Object.keys(next)) {
          if (next[key].status === "pending") {
            next[key] = { ...next[key], status: "declined" };
            count++;
          }
        }
        if (count > 0) get().pushOcrLog("system", `[Bulk Decline Repeater] ${count} nhóm`);
        return { repeaterSuggestionsByGroup: next };
      }),

    reset: () =>
      set({
        ocrProcessing: false,
        ocrSuggestionsByField: {},
        repeaterSuggestionsByGroup: {},
        ocrLogs: [],
        lastOcrMeta: undefined,
        autoProcessJob: null,
        autoProcessing: false,
      }),
  };
});
