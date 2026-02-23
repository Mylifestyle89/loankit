import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

function openFolderOnHost(folderPath: string): void {
  if (process.platform === "win32") {
    const child = spawn("explorer.exe", [folderPath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }
  if (process.platform === "darwin") {
    const child = spawn("open", [folderPath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }
  const child = spawn("xdg-open", [folderPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export async function POST() {
  try {
    const backupDir = path.join(process.cwd(), "report_assets", "backups");
    await fs.mkdir(backupDir, { recursive: true });
    openFolderOnHost(backupDir);
    return NextResponse.json({
      ok: true,
      backup_dir: backupDir,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Không thể mở thư mục backup.",
      },
      { status: 500 },
    );
  }
}

