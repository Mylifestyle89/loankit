"use client";

// Helper display components for financial data — TreeRow and Stat

type TreeRowProps = {
  level: number;
  label: string;
  sub?: string;
  value: string;
  bold?: boolean;
  color?: string;
};

export function TreeRow({ level, label, sub, value, bold, color }: TreeRowProps) {
  const indent = level * 24;
  const colorCls = color === "red" ? "text-red-600" : "";
  return (
    <div className="flex items-baseline justify-between" style={{ paddingLeft: indent }}>
      <div className="flex items-baseline gap-1.5">
        {level > 0 && <span className="text-zinc-300 dark:text-zinc-600">└</span>}
        <span className={bold ? "font-semibold" : ""}>{label}</span>
        {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
      </div>
      <span className={`tabular-nums font-medium ${colorCls} ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

type StatProps = {
  label: string;
  value: string;
  color?: string;
};

export function Stat({ label, value, color }: StatProps) {
  const colorCls = color === "red" ? "text-red-600" : color === "emerald" ? "text-emerald-600" : "";
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`font-semibold tabular-nums ${colorCls}`}>{value}</p>
    </div>
  );
}
