"use client";

import { AnimatePresence } from "framer-motion";
import { useDownloadToastStore } from "@/lib/download-toast-store";
import { DownloadToastItem } from "./download-toast-item";

/**
 * Fixed bottom-right container that shows Chrome-style download completion toasts.
 * Mount once in root layout.
 */
export function DownloadToastContainer() {
  const items = useDownloadToastStore((s) => s.items);
  const remove = useDownloadToastStore((s) => s.remove);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <DownloadToastItem key={item.id} item={item} onRemove={remove} />
        ))}
      </AnimatePresence>
    </div>
  );
}
