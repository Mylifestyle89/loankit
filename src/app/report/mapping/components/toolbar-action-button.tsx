import type { ReactNode } from "react";

type ToolbarActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

const BASE =
  "rounded-lg p-2.5 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40";
const IDLE =
  "border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 hover:text-violet-700 dark:hover:text-violet-300";
const ACTIVE =
  "border-violet-400 dark:border-violet-400/40 bg-violet-600 dark:bg-violet-600 text-white shadow-sm shadow-violet-500/25 hover:brightness-110";
const DISABLED = "opacity-40 cursor-not-allowed";

export function ToolbarActionButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: ToolbarActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`${BASE} ${active ? ACTIVE : IDLE} ${disabled ? DISABLED : ""}`}
    >
      {icon}
    </button>
  );
}
