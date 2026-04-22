"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
};

export function BaseModal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
}: BaseModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    // Focus the dialog on mount for accessibility
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop - click outside disabled to prevent accidental data loss */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={`relative w-full ${maxWidthClassName} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#141414]/90 dark:shadow-[0_8px_40px_rgb(0,0,0,0.5)]`}
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-3 dark:border-white/[0.07]">
              {title ? (
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              ) : <span />}
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-slate-200/60 px-5 py-3 dark:border-white/[0.07]">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

