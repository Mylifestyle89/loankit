"use client";

import { create } from "zustand";

/** Maps field_key → template names that use this field */
type FieldUsageState = {
  usageMap: Record<string, string[]>;
  loaded: boolean;
  fetchUsage: () => Promise<void>;
};

/**
 * Store for reverse sync: which templates use which fields.
 * Fetched once on mapping page load, consumed by FieldRow for badges.
 */
export const useFieldUsageStore = create<FieldUsageState>((set, get) => ({
  usageMap: {},
  loaded: false,
  fetchUsage: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/report/template/placeholders?all=true");
      const data = await res.json();
      if (data.ok) set({ usageMap: data.usage_map ?? {}, loaded: true });
    } catch {
      // best-effort — don't block the UI
    }
  },
}));
