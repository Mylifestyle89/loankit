import { create } from "zustand";

export type DownloadItem = {
  id: string;
  filename: string;
  blob: Blob;
  addedAt: number;
};

type DownloadToastStore = {
  items: DownloadItem[];
  add: (filename: string, blob: Blob) => void;
  remove: (id: string) => void;
};

const MAX_VISIBLE = 5;

export const useDownloadToastStore = create<DownloadToastStore>((set) => ({
  items: [],

  add: (filename, blob) => {
    const now = Date.now();
    set((s) => ({
      items: [
        { id: `${now}-${Math.random().toString(36).slice(2, 6)}`, filename, blob, addedAt: now },
        ...s.items,
      ].slice(0, MAX_VISIBLE),
    }));
  },

  remove: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

/** Trigger browser download from a Blob via temporary anchor element. */
export function triggerAnchorDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function openDownloadedFile(item: DownloadItem) {
  triggerAnchorDownload(item.blob, item.filename);
}
