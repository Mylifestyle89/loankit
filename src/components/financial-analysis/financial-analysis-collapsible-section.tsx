"use client";

// ─── CollapsibleSection sub-component ────────────────────────────────────────
// Supports both uncontrolled (defaultOpen) and controlled (expanded + onToggle) modes.

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type UncontrolledProps = {
  title: string;
  children: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  expanded?: undefined;
  onToggle?: undefined;
};

type ControlledProps = {
  title: string;
  children: React.ReactNode;
  badge?: string;
  defaultOpen?: undefined;
  expanded: boolean;
  onToggle: () => void;
};

type Props = UncontrolledProps | ControlledProps;

export function CollapsibleSection({
  title,
  children,
  badge,
  defaultOpen = false,
  expanded,
  onToggle,
}: Props) {
  const [openInternal, setOpenInternal] = useState(defaultOpen);

  // Controlled if expanded prop is provided, otherwise uncontrolled
  const isOpen = expanded !== undefined ? expanded : openInternal;
  const handleToggle = onToggle ?? (() => setOpenInternal((v) => !v));

  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/[0.07] overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className="flex w-full items-center justify-between bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              {badge}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>
      {isOpen && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}
