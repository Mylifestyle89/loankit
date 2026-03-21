/**
 * Save a Blob as a file download.
 * Uses traditional download approach for maximum compatibility.
 */
export async function saveFileWithPicker(blob: Blob, suggestedName: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  // Cleanup after a short delay to ensure download starts
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
