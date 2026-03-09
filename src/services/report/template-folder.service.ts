/**
 * Service to scan report_assets/ folder for DOCX template files.
 * Returns a tree structure for the folder browser UI.
 */
import fs from "node:fs/promises";
import path from "node:path";

export type FileEntry = {
  name: string;
  /** Relative path from report_assets/ (e.g. "Disbursement templates/2268.09.PN BCDX.docx") */
  path: string;
  size: number;
  modified: string;
};

export type FolderNode = {
  name: string;
  /** Relative path from report_assets/ (e.g. "Disbursement templates") */
  path: string;
  files: FileEntry[];
  subfolders: FolderNode[];
};

/** Folders to exclude from scanning (contain backups, generated content, etc.) */
const EXCLUDED_FOLDERS = new Set([
  "backups",
  "config",
  "exports",
  "generated",
  "pdf",
  "uploads",
  ".locks",
  "Tasks",
]);

/** File name patterns to exclude */
function isExcludedFile(name: string): boolean {
  if (!name.endsWith(".docx")) return true;
  if (name.startsWith("report_preview_")) return true;
  if (name.startsWith("~$")) return true;
  if (name.endsWith(".bak")) return true;
  return false;
}

/** Recursively scan a directory for DOCX files */
async function scanFolder(absoluteDir: string, baseDir: string): Promise<FolderNode> {
  const relativePath = path.relative(baseDir, absoluteDir).replace(/\\/g, "/");
  const folderName = relativePath === "" ? "report_assets" : path.basename(absoluteDir);

  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files: FileEntry[] = [];
  const subfolders: FolderNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_FOLDERS.has(entry.name)) continue;
      try {
        const subfolder = await scanFolder(fullPath, baseDir);
        // Only include folders that have files (directly or nested)
        if (subfolder.files.length > 0 || subfolder.subfolders.length > 0) {
          subfolders.push(subfolder);
        }
      } catch {
        // Skip folders we can't read
      }
    } else if (entry.isFile() && !isExcludedFile(entry.name)) {
      try {
        const stat = await fs.stat(fullPath);
        const fileRelPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        files.push({
          name: entry.name,
          path: fileRelPath,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  // Sort alphabetically
  files.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  subfolders.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return { name: folderName, path: relativePath || ".", files, subfolders };
}

/** List all DOCX template files in report_assets/ as a tree */
export async function listTemplateFolderFiles(): Promise<FolderNode[]> {
  const baseDir = path.join(process.cwd(), "report_assets");

  try {
    await fs.access(baseDir);
  } catch {
    return [];
  }

  const root = await scanFolder(baseDir, baseDir);
  // Return root files + subfolders as a flat array at top level
  return [root];
}
