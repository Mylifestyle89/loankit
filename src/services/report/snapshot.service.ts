/**
 * Editor snapshot service — periodic auto-save + manual restore.
 *
 * Snapshots capture the full editor state (manual values, formulas,
 * field catalog summary, mapping text, alias text) so that users can
 * recover from accidental data loss.
 *
 * Storage: report_assets/backups/editor-snapshots/snapshot-{YYYYMMDD-HHMMSS}.json
 * Retention: keeps the most recent MAX_SNAPSHOTS files.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { REPORT_ASSETS_DIR } from "@/lib/report/constants";
import { loadManualValues } from "@/lib/report/manual-values";
import { loadFieldFormulas } from "@/lib/report/field-formulas";

const SNAPSHOT_DIR = path.join(REPORT_ASSETS_DIR, "backups", "editor-snapshots");
const MAX_SNAPSHOTS = 120; // ~2 hours of 60s intervals

export type SnapshotData = {
  manualValues: Record<string, string | number | boolean | null>;
  formulas: Record<string, string>;
  mappingText: string;
  aliasText: string;
  fieldCatalogCount: number;
};

export type SnapshotMeta = {
  filename: string;
  timestamp: string;
  source: "auto" | "manual";
  fieldCatalogCount: number;
  manualValuesCount: number;
  formulasCount: number;
};

type SnapshotFile = {
  timestamp: string;
  source: "auto" | "manual";
  data: SnapshotData;
};

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function ensureDir() {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

async function pruneOld() {
  const entries = await fs.readdir(SNAPSHOT_DIR);
  const snapshots = entries
    .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (snapshots.length <= MAX_SNAPSHOTS) return;
  const toRemove = snapshots.slice(MAX_SNAPSHOTS);
  await Promise.all(toRemove.map((f) => fs.unlink(path.join(SNAPSHOT_DIR, f)).catch(() => {})));
}

export const snapshotService = {
  /** List all snapshots, newest first. */
  async listSnapshots(): Promise<SnapshotMeta[]> {
    await ensureDir();
    const entries = await fs.readdir(SNAPSHOT_DIR);
    const files = entries
      .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
      .sort()
      .reverse();

    const results: SnapshotMeta[] = [];
    for (const filename of files) {
      try {
        const raw = await fs.readFile(path.join(SNAPSHOT_DIR, filename), "utf-8");
        const parsed = JSON.parse(raw) as SnapshotFile;
        results.push({
          filename,
          timestamp: parsed.timestamp,
          source: parsed.source,
          fieldCatalogCount: parsed.data.fieldCatalogCount,
          manualValuesCount: Object.keys(parsed.data.manualValues).length,
          formulasCount: Object.keys(parsed.data.formulas).length,
        });
      } catch {
        // Skip corrupted snapshots
      }
    }
    return results;
  },

  /** Create a new snapshot from provided editor state. */
  async createSnapshot(data: SnapshotData, source: "auto" | "manual" = "auto"): Promise<SnapshotMeta> {
    await ensureDir();
    const now = new Date();
    const timestamp = now.toISOString();
    const filename = `snapshot-${formatTimestamp(now)}.json`;
    const content: SnapshotFile = { timestamp, source, data };
    await fs.writeFile(path.join(SNAPSHOT_DIR, filename), JSON.stringify(content, null, 2), "utf-8");
    await pruneOld();
    return {
      filename,
      timestamp,
      source,
      fieldCatalogCount: data.fieldCatalogCount,
      manualValuesCount: Object.keys(data.manualValues).length,
      formulasCount: Object.keys(data.formulas).length,
    };
  },

  /** Read a snapshot file and return the full data for restore. */
  async getSnapshot(filename: string): Promise<SnapshotData> {
    if (!filename.startsWith("snapshot-") || !filename.endsWith(".json")) {
      throw new Error("Tên file snapshot không hợp lệ.");
    }
    const raw = await fs.readFile(path.join(SNAPSHOT_DIR, filename), "utf-8");
    const parsed = JSON.parse(raw) as SnapshotFile;
    return parsed.data;
  },

  /** Restore manual values + formulas from a snapshot to disk files. */
  async restoreSnapshot(filename: string): Promise<{ manualValuesCount: number; formulasCount: number }> {
    const data = await this.getSnapshot(filename);
    // Write manual values + formulas back to disk
    const { saveManualValues: saveMV } = await import("@/lib/report/manual-values");
    const { saveFieldFormulas: saveFF } = await import("@/lib/report/field-formulas");
    await Promise.all([saveMV(data.manualValues), saveFF(data.formulas)]);
    return {
      manualValuesCount: Object.keys(data.manualValues).length,
      formulasCount: Object.keys(data.formulas).length,
    };
  },

  /** Read current disk state as snapshot data (for comparison). */
  async readCurrentState(): Promise<Pick<SnapshotData, "manualValues" | "formulas">> {
    const [manualValues, formulas] = await Promise.all([loadManualValues(), loadFieldFormulas()]);
    return { manualValues, formulas };
  },
};
