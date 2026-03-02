"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMappingDataStore } from "../stores/use-mapping-data-store";

const INTERVAL_MS = 60_000; // 60 seconds

/**
 * Periodically snapshots the editor state to disk (every 60 s).
 * Skips if nothing changed since the last snapshot.
 */
export function useAutoSaveSnapshot() {
  const lastHash = useRef("");

  const takeSnapshot = useCallback(async (source: "auto" | "manual" = "auto") => {
    const md = useMappingDataStore.getState();

    // Build a quick hash to detect changes
    const hash = JSON.stringify({
      mv: md.manualValues,
      f: md.formulas,
      fc: md.fieldCatalog.length,
    });
    if (source === "auto" && hash === lastHash.current) return; // nothing changed

    try {
      await fetch("/api/report/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          manualValues: md.manualValues,
          formulas: md.formulas,
          mappingText: md.mappingText,
          aliasText: md.aliasText,
          fieldCatalogCount: md.fieldCatalog.length,
        }),
      });
      lastHash.current = hash;
    } catch {
      // Silently fail — auto-save should never interrupt the user
    }
  }, []);

  useEffect(() => {
    // Initial snapshot after 5s (gives time for data to load)
    const initialTimeout = setTimeout(() => void takeSnapshot("auto"), 5_000);
    const interval = setInterval(() => void takeSnapshot("auto"), INTERVAL_MS);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [takeSnapshot]);

  return { takeManualSnapshot: () => takeSnapshot("manual") };
}
