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
 */
export async function saveFileWithPicker(blob: Blob, suggestedName: string): Promise<void> {
  // Try native file picker (Chrome/Edge desktop)
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
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
      return;
    } catch (err) {
      // User cancelled or any picker error — don't fall through to avoid double download
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("[saveFileWithPicker] picker error:", err);
      // Fall through to legacy download only if picker completely failed
    }
  }

  // Fallback: traditional download (Firefox, Safari, mobile)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
