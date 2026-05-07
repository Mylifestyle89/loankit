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
  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";
const IDLE =
  "border-primary-200 dark:border-primary-500/20 bg-primary-100 dark:bg-primary-500/10 text-primary-500 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20 hover:text-primary-600 dark:hover:text-primary-300";
const ACTIVE =
  "border-primary-400 dark:border-primary-400/40 bg-primary-500 dark:bg-primary-500 text-white shadow-sm shadow-primary-500/25 hover:brightness-110";
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
