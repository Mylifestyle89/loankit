import { useDownloadToastStore, triggerAnchorDownload } from "@/lib/download-toast-store";

// File System Access API types (Chrome/Edge only, not in lib.dom yet)
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

/**
 * Save a Blob as a file download.
 * Uses File System Access API (showSaveFilePicker) when available — lets user
 * choose save location. Falls back to traditional <a download> for browsers
 * that don't support it (Firefox, Safari, mobile).
 *
 * Dev gate: in Next.js 16 + Turbopack local dev, the File System Access API
 * path writes 0-byte files for binary responses (blob bytes get dropped
 * between the picker confirmation and `writable.write`). Force the anchor
 * download path in development so devs can actually test downloads.
 * Production (Vercel) is unaffected and keeps the picker UX.
 *
 * Shows a Chrome-style toast notification on successful download.
 */
export async function saveFileWithPicker(blob: Blob, suggestedName: string): Promise<void> {
  const isDev = process.env.NODE_ENV === "development";

  // Try native file picker (Chrome/Edge desktop) — skip in dev
  if (!isDev && typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const ext = suggestedName.split(".").pop()?.toLowerCase() ?? "docx";
      const mimeMap: Record<string, string> = {
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pdf: "application/pdf",
      };
      const handle = await window.showSaveFilePicker!({
        suggestedName,
        types: [{
          description: `${ext.toUpperCase()} file`,
          accept: { [mimeMap[ext] ?? "application/octet-stream"]: [`.${ext}`] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      useDownloadToastStore.getState().add(suggestedName, blob);
      return;
    } catch (err) {
      // User cancelled picker — no toast, no fallback
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.warn("[saveFileWithPicker] picker error:", err);
      }
      return;
    }
  }

  triggerAnchorDownload(blob, suggestedName);
  useDownloadToastStore.getState().add(suggestedName, blob);
}
