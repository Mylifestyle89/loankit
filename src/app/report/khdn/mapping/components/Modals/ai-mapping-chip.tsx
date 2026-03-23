"use client";

// MappingChip sub-component for AiMappingModal — displays a single placeholder→header mapping row

import { motion } from "framer-motion";
import { Check, HelpCircle, KeyRound } from "lucide-react";
import { chipStyles, type ChipVariant } from "./ai-mapping-modal-types";

type MappingChipProps = {
  placeholder: string;
  placeholderLabel?: string;
  mappedHeader: string;
  variant: ChipVariant;
  index: number;
  staggerDelay?: number;
  onHover?: (key: string | null) => void;
};

export function MappingChip({
  placeholder,
  placeholderLabel,
  mappedHeader,
  variant,
  index,
  staggerDelay = 0,
  onHover,
}: MappingChipProps) {
  const isMapped = Boolean(mappedHeader?.trim());
  const style = chipStyles[variant];

  return (
    <motion.div
      data-placeholder={placeholder}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: index * staggerDelay,
      }}
      className={`relative flex items-center justify-between gap-2 rounded-xl border ${style.border} ${style.bg} px-3 py-2 pr-9 shadow-sm transition-shadow hover:shadow-md`}
      onMouseEnter={() => onHover?.(placeholder)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {variant === "root" && (
          <KeyRound className={`h-4 w-4 flex-shrink-0 ${style.icon}`} aria-hidden />
        )}
        <span className={`truncate text-sm font-medium ${style.text}`} title={placeholderLabel || placeholder}>
          {placeholderLabel || placeholder}
        </span>
      </div>
      <span className={`min-w-0 truncate text-right text-xs ${style.text} opacity-80`} title={mappedHeader || "—"}>
        {mappedHeader || "—"}
      </span>
      <span
        className={`absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 flex-shrink-0 items-center justify-center rounded-full ${
          isMapped
            ? "bg-emerald-500/20 text-emerald-600"
            : "bg-slate-200/60 text-slate-400 dark:bg-white/[0.08] dark:text-slate-500"
        }`}
        aria-label={isMapped ? "Đã map" : "Chưa map"}
      >
        {isMapped ? <Check className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
      </span>
    </motion.div>
  );
}
