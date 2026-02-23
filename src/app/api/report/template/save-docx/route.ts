import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isSafeDocxPath(relPath: string): boolean {
  if (!relPath.startsWith("report_assets/")) return false;
  if (relPath.includes("..")) return false;
  return relPath.toLowerCase().endsWith(".docx");
}

function tsForFilename(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pruneOldBackups(dirPath: string, keepLatest = 50): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".docx"))
      .map((e) => e.name)
      .sort(); // timestamp in filename => lexicographic sort works

    if (files.length <= keepLatest) return;
    const toDelete = files.slice(0, files.length - keepLatest);
    await Promise.all(toDelete.map((file) => fs.unlink(path.join(dirPath, file))));
  } catch {
    // Best-effort cleanup, ignore prune failures.
  }
}

async function writeBackup(relPath: string, buffer: Buffer): Promise<string> {
  const absolute = path.join(process.cwd(), relPath);
  const parsed = path.parse(absolute);
  const safeBase = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const backupDir = path.join(process.cwd(), "report_assets", "backups", safeBase);
  await ensureDir(backupDir);
  const filename = `${tsForFilename()}.docx`;
  const backupAbs = path.join(backupDir, filename);
  await fs.writeFile(backupAbs, buffer);
  await pruneOldBackups(backupDir, 50);
  return path.relative(process.cwd(), backupAbs).replaceAll("\\", "/");
}

export async function PUT(req: NextRequest) {
  try {
    const relPath = req.nextUrl.searchParams.get("path") ?? "";
    const mode = (req.nextUrl.searchParams.get("mode") ?? "").toLowerCase();
    if (!isSafeDocxPath(relPath)) {
      return NextResponse.json({ ok: false, error: "Invalid docx path." }, { status: 400 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.byteLength < 100) {
      return NextResponse.json({ ok: false, error: "Invalid DOCX payload." }, { status: 400 });
    }

    if (mode === "backup") {
      const backupPath = await writeBackup(relPath, buffer);
      return NextResponse.json({ ok: true, path: relPath, backup_path: backupPath, mode: "backup" });
    }

    const absolute = path.join(process.cwd(), relPath);
    // Safety net: before overwrite main template, keep a snapshot.
    const backupPath = await writeBackup(relPath, buffer);
    await fs.writeFile(absolute, buffer);

    return NextResponse.json({ ok: true, path: relPath, backup_path: backupPath, mode: "save" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save DOCX." },
      { status: 500 },
    );
  }
}

