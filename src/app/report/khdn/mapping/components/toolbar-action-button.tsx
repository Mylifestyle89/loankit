import type { ReactNode } from "react";

type ToolbarActionButtonProps = {
  icon: ReactNode;
  label: string;
  /** Detailed description shown on hover (tooltip). Falls back to label if not provided. */
  tooltip?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

const BASE =
  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40";
const IDLE =
  "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300";
const ACTIVE =
  "border-amber-400 dark:border-amber-400/40 bg-amber-600 dark:bg-amber-600 text-white shadow-sm shadow-amber-500/25 hover:brightness-110";
const DISABLED = "opacity-40 cursor-not-allowed";

export function ToolbarActionButton({
  icon,
  label,
  tooltip,
  onClick,
  active = false,
  disabled = false,
}: ToolbarActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip ?? label}
      className={`${BASE} ${active ? ACTIVE : IDLE} ${disabled ? DISABLED : ""}`}
    >
      {icon}
      <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
