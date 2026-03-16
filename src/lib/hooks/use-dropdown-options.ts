"use client";

import { useCallback, useEffect, useState } from "react";

export type DropdownItem = { id: string; label: string; sort_order: number };

/**
 * Fetch + cache dropdown options for a given field_key.
 * Returns items, loading state, and a mutate function to refresh after CRUD.
 */
export function useDropdownOptions(fieldKey: string) {
  const [items, setItems] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!fieldKey) { setLoading(false); return; } // skip when used inside Provider
    setLoading(true);
    try {
      const res = await fetch(`/api/config/dropdown-options?field_key=${encodeURIComponent(fieldKey)}`);
      const data = await res.json();
      if (data.ok) setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [fieldKey]);

  useEffect(() => { void load(); }, [load]);

  /** Add a new option inline, returns created item */
  const addOption = useCallback(async (label: string) => {
    const maxSort = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
    const res = await fetch("/api/config/dropdown-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_key: fieldKey, label, sort_order: maxSort + 1 }),
    });
    const data = await res.json();
    if (data.ok) {
      setItems((prev) => [...prev, data.item]);
      return data.item as DropdownItem;
    }
    return null;
  }, [fieldKey, items]);

  /** Delete an option by id */
  const deleteOption = useCallback(async (id: string) => {
    const res = await fetch(`/api/config/dropdown-options/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, reload: load, addOption, deleteOption };
}
