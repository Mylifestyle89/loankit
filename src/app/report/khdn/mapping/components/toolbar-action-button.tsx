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
  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
const IDLE =
  "border-brand-200 dark:border-brand-500/20 bg-brand-100 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 hover:text-brand-600 dark:hover:text-brand-300";
const ACTIVE =
  "border-brand-400 dark:border-brand-400/40 bg-brand-500 dark:bg-brand-500 text-white shadow-sm shadow-brand-500/25 hover:brightness-110";
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
