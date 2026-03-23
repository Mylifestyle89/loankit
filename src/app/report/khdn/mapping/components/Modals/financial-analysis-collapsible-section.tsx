import { ChevronDown, ChevronRight } from "lucide-react";

// CollapsibleSection: accordion-style section used in step 2 to show/hide financial tables
export function CollapsibleSection({
  title,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200/60 dark:border-white/[0.07] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        )}
        {title}
        {badge && (
          <span className="ml-auto rounded-full bg-violet-100 dark:bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
            {badge}
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-slate-200/60 dark:border-white/[0.07] max-h-52 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}
