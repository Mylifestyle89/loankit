/**
 * Save a Blob using File System Access API (showSaveFilePicker).
 * Falls back to traditional download if unsupported (Firefox, Safari).
 */
export async function saveFileWithPicker(blob: Blob, suggestedName: string): Promise<void> {
  // Use showSaveFilePicker if available (Chrome/Edge)
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> })
        .showSaveFilePicker({
          suggestedName,
          types: [{
            description: "Word Document",
            accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
          }],
        });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled picker — do nothing
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Other error — fall through to legacy download
    }
  }

  // Fallback: traditional download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
}
