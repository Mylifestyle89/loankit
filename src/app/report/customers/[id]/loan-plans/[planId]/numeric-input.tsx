"use client";

import { useState, useCallback } from "react";

/** Format number with vi-VN thousand separators, show raw while editing */
export function NumericInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  const handleFocus = useCallback(() => {
    setEditing(true);
    setRaw(value ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    onChange(Number(raw) || 0);
  }, [raw, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits
    const cleaned = e.target.value.replace(/[^\d]/g, "");
    setRaw(cleaned);
  }, []);

  const displayValue = editing ? raw : (value ? value.toLocaleString("vi-VN") : "");

  return (
    <input
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      inputMode="numeric"
    />
  );
}
