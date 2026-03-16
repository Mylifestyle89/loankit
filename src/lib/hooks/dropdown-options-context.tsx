"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DropdownItem } from "./use-dropdown-options";

type DropdownCtx = {
  /** Get options for a specific fieldKey */
  getOptions: (fieldKey: string) => DropdownItem[];
  /** Whether initial load is in progress */
  loading: boolean;
  /** Add option for a fieldKey, returns created item */
  addOption: (fieldKey: string, label: string) => Promise<DropdownItem | null>;
  /** Delete option by id */
  deleteOption: (id: string, fieldKey: string) => Promise<void>;
};

const Ctx = createContext<DropdownCtx | null>(null);

/** Use batch-loaded dropdown context. Returns null when no Provider above. */
export function useDropdownContext() {
  return useContext(Ctx);
}

/**
 * Wraps a section and batch-fetches all dropdown options matching `prefix`.
 * Children SmartFields consume via useDropdownContext().
 */
export function DropdownOptionsProvider({
  prefix,
  children,
}: {
  prefix: string;
  children: ReactNode;
}) {
  const [groups, setGroups] = useState<Record<string, DropdownItem[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/config/dropdown-options?prefix=${encodeURIComponent(prefix)}`);
      const data = await res.json();
      if (data.ok) setGroups(data.groups ?? {});
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => { void load(); }, [load]);

  const getOptions = useCallback(
    (fieldKey: string) => groups[fieldKey] ?? [],
    [groups],
  );

  const addOption = useCallback(async (fieldKey: string, label: string) => {
    const existing = groups[fieldKey] ?? [];
    const maxSort = existing.length > 0 ? Math.max(...existing.map((i) => i.sort_order)) : 0;
    const res = await fetch("/api/config/dropdown-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_key: fieldKey, label, sort_order: maxSort + 1 }),
    });
    const data = await res.json();
    if (data.ok) {
      setGroups((prev) => ({
        ...prev,
        [fieldKey]: [...(prev[fieldKey] ?? []), data.item],
      }));
      return data.item as DropdownItem;
    }
    return null;
  }, [groups]);

  const deleteOption = useCallback(async (id: string, fieldKey: string) => {
    const res = await fetch(`/api/config/dropdown-options/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      setGroups((prev) => ({
        ...prev,
        [fieldKey]: (prev[fieldKey] ?? []).filter((i) => i.id !== id),
      }));
    }
  }, []);

  return (
    <Ctx.Provider value={{ getOptions, loading, addOption, deleteOption }}>
      {children}
    </Ctx.Provider>
  );
}
