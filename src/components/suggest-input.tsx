"use client";

import { useState } from "react";

type SuggestInputProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[]; // Full list, filtered client-side
  placeholder?: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};

/** Generic text input with a suggestion dropdown. Drop-in replacement for <input type="text">. */
export function SuggestInput({ value, onChange, suggestions, placeholder, className, inputMode }: SuggestInputProps) {
  const [open, setOpen] = useState(false);

  // Case-insensitive filter
  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        // Delay close so mousedown on option fires first
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a1a] shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              // Use onMouseDown (not onClick) to fire before blur closes the dropdown
              onMouseDown={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
